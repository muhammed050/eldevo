-- Tool execution logs are authoritative runtime telemetry. Browser-facing roles
-- may read tenant-scoped logs through RLS, but only trusted server runtime code
-- may create or finish lifecycle records.

revoke all on function public.start_tool_execution_log(uuid, uuid, uuid, uuid, text, text)
  from public, anon, authenticated;
revoke all on function public.finish_tool_execution_log(uuid, uuid, text, integer, text, text)
  from public, anon, authenticated;

grant execute on function public.start_tool_execution_log(uuid, uuid, uuid, uuid, text, text)
  to service_role;
grant execute on function public.finish_tool_execution_log(uuid, uuid, text, integer, text, text)
  to service_role;

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
  if coalesce(auth.role(), '') <> 'service_role' then
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
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'forbidden';
  end if;

  if p_status not in ('completed', 'failed') then
    raise exception 'invalid_status';
  end if;

  if p_duration_ms is null or p_duration_ms < 0 then
    raise exception 'invalid_duration';
  end if;

  update public.tool_execution_logs
  set status = p_status,
      duration_ms = p_duration_ms,
      error_code = case when p_status = 'failed' then p_error_code else null end,
      error_message = case when p_status = 'failed' then left(p_error_message, 2000) else null end,
      completed_at = now()
  where id = p_log_id
    and organization_id = p_organization_id
    and status = 'running';

  return found;
end;
$$;

revoke all on function public.start_tool_execution_log(uuid, uuid, uuid, uuid, text, text)
  from public, anon, authenticated;
revoke all on function public.finish_tool_execution_log(uuid, uuid, text, integer, text, text)
  from public, anon, authenticated;
grant execute on function public.start_tool_execution_log(uuid, uuid, uuid, uuid, text, text)
  to service_role;
grant execute on function public.finish_tool_execution_log(uuid, uuid, text, integer, text, text)
  to service_role;
