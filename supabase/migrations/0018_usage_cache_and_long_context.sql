-- Billing-grade token accounting: cache reads/writes and long-context modifiers.

alter table public.task_step_usage
  add column if not exists no_cache_input_tokens integer not null default 0 check (no_cache_input_tokens >= 0),
  add column if not exists cache_read_input_tokens integer not null default 0 check (cache_read_input_tokens >= 0),
  add column if not exists cache_write_input_tokens integer not null default 0 check (cache_write_input_tokens >= 0);

alter table public.model_usage_pricing
  add column if not exists cached_input_microcents_per_token bigint check (cached_input_microcents_per_token >= 0),
  add column if not exists cache_write_microcents_per_token bigint check (cache_write_microcents_per_token >= 0),
  add column if not exists long_context_threshold_tokens integer check (long_context_threshold_tokens > 0),
  add column if not exists long_context_input_multiplier numeric(8,4) not null default 1 check (long_context_input_multiplier >= 1),
  add column if not exists long_context_output_multiplier numeric(8,4) not null default 1 check (long_context_output_multiplier >= 1);

-- Current GPT-5.6 API pricing snapshot. Cache reads are 10% of uncached input;
-- cache writes are 1.25x uncached input. Requests above 272K input tokens use
-- 2x input-side pricing and 1.5x output pricing for the full request.
update public.model_usage_pricing
set cached_input_microcents_per_token = case model
      when 'gpt-5.6' then 40
      when 'gpt-5.6-sol' then 40
      when 'gpt-5.6-terra' then 20
      when 'gpt-5.6-luna' then 2
      else cached_input_microcents_per_token
    end,
    cache_write_microcents_per_token = case model
      when 'gpt-5.6' then 500
      when 'gpt-5.6-sol' then 500
      when 'gpt-5.6-terra' then 250
      when 'gpt-5.6-luna' then 25
      else cache_write_microcents_per_token
    end,
    long_context_threshold_tokens = case when model in ('gpt-5.6','gpt-5.6-sol','gpt-5.6-terra','gpt-5.6-luna') then 272000 else long_context_threshold_tokens end,
    long_context_input_multiplier = case when model in ('gpt-5.6','gpt-5.6-sol','gpt-5.6-terra','gpt-5.6-luna') then 2 else long_context_input_multiplier end,
    long_context_output_multiplier = case when model in ('gpt-5.6','gpt-5.6-sol','gpt-5.6-terra','gpt-5.6-luna') then 1.5 else long_context_output_multiplier end
where provider = 'openai';

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
security invoker
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
  if coalesce(auth.role(), '') <> 'service_role'
     and not public.is_org_member(p_organization_id) then
    raise exception 'forbidden';
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

  v_total_input := greatest(p_no_cache_input_tokens, 0)::bigint
    + greatest(p_cache_read_input_tokens, 0)::bigint
    + greatest(p_cache_write_input_tokens, 0)::bigint;

  if v_threshold is not null and v_total_input > v_threshold then
    v_input_rate := ceil(v_input_rate * v_input_multiplier)::bigint;
    v_cached_rate := ceil(v_cached_rate * v_input_multiplier)::bigint;
    v_cache_write_rate := ceil(v_cache_write_rate * v_input_multiplier)::bigint;
    v_output_rate := ceil(v_output_rate * v_output_multiplier)::bigint;
  end if;

  v_cost_microcents :=
      greatest(p_no_cache_input_tokens, 0)::bigint * v_input_rate
    + greatest(p_cache_read_input_tokens, 0)::bigint * v_cached_rate
    + greatest(p_cache_write_input_tokens, 0)::bigint * v_cache_write_rate
    + greatest(p_output_tokens, 0)::bigint * v_output_rate;

  insert into public.task_step_usage(
    organization_id, task_id, task_step_id, provider, model, attempt,
    input_tokens, no_cache_input_tokens, cache_read_input_tokens,
    cache_write_input_tokens, output_tokens, cost_cents, cost_microcents, latency_ms
  ) values (
    p_organization_id, p_task_id, p_task_step_id, p_provider, p_model,
    greatest(p_attempt, 1), least(v_total_input, 2147483647)::integer,
    greatest(p_no_cache_input_tokens, 0), greatest(p_cache_read_input_tokens, 0),
    greatest(p_cache_write_input_tokens, 0), greatest(p_output_tokens, 0),
    ceil(v_cost_microcents::numeric / 1000000)::integer,
    v_cost_microcents,
    case when p_latency_ms is null then null else greatest(p_latency_ms, 0) end
  )
  on conflict (task_step_id, attempt, provider, model) do nothing
  returning id into v_id;

  if v_id is null then
    select id into v_id from public.task_step_usage
    where task_step_id = p_task_step_id
      and attempt = greatest(p_attempt, 1)
      and provider = p_provider
      and model = p_model;
  end if;

  perform public.refresh_task_usage_totals(p_task_id, p_organization_id);
  return v_id;
end;
$$;

grant execute on function public.record_task_step_usage_v3(uuid, uuid, uuid, text, text, integer, integer, integer, integer, integer, integer) to authenticated, service_role;
