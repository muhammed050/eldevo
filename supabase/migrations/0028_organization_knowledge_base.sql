create table if not exists public.organization_knowledge_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  knowledge_key text not null,
  title text not null,
  content text not null,
  source_type text not null default 'manual' check (source_type in ('manual','document','integration','runtime')),
  source_uri text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, knowledge_key),
  check (length(knowledge_key) between 1 and 200),
  check (length(title) between 1 and 500),
  check (length(content) between 1 and 1000000)
);

create index if not exists organization_knowledge_entries_lookup_idx
  on public.organization_knowledge_entries (organization_id, updated_at desc);
create index if not exists organization_knowledge_entries_source_idx
  on public.organization_knowledge_entries (organization_id, source_type);

alter table public.organization_knowledge_entries enable row level security;

create policy "members can read organization knowledge"
  on public.organization_knowledge_entries for select to authenticated
  using (public.is_org_member(organization_id));

grant select on public.organization_knowledge_entries to authenticated;
revoke insert, update, delete on public.organization_knowledge_entries from authenticated, anon;

create or replace function public.upsert_organization_knowledge_entry(
  p_organization_id uuid,
  p_knowledge_key text,
  p_title text,
  p_content text,
  p_source_type text default 'manual',
  p_source_uri text default null,
  p_metadata jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_user_id uuid := auth.uid();
begin
  if auth.role() <> 'service_role' and not public.is_org_member(p_organization_id) then
    raise exception 'organization access denied';
  end if;
  if length(trim(p_knowledge_key)) < 1 or length(p_knowledge_key) > 200 then raise exception 'invalid knowledge key'; end if;
  if length(trim(p_title)) < 1 or length(p_title) > 500 then raise exception 'invalid title'; end if;
  if length(trim(p_content)) < 1 or length(p_content) > 1000000 then raise exception 'invalid content'; end if;
  if p_source_type not in ('manual','document','integration','runtime') then raise exception 'invalid source type'; end if;

  insert into public.organization_knowledge_entries (
    organization_id, knowledge_key, title, content, source_type, source_uri, metadata, created_by
  ) values (
    p_organization_id, trim(p_knowledge_key), trim(p_title), p_content, p_source_type, nullif(trim(p_source_uri), ''), coalesce(p_metadata, '{}'::jsonb), v_user_id
  )
  on conflict (organization_id, knowledge_key) do update set
    title = excluded.title,
    content = excluded.content,
    source_type = excluded.source_type,
    source_uri = excluded.source_uri,
    metadata = excluded.metadata,
    updated_at = now()
  returning id into v_id;
  return v_id;
end;
$$;

grant execute on function public.upsert_organization_knowledge_entry(uuid,text,text,text,text,text,jsonb) to authenticated, service_role;
