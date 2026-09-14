-- Keep billing/usage writes server-side only.
-- 0018 introduced record_task_step_usage_v3 and accidentally granted it to
-- authenticated users. Usage is authoritative billing data and must only be
-- emitted by trusted runtime workers.

revoke execute on function public.record_task_step_usage_v3(
  uuid, uuid, uuid, text, text, integer, integer, integer, integer, integer, integer
) from public, anon, authenticated;

grant execute on function public.record_task_step_usage_v3(
  uuid, uuid, uuid, text, text, integer, integer, integer, integer, integer, integer
) to service_role;

create or replace function public.record_task_step_usage_v3(
  p_task_id uuid,
  p_task_step_id uuid,
  p_organization_id uuid,
  p_provider text,
  p_model text,
  p_attempt integer,
  p_no_cache_input_tokens integer,
  p_cache_read_input_tokens integer,
  p_cache_write_input_tokens integer,
  p_output_tokens integer,
  p_latency_ms integer default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_input_rate bigint;
  v_cached_rate bigint;
  v_cache_write_rate bigint;
  v_output_rate bigint;
  v_threshold integer;
  v_input_multiplier numeric;
  v_output_multiplier numeric;
  v_total_input bigint;
  v_cost_microcents bigint;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'forbidden';
  end if;

  if p_provider is null or btrim(p_provider) = '' or p_model is null or btrim(p_model) = '' then
    raise exception 'invalid_provider_or_model';
  end if;

  if p_attempt is null or p_attempt < 1
     or p_no_cache_input_tokens is null or p_no_cache_input_tokens < 0
     or p_cache_read_input_tokens is null or p_cache_read_input_tokens < 0
     or p_cache_write_input_tokens is null or p_cache_write_input_tokens < 0
     or p_output_tokens is null or p_output_tokens < 0
     or (p_latency_ms is not null and p_latency_ms < 0) then
    raise exception 'invalid_usage_values';
  end if;

  if not exists (
    select 1
    from public.tasks t
    join public.task_steps s on s.task_id = t.id
    where t.id = p_task_id
      and s.id = p_task_step_id
      and t.organization_id = p_organization_id
  ) then
    raise exception 'task_step_not_found';
  end if;

  select
    input_microcents_per_token,
    coalesce(cached_input_microcents_per_token, input_microcents_per_token),
    coalesce(cache_write_microcents_per_token, input_microcents_per_token),
    output_microcents_per_token,
    long_context_threshold_tokens,
    long_context_input_multiplier,
    long_context_output_multiplier
  into
    v_input_rate,
    v_cached_rate,
    v_cache_write_rate,
    v_output_rate,
    v_threshold,
    v_input_multiplier,
    v_output_multiplier
  from public.model_usage_pricing
  where provider = p_provider
    and model = p_model
    and effective_at <= now()
    and (expires_at is null or expires_at > now())
  order by effective_at desc
  limit 1;

  if v_input_rate is null or v_output_rate is null then
    raise exception 'pricing_not_found';
  end if;

  v_total_input := p_no_cache_input_tokens::bigint
    + p_cache_read_input_tokens::bigint
    + p_cache_write_input_tokens::bigint;

  if v_total_input > 2147483647 then
    raise exception 'input_tokens_out_of_range';
  end if;

  if v_threshold is not null and v_total_input > v_threshold then
    v_input_rate := ceil(v_input_rate * v_input_multiplier)::bigint;
    v_cached_rate := ceil(v_cached_rate * v_input_multiplier)::bigint;
    v_cache_write_rate := ceil(v_cache_write_rate * v_input_multiplier)::bigint;
    v_output_rate := ceil(v_output_rate * v_output_multiplier)::bigint;
  end if;

  v_cost_microcents :=
      p_no_cache_input_tokens::bigint * v_input_rate
    + p_cache_read_input_tokens::bigint * v_cached_rate
    + p_cache_write_input_tokens::bigint * v_cache_write_rate
    + p_output_tokens::bigint * v_output_rate;

  insert into public.task_step_usage(
    organization_id, task_id, task_step_id, provider, model, attempt,
    input_tokens, no_cache_input_tokens, cache_read_input_tokens,
    cache_write_input_tokens, output_tokens, cost_cents, cost_microcents, latency_ms
  ) values (
    p_organization_id, p_task_id, p_task_step_id, p_provider, p_model,
    p_attempt, v_total_input::integer,
    p_no_cache_input_tokens, p_cache_read_input_tokens,
    p_cache_write_input_tokens, p_output_tokens,
    ceil(v_cost_microcents::numeric / 1000000)::integer,
    v_cost_microcents,
    p_latency_ms
  )
  on conflict (task_step_id, attempt, provider, model) do nothing
  returning id into v_id;

  if v_id is null then
    select id into v_id
    from public.task_step_usage
    where task_step_id = p_task_step_id
      and attempt = p_attempt
      and provider = p_provider
      and model = p_model;
  end if;

  perform public.refresh_task_usage_totals(p_task_id, p_organization_id);
  return v_id;
end;
$$;

revoke execute on function public.record_task_step_usage_v3(
  uuid, uuid, uuid, text, text, integer, integer, integer, integer, integer, integer
) from public, anon, authenticated;

grant execute on function public.record_task_step_usage_v3(
  uuid, uuid, uuid, text, text, integer, integer, integer, integer, integer, integer
) to service_role;
