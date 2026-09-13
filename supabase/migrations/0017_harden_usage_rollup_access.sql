-- Reassert service-role-only mutation access after the pricing/rollup migration.
-- Usage records and task rollups feed billing/analytics and must not be writable
-- or triggerable directly by authenticated clients.

revoke all on function public.record_task_step_usage(
  uuid, uuid, uuid, text, text, integer, integer, integer, integer, integer
) from public, anon, authenticated;
grant execute on function public.record_task_step_usage(
  uuid, uuid, uuid, text, text, integer, integer, integer, integer, integer
) to service_role;

revoke all on function public.refresh_task_usage_totals(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.refresh_task_usage_totals(uuid, uuid)
  to service_role;
