create table if not exists public.agent_episodes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  goal text not null,
  outcome text not null check (outcome in ('completed','failed','cancelled')),
  result jsonb,
  error text,
  summary text not null,
  importance smallint not null default 50 check (importance between 0 and 100),
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (task_id)
);

create index if not exists agent_episodes_agent_timeline_idx
  on public.agent_episodes (organization_id, agent_id, occurred_at desc);
create index if not exists agent_episodes_importance_idx
  on public.agent_episodes (organization_id, agent_id, importance desc, occurred_at desc);

alter table public.agent_episodes enable row level security;

create policy "members can read agent episodes"
  on public.agent_episodes for select to authenticated
  using (public.is_org_member(organization_id));

grant select on public.agent_episodes to authenticated;
revoke insert, update, delete on public.agent_episodes from authenticated, anon;

create or replace function public.capture_task_episode()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_summary text;
  v_occurred_at timestamptz;
begin
  if new.status::text not in ('completed', 'failed', 'cancelled') then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.status is not distinct from new.status then
    return new;
  end if;

  v_occurred_at := coalesce(new.completed_at, now());
  v_summary := case new.status::text
    when 'completed' then 'Completed task: ' || left(new.goal, 1500)
    when 'failed' then 'Failed task: ' || left(new.goal, 1500)
    else 'Cancelled task: ' || left(new.goal, 1500)
  end;

  insert into public.agent_episodes (
    organization_id, agent_id, task_id, goal, outcome, result, error,
    summary, importance, metadata, occurred_at
  ) values (
    new.organization_id,
    new.agent_id,
    new.id,
    new.goal,
    new.status::text,
    new.result,
    new.error,
    v_summary,
    case when new.status::text = 'completed' then 60 when new.status::text = 'failed' then 70 else 40 end,
    jsonb_build_object('cost_cents', new.cost_cents),
    v_occurred_at
  )
  on conflict (task_id) do update set
    outcome = excluded.outcome,
    result = excluded.result,
    error = excluded.error,
    summary = excluded.summary,
    importance = excluded.importance,
    metadata = excluded.metadata,
    occurred_at = excluded.occurred_at;

  return new;
end;
$$;

drop trigger if exists tasks_capture_episode on public.tasks;
create trigger tasks_capture_episode
  after insert or update of status on public.tasks
  for each row execute function public.capture_task_episode();

-- Backfill terminal tasks that predate episodic memory.
insert into public.agent_episodes (
  organization_id, agent_id, task_id, goal, outcome, result, error,
  summary, importance, metadata, occurred_at
)
select
  t.organization_id,
  t.agent_id,
  t.id,
  t.goal,
  t.status::text,
  t.result,
  t.error,
  case t.status::text
    when 'completed' then 'Completed task: ' || left(t.goal, 1500)
    when 'failed' then 'Failed task: ' || left(t.goal, 1500)
    else 'Cancelled task: ' || left(t.goal, 1500)
  end,
  case when t.status::text = 'completed' then 60 when t.status::text = 'failed' then 70 else 40 end,
  jsonb_build_object('cost_cents', t.cost_cents),
  coalesce(t.completed_at, t.created_at)
from public.tasks t
where t.status::text in ('completed', 'failed', 'cancelled')
on conflict (task_id) do nothing;
