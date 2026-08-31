alter table public.tasks add column if not exists idempotency_key text;
alter table public.tasks add column if not exists cancel_requested boolean not null default false;
alter table public.tasks add column if not exists attempt integer not null default 0;
alter table public.tasks add column if not exists max_attempts integer not null default 3;
alter table public.tasks add column if not exists timeout_seconds integer not null default 300;
alter table public.task_steps add column if not exists attempt integer not null default 0;
alter table public.task_steps add column if not exists max_attempts integer not null default 3;
alter table public.task_steps add column if not exists timeout_seconds integer not null default 300;
alter table public.task_steps add column if not exists started_at timestamptz;
create unique index if not exists tasks_org_idempotency_idx on public.tasks(organization_id, idempotency_key) where idempotency_key is not null;
create index if not exists tasks_running_idx on public.tasks(status, created_at) where status in ('pending','running','waiting_approval');

create or replace function public.claim_task(p_task_id uuid, p_attempt integer)
returns boolean language plpgsql security invoker as $$
declare claimed boolean;
begin
  update public.tasks set status='running', attempt=p_attempt, started_at=coalesce(started_at, now())
  where id=p_task_id and status='pending' and attempt < max_attempts and cancel_requested=false;
  get diagnostics claimed = row_count;
  return claimed;
end;
$$;

create or replace function public.request_task_cancel(p_task_id uuid)
returns boolean language plpgsql security invoker as $$
declare changed boolean;
begin
  update public.tasks set cancel_requested=true
  where id=p_task_id and status in ('pending','running','waiting_approval');
  get diagnostics changed = row_count;
  return changed;
end;
$$;

create or replace function public.complete_task_if_active(p_task_id uuid, p_output jsonb, p_input_tokens integer, p_output_tokens integer, p_cost_cents integer)
returns boolean language plpgsql security invoker as $$
declare changed boolean;
begin
  update public.tasks set status='completed', output=p_output, input_tokens=p_input_tokens, output_tokens=p_output_tokens, cost_cents=p_cost_cents, completed_at=now()
  where id=p_task_id and status='running' and cancel_requested=false;
  get diagnostics changed = row_count;
  return changed;
end;
$$;
