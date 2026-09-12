-- Make per-attempt usage accounting idempotent.
-- A provider response may be persisted successfully even if the caller loses the response;
-- retrying the accounting RPC must not double-charge the same step attempt.

create unique index if not exists task_step_usage_attempt_uidx
  on public.task_step_usage(task_step_id, attempt, provider, model);

create or replace function public.record_task_step_usage(
  p_task_id uuid,
  p_task_step_id uuid,
  p_organization_id uuid,
  p_provider text,
  p_model text,
  p_attempt integer,
  p_input_tokens integer,
  p_output_tokens integer,
  p_cost_cents integer,
  p_latency_ms integer default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if auth.role() <> 'service_role' then
    raise exception 'forbidden';
  end if;
  if nullif(trim(p_provider), '') is null or nullif(trim(p_model), '') is null then
    raise exception 'provider_and_model_required';
  end if;
  if p_attempt is null or p_attempt <= 0 or p_input_tokens is null or p_input_tokens < 0
     or p_output_tokens is null or p_output_tokens < 0 or p_cost_cents is null or p_cost_cents < 0
     or (p_latency_ms is not null and p_latency_ms < 0) then
    raise exception 'invalid_usage_values';
  end if;
  if not exists (
    select 1 from public.tasks t
    join public.task_steps s on s.task_id = t.id
    where t.id = p_task_id and s.id = p_task_step_id and t.organization_id = p_organization_id
  ) then
    raise exception 'task_step_not_found';
  end if;

  insert into public.task_step_usage(
    organization_id, task_id, task_step_id, provider, model, attempt,
    input_tokens, output_tokens, cost_cents, latency_ms
  ) values (
    p_organization_id, p_task_id, p_task_step_id, trim(p_provider), trim(p_model), p_attempt,
    p_input_tokens, p_output_tokens, p_cost_cents, p_latency_ms
  )
  on conflict (task_step_id, attempt, provider, model) do nothing
  returning id into v_id;

  if v_id is null then
    select id into v_id
    from public.task_step_usage
    where task_step_id = p_task_step_id
      and attempt = p_attempt
      and provider = trim(p_provider)
      and model = trim(p_model);
  end if;

  return v_id;
end;
$$;

revoke all on function public.record_task_step_usage(uuid, uuid, uuid, text, text, integer, integer, integer, integer, integer)
  from public, anon, authenticated;
grant execute on function public.record_task_step_usage(uuid, uuid, uuid, text, text, integer, integer, integer, integer, integer)
  to service_role;
