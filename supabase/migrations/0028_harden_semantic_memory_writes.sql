-- Semantic memory is runtime-authoritative. Organization members may read memories
-- through RLS, but browser sessions must not be able to poison an agent's memory.
revoke execute on function public.upsert_agent_semantic_memory(uuid,uuid,text,text,text,real,smallint,uuid,jsonb)
  from public, anon, authenticated;
grant execute on function public.upsert_agent_semantic_memory(uuid,uuid,text,text,text,real,smallint,uuid,jsonb)
  to service_role;

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
  if auth.role() <> 'service_role' then
    raise exception 'service role required';
  end if;
  if not exists (select 1 from public.organizations o where o.id = p_organization_id) then
    raise exception 'organization not found';
  end if;
  if not exists (select 1 from public.agents a where a.id = p_agent_id and a.organization_id = p_organization_id) then
    raise exception 'agent does not belong to organization';
  end if;
  if p_source_task_id is not null and not exists (
    select 1 from public.tasks t
    where t.id = p_source_task_id
      and t.organization_id = p_organization_id
      and t.agent_id = p_agent_id
  ) then
    raise exception 'source task does not belong to agent and organization';
  end if;
  if p_memory_key is null or length(trim(p_memory_key)) < 1 or length(p_memory_key) > 200 then
    raise exception 'invalid memory key';
  end if;
  if p_content is null or length(trim(p_content)) < 1 or length(p_content) > 20000 then
    raise exception 'invalid memory content';
  end if;
  if p_category is null or p_category not in ('fact','preference','procedure','concept') then
    raise exception 'invalid memory category';
  end if;
  if p_confidence is null or p_confidence < 0 or p_confidence > 1 then
    raise exception 'invalid confidence';
  end if;
  if p_importance is null or p_importance < 0 or p_importance > 100 then
    raise exception 'invalid importance';
  end if;

  insert into public.agent_semantic_memories (
    organization_id, agent_id, memory_key, content, category, confidence,
    importance, source_task_id, metadata
  ) values (
    p_organization_id, p_agent_id, trim(p_memory_key), trim(p_content), p_category,
    p_confidence, p_importance, p_source_task_id, coalesce(p_metadata, '{}'::jsonb)
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

-- CREATE OR REPLACE does not reset ACLs, but repeat the grants so the final
-- migration state is explicit and resilient to earlier grants.
revoke execute on function public.upsert_agent_semantic_memory(uuid,uuid,text,text,text,real,smallint,uuid,jsonb)
  from public, anon, authenticated;
grant execute on function public.upsert_agent_semantic_memory(uuid,uuid,text,text,text,real,smallint,uuid,jsonb)
  to service_role;
