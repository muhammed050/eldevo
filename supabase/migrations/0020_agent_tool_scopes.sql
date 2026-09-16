-- Persist agent capability scopes used by the runtime policy layer.
-- Existing agents remain least-privileged: no scopes are granted implicitly.

alter table public.agents
  add column if not exists scopes text[] not null default '{}';

comment on column public.agents.scopes is
  'Explicit tool capability scopes granted to this agent. Empty means no scoped capabilities.';
