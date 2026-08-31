create extension if not exists pgcrypto;

create table if not exists public.agents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text not null default '',
  instructions text not null default '',
  model text not null default 'auto',
  tools text[] not null default '{}',
  permissions text[] not null default '{}',
  budget_cents integer not null default 1000 check (budget_cents >= 0),
  status text not null default 'draft' check (status in ('draft','active','paused','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete restrict,
  goal text not null,
  status text not null default 'pending' check (status in ('pending','running','waiting_approval','completed','failed','cancelled')),
  result jsonb,
  error text,
  budget_cents integer not null default 1000 check (budget_cents >= 0),
  cost_cents integer not null default 0 check (cost_cents >= 0),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create table if not exists public.task_steps (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  step_order integer not null,
  name text not null,
  status text not null default 'pending',
  input jsonb,
  output jsonb,
  error text,
  created_at timestamptz not null default now(),
  unique(task_id, step_order)
);

create table if not exists public.approvals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  reason text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_type text not null check (actor_type in ('user','agent','system')),
  actor_id uuid,
  action text not null,
  resource_type text not null,
  resource_id uuid,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists agents_org_idx on public.agents(organization_id);
create index if not exists tasks_org_status_idx on public.tasks(organization_id, status);
create index if not exists task_steps_task_idx on public.task_steps(task_id, step_order);
create index if not exists approvals_org_status_idx on public.approvals(organization_id, status);
create index if not exists audit_logs_org_created_idx on public.audit_logs(organization_id, created_at desc);

alter table public.agents enable row level security;
alter table public.tasks enable row level security;
alter table public.task_steps enable row level security;
alter table public.approvals enable row level security;
alter table public.audit_logs enable row level security;

-- These policies assume public.memberships has user_id + organization_id.
create policy "members can read agents" on public.agents for select using (
  exists (select 1 from public.memberships m where m.organization_id = agents.organization_id and m.user_id = auth.uid())
);
create policy "members can manage agents" on public.agents for all using (
  exists (select 1 from public.memberships m where m.organization_id = agents.organization_id and m.user_id = auth.uid())
) with check (
  exists (select 1 from public.memberships m where m.organization_id = agents.organization_id and m.user_id = auth.uid())
);
create policy "members can read tasks" on public.tasks for select using (
  exists (select 1 from public.memberships m where m.organization_id = tasks.organization_id and m.user_id = auth.uid())
);
create policy "members can create tasks" on public.tasks for insert with check (
  exists (select 1 from public.memberships m where m.organization_id = tasks.organization_id and m.user_id = auth.uid())
);
create policy "members can update tasks" on public.tasks for update using (
  exists (select 1 from public.memberships m where m.organization_id = tasks.organization_id and m.user_id = auth.uid())
) with check (
  exists (select 1 from public.memberships m where m.organization_id = tasks.organization_id and m.user_id = auth.uid())
);
create policy "members can read task steps" on public.task_steps for select using (
  exists (select 1 from public.tasks t join public.memberships m on m.organization_id = t.organization_id where t.id = task_steps.task_id and m.user_id = auth.uid())
);
create policy "members can read approvals" on public.approvals for select using (
  exists (select 1 from public.memberships m where m.organization_id = approvals.organization_id and m.user_id = auth.uid())
);
create policy "members can manage approvals" on public.approvals for all using (
  exists (select 1 from public.memberships m where m.organization_id = approvals.organization_id and m.user_id = auth.uid())
) with check (
  exists (select 1 from public.memberships m where m.organization_id = approvals.organization_id and m.user_id = auth.uid())
);
create policy "members can read audit logs" on public.audit_logs for select using (
  exists (select 1 from public.memberships m where m.organization_id = audit_logs.organization_id and m.user_id = auth.uid())
);
