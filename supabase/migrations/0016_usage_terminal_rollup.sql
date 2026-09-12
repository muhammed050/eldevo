-- Ensure terminal task rows always reflect the immutable usage ledger.
-- This prevents runtime-local counters from overwriting historical usage after resume/retry.

create or replace function public.sync_terminal_task_usage()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_input bigint;
  v_output bigint;
  v_microcents bigint;
begin
  if new.status not in ('completed', 'failed', 'cancelled') then
    return new;
  end if;

  select
    coalesce(sum(input_tokens), 0),
    coalesce(sum(output_tokens), 0),
    coalesce(sum(cost_microcents), 0)
  into v_input, v_output, v_microcents
  from public.task_step_usage
  where task_id = new.id and organization_id = new.organization_id;

  update public.tasks
  set input_tokens = least(v_input, 2147483647)::integer,
      output_tokens = least(v_output, 2147483647)::integer,
      cost_microcents = v_microcents,
      cost_cents = least(ceil(v_microcents::numeric / 1000000), 2147483647)::integer
  where id = new.id;

  return new;
end;
$$;

drop trigger if exists sync_terminal_task_usage_trigger on public.tasks;
create trigger sync_terminal_task_usage_trigger
after update of status on public.tasks
for each row
when (
  new.status in ('completed', 'failed', 'cancelled')
  and old.status is distinct from new.status
)
execute function public.sync_terminal_task_usage();
