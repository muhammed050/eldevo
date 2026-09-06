-- The original hardening migration revoked a non-existent overload of finish_task_queue_item.
-- Revoke the actual signature explicitly so the migration remains replay-safe.
revoke all on function public.finish_task_queue_item(uuid, text, boolean, text) from public;
revoke all on function public.claim_task_queue_item(text) from public;
revoke all on function public.enqueue_task(uuid, uuid) from public;

grant execute on function public.enqueue_task(uuid, uuid) to authenticated, service_role;
grant execute on function public.claim_task_queue_item(text) to service_role;
grant execute on function public.finish_task_queue_item(uuid, text, boolean, text) to service_role;
