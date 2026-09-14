-- Production tool-registry foundation used by the Agent Runtime.
-- Global tools use organization_id = null; organization tools override globals by name/version.

alter table public.tools
  add column if not exists output_schema jsonb not null default '{}'::jsonb,
  add column if not exists permissions text[] not null default '{}'::text[],
  add column if not exists config jsonb not null default '{}'::jsonb,
  add column if not exists secret_refs text[] not null default '{}'::text[],
  add column if not exists timeout_ms integer not null default 30000 check (timeout_ms between 100 and 600000),
  add column if not exists max_attempts integer not null default 1 check (max_attempts between 1 and 10),
  add column if not exists executor_key text,
  add column if not exists published boolean not null default false;

create index if not exists tools_lookup_idx
  on public.tools(name, enabled, organization_id, version);

create index if not exists tools_global_enabled_idx
  on public.tools(name, version)
  where organization_id is null and enabled = true;

-- Resolve a tool inside a tenant boundary. Organization-specific definitions take
-- precedence over global definitions. The caller never chooses another tenant.
create or replace function public.resolve_tool_definition(
  p_organization_id uuid,
  p_name text,
  p_version text default null
) returns public.tools
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_tool public.tools;
begin
  if not public.is_org_member(p_organization_id)
     and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'forbidden';
  end if;

  select t.* into v_tool
  from public.tools t
  where t.name = p_name
    and t.enabled = true
    and (t.organization_id = p_organization_id or t.organization_id is null)
    and (p_version is null or t.version = p_version)
  order by
    case when t.organization_id = p_organization_id then 0 else 1 end,
    t.created_at desc
  limit 1;

  if v_tool.id is null then
    raise exception 'tool_not_found';
  end if;

  return v_tool;
end;
$$;

grant execute on function public.resolve_tool_definition(uuid, text, text) to authenticated, service_role;

-- Seed the built-in echo executor as a global registry entry. Execution code remains
-- server-side; the database controls metadata, permissions, risk and lifecycle.
insert into public.tools (
  organization_id, name, description, version, input_schema, output_schema,
  risk_level, permissions, executor_key, enabled, published
) values (
  null,
  'echo',
  'Returns structured input. Safe development tool used to verify the runtime.',
  '1.0.0',
  '{"type":"object"}'::jsonb,
  '{"type":"object"}'::jsonb,
  'low',
  array['tool:echo'],
  'builtin:echo',
  true,
  false
)
on conflict (organization_id, name, version) do nothing;
