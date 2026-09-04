create table if not exists public.task_queue (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued','processing','completed','failed','dead_letter')),
  attempts integer not null default 0,
  max_attempts integer not null default 5,
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  last_error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique(task_id)
);

create index if not exists task_queue_ready_idx
  on public.task_queue (status, available_at, created_at);

alter table public.task_queue enable row level security;

create policy task_queue_org_access on public.task_queue
  using (organization_id in (
    select organization_id from public.memberships where user_id = auth.uid()
  ));

create or replace function public.enqueue_task(p_task_id uuid, p_organization_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  insert into public.task_queue (task_id, organization_id)
  values (p_task_id, p_organization_id)
  on conflict (task_id) do update set available_at = least(public.task_queue.available_at, now())
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.claim_task_queue_item(p_worker_id text)
returns setof public.task_queue
language sql
security definer
set search_path = public
as $$
  with candidate as (
    select id from public.task_queue
    where (status = 'queued' and available_at <= now())
       or (status = 'processing' and locked_at < now() - interval '10 minutes')
    order by available_at, created_at
    for update skip locked
    limit 1
  )
  update public.task_queue q
     set status = 'processing', attempts = q.attempts + 1,
         locked_at = now(), locked_by = p_worker_id
    from candidate c
   where q.id = c.id
  returning q.*;
$$;

create or replace function public.finish_task_queue_item(p_queue_id uuid, p_success boolean, p_error text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_attempts integer; v_max integer;
begin
  select attempts, max_attempts into v_attempts, v_max from public.task_queue where id = p_queue_id for update;
  if p_success then
    update public.task_queue set status='completed', completed_at=now(), locked_at=null, locked_by=null, last_error=null where id=p_queue_id;
  elsif v_attempts >= v_max then
    update public.task_queue set status='dead_letter', last_error=p_error, locked_at=null, locked_by=null where id=p_queue_id;
  else
    update public.task_queue set status='queued', available_at=now() + make_interval(secs => least(300, power(2, v_attempts)::integer)), last_error=p_error, locked_at=null, locked_by=null where id=p_queue_id;
  end if;
end;
$$;
