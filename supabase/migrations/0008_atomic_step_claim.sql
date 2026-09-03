-- Prevent concurrent workers from executing the same task step.
create or replace function public.claim_task_step(p_task_id uuid, p_step_index integer)
returns boolean
language plpgsql
security invoker
as $$
declare
  claimed boolean;
begin
  update public.task_steps
     set status = 'running',
         started_at = coalesce(started_at, now()),
         error = null
   where task_id = p_task_id
     and step_index = p_step_index
     and status = 'pending';
  get diagnostics claimed = row_count;
  return claimed;
end;
$$;
