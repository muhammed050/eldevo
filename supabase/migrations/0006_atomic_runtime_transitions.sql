-- Production runtime hardening: make task claiming and approval resume transitions atomic.

create or replace function public.claim_task(p_task_id uuid, p_attempt integer default 1)
returns boolean
language plpgsql
security invoker
as $$
declare
  claimed boolean;
begin
  update public.tasks
     set status = 'running',
         attempt = greatest(attempt + 1, p_attempt),
         started_at = coalesce(started_at, now())
   where id = p_task_id
     and status = 'pending'
     and attempt < max_attempts
     and cancel_requested = false;
  get diagnostics claimed = row_count;
  return claimed;
end;
$$;

create or replace function public.resume_task_after_approval(p_task_id uuid, p_approval_id uuid)
returns boolean
language plpgsql
security invoker
as $$
declare
  resumed boolean;
begin
  update public.tasks t
     set status = 'pending',
         error = null,
         completed_at = null
    from public.approvals a
   where t.id = p_task_id
     and a.id = p_approval_id
     and a.task_id = t.id
     and a.organization_id = t.organization_id
     and a.status = 'approved'
     and t.status = 'waiting_approval'
     and t.cancel_requested = false;
  get diagnostics resumed = row_count;
  return resumed;
end;
$$;

create index if not exists approvals_task_status_idx
  on public.approvals(task_id, status, decided_at desc);
