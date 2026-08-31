create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','admin','manager','member','viewer')),
  created_at timestamptz not null default now(),
  unique(organization_id, user_id)
);

create index if not exists memberships_user_idx on public.memberships(user_id);
create index if not exists memberships_org_idx on public.memberships(organization_id);

alter table public.organizations enable row level security;
alter table public.memberships enable row level security;

create policy "members can read organizations" on public.organizations for select using (
  exists (select 1 from public.memberships m where m.organization_id = organizations.id and m.user_id = auth.uid())
);
create policy "owners can update organizations" on public.organizations for update using (
  exists (select 1 from public.memberships m where m.organization_id = organizations.id and m.user_id = auth.uid() and m.role in ('owner','admin'))
) with check (
  exists (select 1 from public.memberships m where m.organization_id = organizations.id and m.user_id = auth.uid() and m.role in ('owner','admin'))
);
create policy "members can read memberships" on public.memberships for select using (user_id = auth.uid() or exists (
  select 1 from public.memberships m where m.organization_id = memberships.organization_id and m.user_id = auth.uid() and m.role in ('owner','admin')
));
