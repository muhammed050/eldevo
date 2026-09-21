-- Prevent published marketplace tools from exposing private runtime columns through public.tools.
-- Cross-tenant discovery must go through the deliberately narrow catalog view only.

drop policy if exists "authenticated can discover published tools" on public.tools;

-- The catalog view intentionally runs with the view owner's table privileges so callers can
-- discover published tools without receiving SELECT access to the underlying row (which also
-- contains config, secret_refs and executor_key). Keep the projection explicit and security-barriered.
create or replace view public.tool_marketplace_catalog
with (security_invoker = false, security_barrier = true)
as
select
  t.id, t.organization_id, t.name, t.description, t.version,
  t.input_schema, t.output_schema, t.risk_level, t.permissions, t.scopes,
  t.marketplace_slug, t.marketplace_summary, t.marketplace_category,
  t.marketplace_tags, t.published_at
from public.tools t
where t.published = true and t.enabled = true;

revoke all on public.tool_marketplace_catalog from public, anon;
grant select on public.tool_marketplace_catalog to authenticated;

comment on view public.tool_marketplace_catalog is
  'Safe marketplace projection. Never add executor_key, config, secret_refs, or other runtime-private columns.';
