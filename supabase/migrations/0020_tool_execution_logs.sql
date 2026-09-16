-- Durable, tenant-scoped execution ledger for every registered tool invocation.
-- Payloads are intentionally not stored here: logs capture operational metadata only,
-- avoiding accidental persistence of secrets or sensitive tool input/output.

create table if not exists public.tool_execution_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete cascade,
  tool_id uuid not null references public.tools(id) on delete restrict,
  tool_name text not null,
  tool_version text not null,
  status text not null check (status in ('running', 'completed', 'failed')),
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  error_code text,
  error_message text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint tool_execution_logs_terminal_fields check (
    (status = 'running' and completed_at is null)
    or (status in ('completed', 'failed') and completed_at is not null)
  )
);

create index if not exists tool_execution_logs_org_started_idx
  on public.tool_execution_logs(organization_id, started_at desc);
create index if not exists tool_execution_logs_task_started_idx
  on public.tool_execution_logs(task_id, started_at desc);
create index if not exists tool_execution_logs_tool_started_idx
  on public.tool_execution_logs(tool_id, started_at desc);
create index if not exists tool_execution_logs_failures_idx
  on public.tool_execution_logs(organization_id, started_at desc)
  where status = 'failed';

alter table public.tool_execution_logs enable row level security;

create policy "tool execution logs are readable by organization members"
  on public.tool_execution_logs
  for select
  to authenticated
  using (public.is_org_member(organization_id));

-- Runtime writes go through these RPCs so callers cannot forge cross-tenant task,
-- agent, or tool relationships. Service workers are supported explicitly.
create or replace function public.start_tool_execution_log(
  p_organization_id uuid,
  p_task_id uuid,
  p_agent_id uuid,
  p_tool_id uuid,
  p_tool_name text,
  p_tool_version text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_log_id uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role'
     and not public.is_org_member(p_organization_id) then
    raise exception 'forbidden';
  end if;

  if not exists (
    select 1 from public.tasks t
    where t.id = p_task_id
      and t.organization_id = p_organization_id
      and t.agent_id = p_agent_id
  ) then
    raise exception 'invalid_task_context';
  end if;

  if not exists (
    select 1 from public.tools t
    where t.id = p_tool_id
      and t.name = p_tool_name
      and t.version = p_tool_version
      and t.enabled = true
      and (t.organization_id = p_organization_id or t.organization_id is null)
  ) then
    raise exception 'invalid_tool_context';
  end if;

  insert into public.tool_execution_logs (
    organization_id, task_id, agent_id, tool_id, tool_name, tool_version, status
  ) values (
    p_organization_id, p_task_id, p_agent_id, p_tool_id, p_tool_name, p_tool_version, 'running'
  ) returning id into v_log_id;

  return v_log_id;
end;
$$;

create or replace function public.finish_tool_execution_log(
  p_log_id uuid,
  p_organization_id uuid,
  p_status text,
  p_duration_ms integer,
  p_error_code text default null,
  p_error_message text default null
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_status not in ('completed', 'failed') then
    raise exception 'invalid_status';
  end if;

  if coalesce(auth.role(), '') <> 'service_role'
     and not public.is_org_member(p_organization_id) then
    raise exception 'forbidden';
  end if;

  update public.tool_execution_logs
  set status = p_status,
      duration_ms = greatest(coalesce(p_duration_ms, 0), 0),
      error_code = case when p_status = 'failed' then p_error_code else null end,
      error_message = case when p_status = 'failed' then left(p_error_message, 2000) else null end,
      completed_at = now()
  where id = p_log_id
    and organization_id = p_organization_id
    and status = 'running';

  return found;
end;
$$;

revoke all on function public.start_tool_execution_log(uuid, uuid, uuid, uuid, text, text) from public;
revoke all on function public.finish_tool_execution_log(uuid, uuid, text, integer, text, text) from public;
grant execute on function public.start_tool_execution_log(uuid, uuid, uuid, uuid, text, text) to authenticated, service_role;
grant execute on function public.finish_tool_execution_log(uuid, uuid, text, integer, text, text) to authenticated, service_role;

grant select on public.tool_execution_logs to authenticated;
grant select, insert, update on public.tool_execution_logs to service_role;