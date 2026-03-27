-- Phase 1 hardening for campaigns RLS.

create index if not exists idx_campaigns_operation_id
  on public.campaigns (operation_id);

create index if not exists idx_campaigns_operation_prefix
  on public.campaigns (operation_id, prefix);

drop policy if exists "campaigns select scoped" on public.campaigns;
drop policy if exists "campaigns write admin scoped" on public.campaigns;
drop policy if exists "campaigns_select" on public.campaigns;
drop policy if exists "campaigns_write" on public.campaigns;

create policy "campaigns select scoped"
on public.campaigns
for select
to authenticated
using (
  public.can_see_all_operations()
  or (
    public.current_operation_id() is not null
    and operation_id = public.current_operation_id()
    and (
      public.is_operation_admin()
      or public.is_operation_agent()
    )
  )
);

create policy "campaigns write admin scoped"
on public.campaigns
for all
to authenticated
using (
  public.can_see_all_operations()
  or (
    public.current_operation_id() is not null
    and operation_id = public.current_operation_id()
    and public.is_operation_admin()
  )
)
with check (
  public.can_see_all_operations()
  or (
    public.current_operation_id() is not null
    and operation_id = public.current_operation_id()
    and public.is_operation_admin()
  )
);
