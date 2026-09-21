-- Durable, tenant-isolated working memory for the currently executing task.
-- Kept in sync from task/task_step persistence so queue workers and resumed tasks
-- observe the same current context without relying on process memory.

create table if not exists public.task_working_memory (
  task_id uuid primary key references public.tasks(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  agent_id uuid references public.agents(id) on delete set null,
  goal text not null,
  task_status text not null,
  current_step_index integer,
  current_step_name text,
  current_step_status text,
  step_outputs jsonb not null default '{}'::jsonb,
  scratchpad jsonb not null default '{}'::jsonb,
  version bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint task_working_memory_outputs_object check (jsonb_typeof(step_outputs) = 'object'),
  constraint task_working_memory_scratchpad_object check (jsonb_typeof(scratchpad) = 'object')
);

create index if not exists task_working_memory_org_updated_idx
  on public.task_working_memory (organization_id, updated_at desc);

alter table public.task_working_memory enable row level security;

create policy "members can read task working memory"
on public.task_working_memory for select
to authenticated
using (
  exists (
    select 1 from public.organization_members om
    where om.organization_id = task_working_memory.organization_id
      and om.user_id = auth.uid()
  )
);

-- Runtime writes happen through persistence triggers/RPCs, not direct client writes.
revoke insert, update, delete on public.task_working_memory from authenticated, anon;
grant select on public.task_working_memory to authenticated;

create or replace function public.sync_task_working_memory_from_task()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.task_working_memory (
    task_id, organization_id, agent_id, goal, task_status, updated_at
  ) values (
    new.id, new.organization_id, new.agent_id, new.goal, new.status, now()
  )
  on conflict (task_id) do update set
    agent_id = excluded.agent_id,
    goal = excluded.goal,
    task_status = excluded.task_status,
    version = public.task_working_memory.version + 1,
    updated_at = now();
  return new;
end;
$$;

create or replace function public.sync_task_working_memory_from_step()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task public.tasks%rowtype;
  v_outputs jsonb;
begin
  select * into v_task from public.tasks where id = new.task_id;
  if not found then return new; end if;

  v_outputs := case
    when new.status = 'completed' and new.output is not null
      then jsonb_build_object(new.step_index::text, new.output)
    else '{}'::jsonb
  end;

  insert into public.task_working_memory (
    task_id, organization_id, agent_id, goal, task_status,
    current_step_index, current_step_name, current_step_status, step_outputs, updated_at
  ) values (
    v_task.id, v_task.organization_id, v_task.agent_id, v_task.goal, v_task.status,
    new.step_index, new.name, new.status, v_outputs, now()
  )
  on conflict (task_id) do update set
    task_status = v_task.status,
    current_step_index = new.step_index,
    current_step_name = new.name,
    current_step_status = new.status,
    step_outputs = public.task_working_memory.step_outputs || v_outputs,
    version = public.task_working_memory.version + 1,
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists tasks_sync_working_memory on public.tasks;
create trigger tasks_sync_working_memory
after insert or update of goal, status, agent_id on public.tasks
for each row execute function public.sync_task_working_memory_from_task();

drop trigger if exists task_steps_sync_working_memory on public.task_steps;
create trigger task_steps_sync_working_memory
after insert or update of status, output, name on public.task_steps
for each row execute function public.sync_task_working_memory_from_step();

-- Controlled scratchpad mutation for runtime/agent state. Organization membership and
-- task ownership are checked here so callers cannot write across tenant boundaries.
create or replace function public.patch_task_working_memory(
  p_task_id uuid,
  p_organization_id uuid,
  p_patch jsonb
) returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_version bigint;
begin
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then
    raise exception 'working memory patch must be a JSON object';
  end if;

  if auth.role() <> 'service_role' and not exists (
    select 1 from public.organization_members om
    where om.organization_id = p_organization_id and om.user_id = auth.uid()
  ) then
    raise exception 'not authorized';
  end if;

  update public.task_working_memory wm
  set scratchpad = wm.scratchpad || p_patch,
      version = wm.version + 1,
      updated_at = now()
  where wm.task_id = p_task_id
    and wm.organization_id = p_organization_id
  returning version into v_version;

  if v_version is null then raise exception 'working memory not found'; end if;
  return v_version;
end;
$$;

revoke all on function public.patch_task_working_memory(uuid, uuid, jsonb) from public;
grant execute on function public.patch_task_working_memory(uuid, uuid, jsonb) to authenticated, service_role;

-- Backfill active/existing tasks so deployment does not only cover newly created work.
insert into public.task_working_memory (task_id, organization_id, agent_id, goal, task_status)
select id, organization_id, agent_id, goal, status from public.tasks
on conflict (task_id) do nothing;
