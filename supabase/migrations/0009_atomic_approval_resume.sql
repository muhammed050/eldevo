-- Atomically resume a task and reset only its approval-blocked steps.
-- This prevents a task from becoming runnable while its waiting step remains blocked.
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

  if resumed then
    update public.task_steps
       set status = 'pending',
           error = null,
           completed_at = null
     where task_id = p_task_id
       and status = 'waiting_approval';
  end if;

  return resumed;
end;
$$;
