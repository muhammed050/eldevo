-- The attempt-aware start_tool_execution_log overload introduced after the original
-- telemetry hardening must remain server-authoritative. Remove the obsolete six-arg
-- overload and restrict the live seven-arg RPC to service_role only.

drop function if exists public.start_tool_execution_log(uuid, uuid, uuid, uuid, text, text);

revoke all on function public.start_tool_execution_log(uuid, uuid, uuid, uuid, text, text, integer)
  from public, anon, authenticated;
grant execute on function public.start_tool_execution_log(uuid, uuid, uuid, uuid, text, text, integer)
  to service_role;

create or replace function public.start_tool_execution_log(
  p_organization_id uuid,
  p_task_id uuid,
  p_agent_id uuid,
  p_tool_id uuid,
  p_tool_name text,
  p_tool_version text,
  p_attempt integer default 1
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

  if p_attempt is null or p_attempt < 1 then
    raise exception 'invalid_attempt';
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
    organization_id, task_id, agent_id, tool_id, tool_name, tool_version, status, attempt
  ) values (
    p_organization_id, p_task_id, p_agent_id, p_tool_id, p_tool_name, p_tool_version, 'running', p_attempt
  ) returning id into v_log_id;

  return v_log_id;
end;
$$;

revoke all on function public.start_tool_execution_log(uuid, uuid, uuid, uuid, text, text, integer)
  from public, anon, authenticated;
grant execute on function public.start_tool_execution_log(uuid, uuid, uuid, uuid, text, text, integer)
  to service_role;
