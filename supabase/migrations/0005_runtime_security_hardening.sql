-- Runtime write hardening.
-- Keep browser clients read-only for execution artifacts; privileged runtime writes
-- should go through trusted server-side code or narrowly-scoped RPCs.

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'task_steps'
      and policyname = 'members can create task steps'
  ) then
    create policy "members can create task steps" on public.task_steps
    for insert to authenticated
    with check (
      exists (
        select 1
        from public.tasks t
        where t.id = task_id
          and public.is_org_member(t.organization_id)
      )
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'task_steps'
      and policyname = 'members can update task steps'
  ) then
    create policy "members can update task steps" on public.task_steps
    for update to authenticated
    using (
      exists (
        select 1
        from public.tasks t
        where t.id = task_id
          and public.is_org_member(t.organization_id)
      )
    )
    with check (
      exists (
        select 1
        from public.tasks t
        where t.id = task_id
          and public.is_org_member(t.organization_id)
      )
    );
  end if;
end;
$$;

-- Approval decisions are performed by the server route after role checks.
-- Remove the broad member update policy so ordinary members cannot approve,
-- reject, or mutate approval state directly through the client.
drop policy if exists "members can update approvals" on public.approvals;

-- Prevent duplicate pending approvals for the same task/action. This is a
-- database-level guard against concurrent runtime attempts.
create unique index if not exists approvals_pending_task_action_idx
on public.approvals(task_id, action)
where status = 'pending';

-- Enforce the task/organization relationship for approvals.
create or replace function public.validate_approval_task_org()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.tasks t
    where t.id = new.task_id
      and t.organization_id = new.organization_id
  ) then
    raise exception 'Approval task does not belong to approval organization';
  end if;
  return new;
end;
$$;

drop trigger if exists approvals_validate_task_org on public.approvals;
create trigger approvals_validate_task_org
before insert or update on public.approvals
for each row execute function public.validate_approval_task_org();
