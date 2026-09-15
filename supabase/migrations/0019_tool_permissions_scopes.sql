-- Fine-grained permission scopes for database-backed tools.
-- Permissions answer "may this agent use the capability?" while scopes constrain
-- what the capability may act on (for example crm:read vs crm:write).

alter table public.tools
  add column if not exists scopes text[] not null default '{}'::text[];

create index if not exists tools_permissions_gin_idx
  on public.tools using gin (permissions);

create index if not exists tools_scopes_gin_idx
  on public.tools using gin (scopes);

-- Keep the built-in echo tool explicitly scope-free. Existing tools default to no
-- additional scopes, preserving backwards compatibility until scopes are assigned.
update public.tools
set scopes = '{}'::text[]
where name = 'echo' and executor_key = 'builtin:echo' and scopes is null;
