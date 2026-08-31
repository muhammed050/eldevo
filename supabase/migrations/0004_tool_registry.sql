create table if not exists public.tools (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  name text not null,
  description text not null default '',
  version text not null default '1.0.0',
  input_schema jsonb not null default '{}',
  risk_level text not null default 'low' check (risk_level in ('low','medium','high')),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id, name, version)
);
create index if not exists tools_org_idx on public.tools(organization_id);
alter table public.tools enable row level security;
create policy "members can read tools" on public.tools for select using (organization_id is null or exists (select 1 from public.memberships m where m.organization_id = tools.organization_id and m.user_id = auth.uid()));
create policy "managers can manage tools" on public.tools for all using (exists (select 1 from public.memberships m where m.organization_id = tools.organization_id and m.user_id = auth.uid() and m.role in ('owner','admin','manager'))) with check (exists (select 1 from public.memberships m where m.organization_id = tools.organization_id and m.user_id = auth.uid() and m.role in ('owner','admin','manager')));
