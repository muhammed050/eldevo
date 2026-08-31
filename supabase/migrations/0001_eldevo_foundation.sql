create extension if not exists pgcrypto;
create extension if not exists vector;

create type public.member_role as enum ('owner','admin','manager','member','viewer');
create type public.agent_status as enum ('draft','active','paused','archived');
create type public.task_status as enum ('pending','running','waiting_approval','completed','failed','cancelled');
create type public.risk_level as enum ('low','medium','high','critical');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  created_at timestamptz not null default now()
);

create table public.memberships (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table public.agents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text not null default '',
  instructions text not null default '',
  status public.agent_status not null default 'draft',
  model text,
  budget_cents integer not null default 0 check (budget_cents >= 0),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  agent_id uuid references public.agents(id) on delete set null,
  goal text not null,
  status public.task_status not null default 'pending',
  risk public.risk_level not null default 'low',
  budget_cents integer not null default 0 check (budget_cents >= 0),
  result jsonb,
  error text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.task_steps (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  step_index integer not null check (step_index >= 0),
  name text not null,
  status public.task_status not null default 'pending',
  tool_name text,
  input jsonb,
  output jsonb,
  cost_cents integer not null default 0 check (cost_cents >= 0),
  created_at timestamptz not null default now(),
  unique(task_id, step_index)
);

create table public.approvals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  action text not null,
  risk public.risk_level not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','approved','rejected','expired')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid references auth.users(id),
  agent_id uuid references public.agents(id) on delete set null,
  task_id uuid references public.tasks(id) on delete set null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index memberships_user_idx on public.memberships(user_id);
create index agents_org_idx on public.agents(organization_id);
create index tasks_org_status_idx on public.tasks(organization_id, status);
create index approvals_org_status_idx on public.approvals(organization_id, status);
create index audit_org_created_idx on public.audit_logs(organization_id, created_at desc);

alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.agents enable row level security;
alter table public.tasks enable row level security;
alter table public.task_steps enable row level security;
alter table public.approvals enable row level security;
alter table public.audit_logs enable row level security;

create or replace function public.is_org_member(org_id uuid)
returns boolean language sql stable security invoker as $$
  select exists (
    select 1 from public.memberships m
    where m.organization_id = org_id and m.user_id = (select auth.uid())
  );
$$;

create policy "members can view organizations" on public.organizations
for select to authenticated using (public.is_org_member(id));

create policy "members can view memberships" on public.memberships
for select to authenticated using (public.is_org_member(organization_id));

create policy "members can view agents" on public.agents
for select to authenticated using (public.is_org_member(organization_id));
create policy "members can create agents" on public.agents
for insert to authenticated with check (public.is_org_member(organization_id) and created_by = (select auth.uid()));
create policy "members can update agents" on public.agents
for update to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));

create policy "members can view tasks" on public.tasks
for select to authenticated using (public.is_org_member(organization_id));
create policy "members can create tasks" on public.tasks
for insert to authenticated with check (public.is_org_member(organization_id) and created_by = (select auth.uid()));
create policy "members can update tasks" on public.tasks
for update to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));

create policy "members can view task steps" on public.task_steps
for select to authenticated using (exists (select 1 from public.tasks t where t.id = task_id and public.is_org_member(t.organization_id)));

create policy "members can view approvals" on public.approvals
for select to authenticated using (public.is_org_member(organization_id));
create policy "members can create approvals" on public.approvals
for insert to authenticated with check (public.is_org_member(organization_id));
create policy "members can update approvals" on public.approvals
for update to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));

create policy "members can view audit logs" on public.audit_logs
for select to authenticated using (public.is_org_member(organization_id));

-- Service-role workers should use the server-side Supabase client for privileged execution.
-- Never expose service-role credentials in browser code.
