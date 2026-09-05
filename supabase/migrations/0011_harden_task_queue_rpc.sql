create or replace function public.enqueue_task(p_task_id uuid, p_organization_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_task_org uuid;
begin
  if auth.role() <> 'service_role' then
    if auth.uid() is null or not exists (
      select 1 from public.memberships
      where organization_id = p_organization_id
        and user_id = auth.uid()
    ) then
      raise exception 'not authorized';
    end if;
  end if;

  select organization_id into v_task_org
  from public.tasks
  where id = p_task_id;

  if v_task_org is null or v_task_org <> p_organization_id then
    raise exception 'task organization mismatch';
  end if;

  insert into public.task_queue (task_id, organization_id)
  values (p_task_id, p_organization_id)
  on conflict (task_id) do update
    set available_at = least(public.task_queue.available_at, now())
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.claim_task_queue_item(p_worker_id text)
returns setof public.task_queue
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'worker authorization required';
  end if;

  return query
  with candidate as (
    select id
    from public.task_queue
    where (status = 'queued' and available_at <= now())
       or (status = 'processing' and locked_at < now() - interval '10 minutes')
    order by available_at, created_at
    for update skip locked
    limit 1
  )
  update public.task_queue q
     set status = 'processing',
         attempts = q.attempts + 1,
         locked_at = now(),
         locked_by = p_worker_id
    from candidate c
   where q.id = c.id
  returning q.*;
end;
$$;

create or replace function public.finish_task_queue_item(
  p_queue_id uuid,
  p_worker_id text,
  p_success boolean,
  p_error text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempts integer;
  v_max integer;
begin
  if auth.role() <> 'service_role' then
    raise exception 'worker authorization required';
  end if;

  select attempts, max_attempts
    into v_attempts, v_max
  from public.task_queue
  where id = p_queue_id
    and status = 'processing'
    and locked_by = p_worker_id
  for update;

  if not found then
    raise exception 'queue item is not owned by worker';
  end if;

  if p_success then
    update public.task_queue
       set status = 'completed',
           completed_at = now(),
           locked_at = null,
           locked_by = null,
           last_error = null
     where id = p_queue_id;
  elsif v_attempts >= v_max then
    update public.task_queue
       set status = 'dead_letter',
           last_error = p_error,
           locked_at = null,
           locked_by = null
     where id = p_queue_id;
  else
    update public.task_queue
       set status = 'queued',
           available_at = now() + make_interval(secs => least(300, power(2, v_attempts)::integer)),
           last_error = p_error,
           locked_at = null,
           locked_by = null
     where id = p_queue_id;
  end if;
end;
$$;

revoke all on function public.enqueue_task(uuid, uuid) from public;
revoke all on function public.claim_task_queue_item(text) from public;
revoke all on function public.finish_task_queue_item(uuid, boolean, text) from public;
grant execute on function public.enqueue_task(uuid, uuid) to authenticated, service_role;
grant execute on function public.claim_task_queue_item(text) to service_role;
grant execute on function public.finish_task_queue_item(uuid, text, boolean, text) to service_role;
