-- Harden runtime usage/cost accounting for retries, resumptions and service workers.
-- Adds fractional-cent precision, idempotent per-attempt records and aggregate helpers.

alter table public.task_step_usage
  add column if not exists cost_microcents bigint not null default 0
    check (cost_microcents >= 0);

update public.task_step_usage
set cost_microcents = cost_cents::bigint * 1000000
where cost_microcents = 0 and cost_cents > 0;

alter table public.tasks
  add column if not exists cost_microcents bigint not null default 0
    check (cost_microcents >= 0);

update public.tasks
set cost_microcents = cost_cents::bigint * 1000000
where cost_microcents = 0 and cost_cents > 0;

create unique index if not exists task_step_usage_attempt_unique_idx
  on public.task_step_usage(task_step_id, attempt, provider, model);

create index if not exists task_step_usage_org_model_created_idx
  on public.task_step_usage(organization_id, provider, model, created_at desc);

create or replace function public.record_task_step_usage_v2(
  p_task_id uuid,
  p_task_step_id uuid,
  p_organization_id uuid,
  p_provider text,
  p_model text,
  p_attempt integer,
  p_input_tokens integer,
  p_output_tokens integer,
  p_cost_microcents bigint,
  p_latency_ms integer default null
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
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
    ceil(greatest(p_cost_microcents, 0)::numeric / 1000000)::integer,
    greatest(p_cost_microcents, 0),
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

  return v_id;
end;
$$;

create or replace function public.get_task_usage_totals(
  p_task_id uuid,
  p_organization_id uuid
) returns table (
  input_tokens bigint,
  output_tokens bigint,
  total_tokens bigint,
  cost_microcents bigint,
  cost_cents bigint
)
language plpgsql
security invoker
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role'
     and not public.is_org_member(p_organization_id) then
    raise exception 'forbidden';
  end if;

  if not exists (
    select 1 from public.tasks
    where id = p_task_id and organization_id = p_organization_id
  ) then
    raise exception 'task_not_found';
  end if;

  return query
  select
    coalesce(sum(u.input_tokens), 0)::bigint,
    coalesce(sum(u.output_tokens), 0)::bigint,
    coalesce(sum(u.total_tokens), 0)::bigint,
    coalesce(sum(u.cost_microcents), 0)::bigint,
    ceil(coalesce(sum(u.cost_microcents), 0)::numeric / 1000000)::bigint
  from public.task_step_usage u
  where u.task_id = p_task_id
    and u.organization_id = p_organization_id;
end;
$$;

grant execute on function public.record_task_step_usage_v2(uuid, uuid, uuid, text, text, integer, integer, integer, bigint, integer) to authenticated, service_role;
grant execute on function public.get_task_usage_totals(uuid, uuid) to authenticated, service_role;
