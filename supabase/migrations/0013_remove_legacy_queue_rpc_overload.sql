-- 0010 created a legacy three-argument overload before the hardened four-argument
-- worker-owned function was introduced. Remove its public executability so callers
-- cannot bypass the locked_by ownership check.
revoke all on function public.finish_task_queue_item(uuid, boolean, text) from public;

-- Drop the legacy overload only when it exists. The hardened overload remains intact.
do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'finish_task_queue_item'
      and pg_get_function_identity_arguments(p.oid) = 'uuid, boolean, text'
  ) then
    drop function public.finish_task_queue_item(uuid, boolean, text);
  end if;
end
$$;
