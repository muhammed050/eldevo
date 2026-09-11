-- Production-grade usage and cost accounting.
-- Keeps immutable per-step usage records and exposes organization-scoped totals.

create table if not exists public.task_step_usage (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  task_step_id uuid not null references public.task_steps(id) on delete cascade,
  provider text not null,
  model text not null,
  attempt integer not null default 1 check (attempt > 0),
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  total_tokens integer generated always as (input_tokens + output_tokens) stored,
  cost_cents integer not null default 0 check (cost_cents >= 0),
  latency_ms integer check (latency_ms is null or latency_ms >= 0),
  created_at timestamptz not null default now()
);

create index if not exists task_step_usage_org_created_idx on public.task_step_usage(organization_id, created_at desc);
create index if not exists task_step_usage_task_idx on public.task_step_usage(task_id, created_at desc);

alter table public.task_step_usage enable row level security;

drop policy if exists task_step_usage_select_member on public.task_step_usage;
create policy task_step_usage_select_member on public.task_step_usage
  for select using (public.is_org_member(organization_id));

drop policy if exists task_step_usage_insert_member on public.task_step_usage;
create policy task_step_usage_insert_member on public.task_step_usage
  for insert with check (public.is_org_member(organization_id));

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
declare v_id uuid;
begin
  if not public.is_org_member(p_organization_id) then
    raise exception 'forbidden';
  end if;
  if not exists (
    select 1 from public.tasks t
    join public.task_steps s on s.task_id = t.id
    where t.id = p_task_id and s.id = p_task_step_id and t.organization_id = p_organization_id
  ) then
    raise exception 'task_step_not_found';
  end if;
  insert into public.task_step_usage(organization_id, task_id, task_step_id, provider, model, attempt, input_tokens, output_tokens, cost_cents, latency_ms)
  values (p_organization_id, p_task_id, p_task_step_id, p_provider, p_model, p_attempt, greatest(p_input_tokens,0), greatest(p_output_tokens,0), greatest(p_cost_cents,0), p_latency_ms)
  returning id into v_id;
  return v_id;
end;
$$;

grant execute on function public.record_task_step_usage(uuid, uuid, uuid, text, text, integer, integer, integer, integer, integer) to authenticated, service_role;
