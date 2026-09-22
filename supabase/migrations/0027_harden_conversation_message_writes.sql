create or replace function public.append_conversation_message(
  p_conversation_id uuid,
  p_organization_id uuid,
  p_role text,
  p_content jsonb,
  p_task_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_role text := auth.role();
begin
  if v_role not in ('authenticated', 'service_role') then
    raise exception 'not authorized';
  end if;

  if p_role not in ('user','assistant','system','tool') then
    raise exception 'invalid role';
  end if;

  if p_content is null or p_content = 'null'::jsonb then
    raise exception 'content required';
  end if;

  if v_role = 'authenticated' then
    if not public.is_org_member(p_organization_id) then
      raise exception 'not authorized';
    end if;
    if p_role <> 'user' then
      raise exception 'privileged conversation role requires service role';
    end if;
    if p_task_id is not null then
      raise exception 'task-linked messages require service role';
    end if;
  end if;

  if not exists (
    select 1 from public.conversations
    where id = p_conversation_id and organization_id = p_organization_id
  ) then
    raise exception 'conversation not found';
  end if;

  if p_task_id is not null and not exists (
    select 1 from public.tasks
    where id = p_task_id and organization_id = p_organization_id
  ) then
    raise exception 'invalid task';
  end if;

  insert into public.conversation_messages (
    conversation_id, organization_id, task_id, role, content, created_by
  ) values (
    p_conversation_id, p_organization_id, p_task_id, p_role, p_content,
    case when v_role = 'service_role' then null else auth.uid() end
  ) returning id into v_id;

  update public.conversations
  set updated_at = now()
  where id = p_conversation_id and organization_id = p_organization_id;

  return v_id;
end;
$$;

revoke all on function public.append_conversation_message(uuid, uuid, text, jsonb, uuid) from public, anon;
grant execute on function public.append_conversation_message(uuid, uuid, text, jsonb, uuid) to authenticated, service_role;
