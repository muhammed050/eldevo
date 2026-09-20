-- Tool marketplace publishing lifecycle.
-- Publishing is restricted to owner/admin members of the owning organization.
-- Runtime executor bindings, config and secret references are never exposed by the public catalog.

alter table public.tools
  add column if not exists marketplace_slug text,
  add column if not exists marketplace_summary text,
  add column if not exists marketplace_category text,
  add column if not exists marketplace_tags text[] not null default '{}'::text[],
  add column if not exists published_at timestamptz,
  add column if not exists published_by uuid references auth.users(id) on delete set null;

create unique index if not exists tools_marketplace_slug_uidx
  on public.tools (marketplace_slug)
  where published = true and marketplace_slug is not null;

create index if not exists tools_marketplace_catalog_idx
  on public.tools (marketplace_category, published_at desc)
  where published = true and enabled = true;

create or replace function public.publish_tool_to_marketplace(
  p_tool_id uuid,
  p_slug text,
  p_summary text,
  p_category text,
  p_tags text[] default '{}'::text[]
) returns public.tools
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tool public.tools;
  v_slug text := lower(trim(p_slug));
begin
  select * into v_tool from public.tools where id = p_tool_id for update;
  if v_tool.id is null then raise exception 'tool_not_found'; end if;
  if v_tool.organization_id is null then raise exception 'global_tools_are_platform_managed'; end if;

  if not exists (
    select 1 from public.memberships m
    where m.organization_id = v_tool.organization_id
      and m.user_id = auth.uid()
      and m.role in ('owner'::public.member_role, 'admin'::public.member_role)
  ) then raise exception 'forbidden'; end if;

  if not v_tool.enabled then raise exception 'tool_must_be_enabled'; end if;
  if v_tool.executor_key is null or trim(v_tool.executor_key) = '' then raise exception 'tool_requires_executor'; end if;
  if v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' or length(v_slug) > 80 then raise exception 'invalid_marketplace_slug'; end if;
  if length(trim(coalesce(p_summary, ''))) < 10 or length(p_summary) > 240 then raise exception 'invalid_marketplace_summary'; end if;
  if length(trim(coalesce(p_category, ''))) < 2 or length(p_category) > 60 then raise exception 'invalid_marketplace_category'; end if;
  if cardinality(coalesce(p_tags, '{}'::text[])) > 12 then raise exception 'too_many_marketplace_tags'; end if;

  update public.tools set
    published = true,
    marketplace_slug = v_slug,
    marketplace_summary = trim(p_summary),
    marketplace_category = trim(p_category),
    marketplace_tags = coalesce(p_tags, '{}'::text[]),
    published_at = now(),
    published_by = auth.uid()
  where id = p_tool_id
  returning * into v_tool;

  return v_tool;
end;
$$;

create or replace function public.unpublish_tool_from_marketplace(p_tool_id uuid)
returns public.tools
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tool public.tools;
begin
  select * into v_tool from public.tools where id = p_tool_id for update;
  if v_tool.id is null then raise exception 'tool_not_found'; end if;
  if v_tool.organization_id is null then raise exception 'global_tools_are_platform_managed'; end if;

  if not exists (
    select 1 from public.memberships m
    where m.organization_id = v_tool.organization_id
      and m.user_id = auth.uid()
      and m.role in ('owner'::public.member_role, 'admin'::public.member_role)
  ) then raise exception 'forbidden'; end if;

  update public.tools set published = false, published_at = null, published_by = null
  where id = p_tool_id returning * into v_tool;
  return v_tool;
end;
$$;

grant execute on function public.publish_tool_to_marketplace(uuid, text, text, text, text[]) to authenticated;
grant execute on function public.unpublish_tool_from_marketplace(uuid) to authenticated;

-- Safe catalog surface: deliberately excludes config, secret_refs and executor_key.
create or replace view public.tool_marketplace_catalog
with (security_invoker = true)
as
select
  t.id, t.organization_id, t.name, t.description, t.version,
  t.input_schema, t.output_schema, t.risk_level, t.permissions, t.scopes,
  t.marketplace_slug, t.marketplace_summary, t.marketplace_category,
  t.marketplace_tags, t.published_at
from public.tools t
where t.published = true and t.enabled = true;

grant select on public.tool_marketplace_catalog to authenticated;

-- Published tools are discoverable by authenticated users. Existing tenant-scoped
-- policies continue to protect unpublished organization tools.
drop policy if exists "authenticated can discover published tools" on public.tools;
create policy "authenticated can discover published tools" on public.tools
for select to authenticated
using (published = true and enabled = true);
