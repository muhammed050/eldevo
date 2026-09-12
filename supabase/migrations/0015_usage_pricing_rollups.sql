-- Deterministic pricing snapshots and automatic task usage rollups.
-- The existing runtime RPC is kept compatible while becoming idempotent and precise.

create table if not exists public.model_usage_pricing (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  model text not null,
  input_microcents_per_token bigint not null check (input_microcents_per_token >= 0),
  output_microcents_per_token bigint not null check (output_microcents_per_token >= 0),
  effective_at timestamptz not null default now(),
  expires_at timestamptz,
  source text,
  created_at timestamptz not null default now(),
  unique(provider, model, effective_at)
);

create index if not exists model_usage_pricing_lookup_idx
  on public.model_usage_pricing(provider, model, effective_at desc);

alter table public.model_usage_pricing enable row level security;

drop policy if exists model_usage_pricing_select_authenticated on public.model_usage_pricing;
create policy model_usage_pricing_select_authenticated on public.model_usage_pricing
  for select to authenticated using (true);

-- Values are microcents/token. Numerically this equals cents per million tokens.
-- GPT-5.6 alias currently routes to Sol.
insert into public.model_usage_pricing(
  provider, model, input_microcents_per_token, output_microcents_per_token, effective_at, source
) values
  ('openai', 'gpt-5.6', 400, 2000, '2026-09-12T00:00:00Z', 'OpenAI API pricing snapshot 2026-09-12'),
  ('openai', 'gpt-5.6-sol', 400, 2000, '2026-09-12T00:00:00Z', 'OpenAI API pricing snapshot 2026-09-12'),
  ('openai', 'gpt-5.6-terra', 200, 1200, '2026-09-12T00:00:00Z', 'OpenAI API pricing snapshot 2026-09-12'),
  ('openai', 'gpt-5.6-luna', 20, 120, '2026-09-12T00:00:00Z', 'OpenAI API pricing snapshot 2026-09-12')
on conflict (provider, model, effective_at) do nothing;

create or replace function public.refresh_task_usage_totals(
  p_task_id uuid,
  p_organization_id uuid
) returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_input bigint;
  v_output bigint;
  v_microcents bigint;
begin
  if coalesce(auth.role(), '') <> 'service_role'
     and not public.is_org_member(p_organization_id) then
    raise exception 'forbidden';
  end if;

  select
    coalesce(sum(input_tokens), 0),
    coalesce(sum(output_tokens), 0),
    coalesce(sum(cost_microcents), 0)
  into v_input, v_output, v_microcents
  from public.task_step_usage
  where task_id = p_task_id and organization_id = p_organization_id;

  update public.tasks
  set input_tokens = least(v_input, 2147483647)::integer,
      output_tokens = least(v_output, 2147483647)::integer,
      cost_microcents = v_microcents,
      cost_cents = least(ceil(v_microcents::numeric / 1000000), 2147483647)::integer
  where id = p_task_id and organization_id = p_organization_id;
end;
$$;

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
security invoker
set search_path = public
as $$
declare
  v_id uuid;
  v_input_rate bigint;
  v_output_rate bigint;
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

  select input_microcents_per_token, output_microcents_per_token
  into v_input_rate, v_output_rate
  from public.model_usage_pricing
  where provider = p_provider
    and model = p_model
    and effective_at <= now()
    and (expires_at is null or expires_at > now())
  order by effective_at desc
  limit 1;

  if v_input_rate is null or v_output_rate is null then
    -- Preserve compatibility for models not yet present in the pricing catalog.
    v_cost_microcents := greatest(p_cost_cents, 0)::bigint * 1000000;
  else
    v_cost_microcents :=
      greatest(p_input_tokens, 0)::bigint * v_input_rate
      + greatest(p_output_tokens, 0)::bigint * v_output_rate;
  end if;

  insert into public.task_step_usage(
    organization_id,
    task_id,
    task_step_id,
    provider,
    model,
    attempt,
    input_tokens,
    output_tokens,
    cost_cents,
    cost_microcents,
    latency_ms
  ) values (
    p_organization_id,
    p_task_id,
    p_task_step_id,
    p_provider,
    p_model,
    greatest(p_attempt, 1),
    greatest(p_input_tokens, 0),
    greatest(p_output_tokens, 0),
    ceil(v_cost_microcents::numeric / 1000000)::integer,
    v_cost_microcents,
    case when p_latency_ms is null then null else greatest(p_latency_ms, 0) end
  )
  on conflict (task_step_id, attempt, provider, model) do nothing
  returning id into v_id;

  if v_id is null then
    select id into v_id
    from public.task_step_usage
    where task_step_id = p_task_step_id
      and attempt = greatest(p_attempt, 1)
      and provider = p_provider
      and model = p_model;
  end if;

  perform public.refresh_task_usage_totals(p_task_id, p_organization_id);
  return v_id;
end;
$$;

create or replace view public.organization_usage_summary
with (security_invoker = true) as
select
  u.organization_id,
  count(distinct u.task_id)::bigint as tasks_with_usage,
  count(*)::bigint as usage_records,
  coalesce(sum(u.input_tokens), 0)::bigint as input_tokens,
  coalesce(sum(u.output_tokens), 0)::bigint as output_tokens,
  coalesce(sum(u.total_tokens), 0)::bigint as total_tokens,
  coalesce(sum(u.cost_microcents), 0)::bigint as cost_microcents,
  ceil(coalesce(sum(u.cost_microcents), 0)::numeric / 1000000)::bigint as cost_cents
from public.task_step_usage u
group by u.organization_id;

create or replace view public.agent_usage_summary
with (security_invoker = true) as
select
  t.organization_id,
  t.agent_id,
  count(distinct t.id)::bigint as tasks_with_usage,
  coalesce(sum(u.input_tokens), 0)::bigint as input_tokens,
  coalesce(sum(u.output_tokens), 0)::bigint as output_tokens,
  coalesce(sum(u.total_tokens), 0)::bigint as total_tokens,
  coalesce(sum(u.cost_microcents), 0)::bigint as cost_microcents,
  ceil(coalesce(sum(u.cost_microcents), 0)::numeric / 1000000)::bigint as cost_cents
from public.tasks t
join public.task_step_usage u on u.task_id = t.id and u.organization_id = t.organization_id
group by t.organization_id, t.agent_id;

grant select on public.model_usage_pricing to authenticated, service_role;
grant select on public.organization_usage_summary to authenticated, service_role;
grant select on public.agent_usage_summary to authenticated, service_role;
grant execute on function public.refresh_task_usage_totals(uuid, uuid) to authenticated, service_role;
