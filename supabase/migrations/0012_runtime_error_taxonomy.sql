alter table public.tasks
  add column if not exists error_code text,
  add column if not exists error_retryable boolean not null default false;

alter table public.task_steps
  add column if not exists error_code text,
  add column if not exists error_retryable boolean not null default false;

alter table public.tasks
  drop constraint if exists tasks_error_code_check;

alter table public.task_steps
  drop constraint if exists task_steps_error_code_check;

alter table public.tasks
  add constraint tasks_error_code_check check (
    error_code is null or error_code in (
      'TASK_CANCELLED','TASK_CLAIM_FAILED','TASK_PERSISTENCE_FAILED',
      'STEP_CLAIM_FAILED','STEP_PERSISTENCE_FAILED','APPROVAL_REQUIRED',
      'APPROVAL_PERSISTENCE_FAILED','TOOL_NOT_FOUND','TOOL_DENIED',
      'MODEL_FAILURE','TIMEOUT','RETRY_EXHAUSTED','QUEUE_FAILURE',
      'UNKNOWN_RUNTIME_ERROR'
    )
  );

alter table public.task_steps
  add constraint task_steps_error_code_check check (
    error_code is null or error_code in (
      'TASK_CANCELLED','TASK_CLAIM_FAILED','TASK_PERSISTENCE_FAILED',
      'STEP_CLAIM_FAILED','STEP_PERSISTENCE_FAILED','APPROVAL_REQUIRED',
      'APPROVAL_PERSISTENCE_FAILED','TOOL_NOT_FOUND','TOOL_DENIED',
      'MODEL_FAILURE','TIMEOUT','RETRY_EXHAUSTED','QUEUE_FAILURE',
      'UNKNOWN_RUNTIME_ERROR'
    )
  );

create index if not exists tasks_error_code_idx on public.tasks (organization_id, error_code) where error_code is not null;
create index if not exists task_steps_error_code_idx on public.task_steps (task_id, error_code) where error_code is not null;
