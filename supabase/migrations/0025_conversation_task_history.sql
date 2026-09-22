create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  agent_id uuid references public.agents(id) on delete set null,
  title text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversation_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  role text not null check (role in ('user','assistant','system','tool')),
  content jsonb not null check (content <> 'null'::jsonb),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.task_history_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  step_id uuid references public.task_steps(id) on delete cascade,
  event_type text not null,
  status text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists conversations_org_updated_idx on public.conversations (organization_id, updated_at desc);
create index if not exists conversation_messages_timeline_idx on public.conversation_messages (conversation_id, created_at, id);
create index if not exists conversation_messages_task_idx on public.conversation_messages (task_id, created_at) where task_id is not null;
create index if not exists task_history_events_timeline_idx on public.task_history_events (task_id, created_at, id);

alter table public.conversations enable row level security;
alter table public.conversation_messages enable row level security;
alter table public.task_history_events enable row level security;

create policy "members can read conversations" on public.conversations for select to authenticated using (public.is_org_member(organization_id));
create policy "members can read conversation messages" on public.conversation_messages for select to authenticated using (public.is_org_member(organization_id));
create policy "members can read task history" on public.task_history_events for select to authenticated using (public.is_org_member(organization_id));

grant select on public.conversations, public.conversation_messages, public.task_history_events to authenticated;
revoke insert, update, delete on public.conversations, public.conversation_messages, public.task_history_events from authenticated, anon;

create or replace function public.create_conversation(p_organization_id uuid, p_agent_id uuid default null, p_title text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if auth.role() <> 'service_role' and not public.is_org_member(p_organization_id) then raise exception 'not authorized'; end if;
  if p_agent_id is not null and not exists (select 1 from public.agents where id = p_agent_id and organization_id = p_organization_id) then raise exception 'invalid agent'; end if;
  insert into public.conversations (organization_id, agent_id, title, created_by)
  values (p_organization_id, p_agent_id, nullif(trim(p_title), ''), case when auth.role() = 'service_role' then null else auth.uid() end)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.append_conversation_message(p_conversation_id uuid, p_organization_id uuid, p_role text, p_content jsonb, p_task_id uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if p_role not in ('user','assistant','system','tool') then raise exception 'invalid role'; end if;
  if p_content is null or p_content = 'null'::jsonb then raise exception 'content required'; end if;
  if auth.role() <> 'service_role' and not public.is_org_member(p_organization_id) then raise exception 'not authorized'; end if;
  if not exists (select 1 from public.conversations where id = p_conversation_id and organization_id = p_organization_id) then raise exception 'conversation not found'; end if;
  if p_task_id is not null and not exists (select 1 from public.tasks where id = p_task_id and organization_id = p_organization_id) then raise exception 'invalid task'; end if;
  insert into public.conversation_messages (conversation_id, organization_id, task_id, role, content, created_by)
  values (p_conversation_id, p_organization_id, p_task_id, p_role, p_content, case when auth.role() = 'service_role' then null else auth.uid() end)
  returning id into v_id;
  update public.conversations set updated_at = now() where id = p_conversation_id;
  return v_id;
end;
$$;

revoke all on function public.create_conversation(uuid, uuid, text) from public;
revoke all on function public.append_conversation_message(uuid, uuid, text, jsonb, uuid) from public;
grant execute on function public.create_conversation(uuid, uuid, text) to authenticated, service_role;
grant execute on function public.append_conversation_message(uuid, uuid, text, jsonb, uuid) to authenticated, service_role;

create or replace function public.record_task_history_from_task() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.task_history_events (organization_id, task_id, event_type, status, payload)
    values (new.organization_id, new.id, 'task.created', new.status::text, jsonb_build_object('goal', new.goal));
  elsif old.status is distinct from new.status then
    insert into public.task_history_events (organization_id, task_id, event_type, status, payload)
    values (new.organization_id, new.id, 'task.status_changed', new.status::text, jsonb_build_object('previous_status', old.status::text));
  end if;
  return new;
end;
$$;

create or replace function public.record_task_history_from_step() returns trigger language plpgsql security definer set search_path = public as $$
declare v_org uuid;
begin
  select organization_id into v_org from public.tasks where id = new.task_id;
  if tg_op = 'INSERT' then
    insert into public.task_history_events (organization_id, task_id, step_id, event_type, status, payload)
    values (v_org, new.task_id, new.id, 'step.created', new.status::text, jsonb_build_object('step_index', new.step_index, 'name', new.name, 'tool_name', new.tool_name));
  elsif old.status is distinct from new.status then
    insert into public.task_history_events (organization_id, task_id, step_id, event_type, status, payload)
    values (v_org, new.task_id, new.id, 'step.status_changed', new.status::text, jsonb_build_object('previous_status', old.status::text, 'step_index', new.step_index, 'name', new.name));
  end if;
  return new;
end;
$$;

drop trigger if exists tasks_record_history on public.tasks;
create trigger tasks_record_history after insert or update of status on public.tasks for each row execute function public.record_task_history_from_task();
drop trigger if exists task_steps_record_history on public.task_steps;
create trigger task_steps_record_history after insert or update of status on public.task_steps for each row execute function public.record_task_history_from_step();
