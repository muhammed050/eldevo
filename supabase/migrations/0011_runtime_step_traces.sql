create table if not exists public.task_step_traces (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  task_step_id uuid not null references public.task_steps(id) on delete cascade,
  step_index integer not null,
  event_type text not null check (event_type in ('started','completed','failed','cancelled','waiting_approval','retry')),
  attempt integer not null default 1 check (attempt > 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists task_step_traces_task_idx on public.task_step_traces(task_id, created_at);
create index if not exists task_step_traces_org_idx on public.task_step_traces(organization_id, created_at);

alter table public.task_step_traces enable row level security;

create policy "org members can read task step traces"
  on public.task_step_traces for select
  using (exists (select 1 from public.memberships m where m.organization_id = task_step_traces.organization_id and m.user_id = auth.uid()));

create or replace function public.record_task_step_trace(
  p_task_id uuid,
  p_step_index integer,
  p_event_type text,
  p_attempt integer default 1,
  p_metadata jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security invoker
as $$
declare
  v_org uuid;
  v_step uuid;
  v_trace uuid;
begin
  select t.organization_id, s.id into v_org, v_step
  from public.tasks t
  join public.task_steps s on s.task_id = t.id and s.step_index = p_step_index
  where t.id = p_task_id;

  if v_org is null or v_step is null then
    raise exception 'Task or task step not found';
  end if;

  insert into public.task_step_traces(organization_id, task_id, task_step_id, step_index, event_type, attempt, metadata)
  values (v_org, p_task_id, v_step, p_step_index, p_event_type, greatest(p_attempt, 1), coalesce(p_metadata, '{}'::jsonb))
  returning id into v_trace;

  return v_trace;
end;
$$;

grant execute on function public.record_task_step_trace(uuid, integer, text, integer, jsonb) to authenticated;
