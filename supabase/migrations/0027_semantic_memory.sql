create table if not exists public.agent_semantic_memories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete cascade,
  memory_key text not null,
  content text not null,
  category text not null default 'fact' check (category in ('fact','preference','procedure','concept')),
  confidence real not null default 1 check (confidence >= 0 and confidence <= 1),
  importance smallint not null default 50 check (importance between 0 and 100),
  source_task_id uuid references public.tasks(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  last_accessed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, agent_id, memory_key),
  check (length(memory_key) between 1 and 200),
  check (length(content) between 1 and 20000)
);

create index if not exists agent_semantic_memories_lookup_idx
  on public.agent_semantic_memories (organization_id, agent_id, importance desc, updated_at desc);
create index if not exists agent_semantic_memories_category_idx
  on public.agent_semantic_memories (organization_id, agent_id, category);

alter table public.agent_semantic_memories enable row level security;

create policy "members can read agent semantic memories"
  on public.agent_semantic_memories for select to authenticated
  using (public.is_org_member(organization_id));

grant select on public.agent_semantic_memories to authenticated;
revoke insert, update, delete on public.agent_semantic_memories from authenticated, anon;

create or replace function public.upsert_agent_semantic_memory(
  p_organization_id uuid,
  p_agent_id uuid,
  p_memory_key text,
  p_content text,
  p_category text default 'fact',
  p_confidence real default 1,
  p_importance smallint default 50,
  p_source_task_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.is_org_member(p_organization_id) and auth.role() <> 'service_role' then
    raise exception 'organization access denied';
  end if;
  if not exists (select 1 from public.agents a where a.id = p_agent_id and a.organization_id = p_organization_id) then
    raise exception 'agent does not belong to organization';
  end if;
  if p_source_task_id is not null and not exists (
    select 1 from public.tasks t where t.id = p_source_task_id and t.organization_id = p_organization_id and t.agent_id = p_agent_id
  ) then
    raise exception 'source task does not belong to agent and organization';
  end if;
  if length(trim(p_memory_key)) < 1 or length(p_memory_key) > 200 then raise exception 'invalid memory key'; end if;
  if length(trim(p_content)) < 1 or length(p_content) > 20000 then raise exception 'invalid memory content'; end if;
  if p_category not in ('fact','preference','procedure','concept') then raise exception 'invalid memory category'; end if;
  if p_confidence < 0 or p_confidence > 1 then raise exception 'invalid confidence'; end if;
  if p_importance < 0 or p_importance > 100 then raise exception 'invalid importance'; end if;

  insert into public.agent_semantic_memories (
    organization_id, agent_id, memory_key, content, category, confidence, importance, source_task_id, metadata
  ) values (
    p_organization_id, p_agent_id, trim(p_memory_key), trim(p_content), p_category, p_confidence, p_importance, p_source_task_id, coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (organization_id, agent_id, memory_key) do update set
    content = excluded.content,
    category = excluded.category,
    confidence = excluded.confidence,
    importance = excluded.importance,
    source_task_id = excluded.source_task_id,
    metadata = excluded.metadata,
    updated_at = now()
  returning id into v_id;
  return v_id;
end;
$$;

grant execute on function public.upsert_agent_semantic_memory(uuid,uuid,text,text,text,real,smallint,uuid,jsonb) to authenticated, service_role;
