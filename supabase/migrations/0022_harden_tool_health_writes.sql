-- Tool health is authoritative operational state. Browser-facing organization
-- members may read tenant/global health through RLS, but only trusted service
-- workers may mutate probe results.

revoke execute on function public.record_tool_health_check(uuid, uuid, text, integer, text, text)
  from public, anon, authenticated;
grant execute on function public.record_tool_health_check(uuid, uuid, text, integer, text, text)
  to service_role;

create or replace function public.record_tool_health_check(
  p_tool_id uuid,
  p_organization_id uuid,
  p_status text,
  p_latency_ms integer default null,
  p_error_code text default null,
  p_error_message text default null
) returns public.tool_health_checks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tool public.tools;
  v_row public.tool_health_checks;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'forbidden';
  end if;
  if p_status not in ('healthy','degraded','unhealthy') then
    raise exception 'invalid_tool_health_status';
  end if;
  if p_latency_ms is not null and p_latency_ms < 0 then
    raise exception 'invalid_tool_health_latency';
  end if;

  select * into v_tool from public.tools where id = p_tool_id;
  if v_tool.id is null then raise exception 'tool_not_found'; end if;
  if v_tool.organization_id is distinct from p_organization_id then
    raise exception 'tool_organization_mismatch';
  end if;

  insert into public.tool_health_checks (
    tool_id, organization_id, status, checked_at, latency_ms,
    consecutive_failures, error_code, error_message, updated_at
  ) values (
    p_tool_id, p_organization_id, p_status, now(), p_latency_ms,
    case when p_status = 'healthy' then 0 else 1 end,
    left(p_error_code, 100), left(p_error_message, 1000), now()
  )
  on conflict (tool_id) do update set
    organization_id = excluded.organization_id,
    status = excluded.status,
    checked_at = excluded.checked_at,
    latency_ms = excluded.latency_ms,
    consecutive_failures = case
      when excluded.status = 'healthy' then 0
      else public.tool_health_checks.consecutive_failures + 1
    end,
    error_code = excluded.error_code,
    error_message = excluded.error_message,
    updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

revoke execute on function public.record_tool_health_check(uuid, uuid, text, integer, text, text)
  from public, anon, authenticated;
grant execute on function public.record_tool_health_check(uuid, uuid, text, integer, text, text)
  to service_role;
