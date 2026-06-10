-- Calendar module foundation.
-- Creates a real scheduled_calls table tied to tenant, operation, client, campaign and agent.
-- This is the base for weekly agenda, follow-up scheduling and later call-planning workflows.

create table if not exists public.scheduled_calls (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  operation_id uuid not null references public.operations(id) on delete restrict,
  campaign_id uuid references public.campaigns(id) on delete restrict,
  client_id uuid not null references public.clients(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete restrict,
  title text,
  notes text,
  outcome_notes text,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'attended', 'postponed', 'missed')),
  scheduled_for timestamptz not null,
  attended_at timestamptz,
  created_by uuid references public.agents(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_scheduled_calls_operation_scheduled_for
  on public.scheduled_calls (operation_id, scheduled_for);

create index if not exists idx_scheduled_calls_agent_scheduled_for
  on public.scheduled_calls (agent_id, scheduled_for);

create index if not exists idx_scheduled_calls_client_id
  on public.scheduled_calls (client_id);

create index if not exists idx_scheduled_calls_campaign_id
  on public.scheduled_calls (campaign_id);

create index if not exists idx_scheduled_calls_status
  on public.scheduled_calls (status);

create or replace function public.sync_scheduled_call_context()
returns trigger
language plpgsql
set search_path = public
as $function$
declare
  v_client_tenant_id uuid;
  v_client_operation_id uuid;
  v_client_campaign_id uuid;
  v_agent_operation_id uuid;
  v_agent_is_active boolean;
  v_campaign_tenant_id uuid;
  v_campaign_operation_id uuid;
begin
  select
    c.tenant_id,
    c.operation_id,
    c.campaign_id
  into
    v_client_tenant_id,
    v_client_operation_id,
    v_client_campaign_id
  from public.clients c
  where c.id = new.client_id;

  if v_client_operation_id is null then
    raise exception 'client not found or missing operation context';
  end if;

  select
    a.operation_id,
    a.is_active
  into
    v_agent_operation_id,
    v_agent_is_active
  from public.agents a
  where a.id = new.agent_id;

  if v_agent_operation_id is null then
    raise exception 'agent not found';
  end if;

  if coalesce(v_agent_is_active, false) = false then
    raise exception 'agent is not active';
  end if;

  if v_agent_operation_id <> v_client_operation_id then
    raise exception 'agent and client must belong to the same operation';
  end if;

  if new.campaign_id is null then
    new.campaign_id := v_client_campaign_id;
  end if;

  if new.campaign_id is not null then
    select
      ca.tenant_id,
      ca.operation_id
    into
      v_campaign_tenant_id,
      v_campaign_operation_id
    from public.campaigns ca
    where ca.id = new.campaign_id;

    if v_campaign_operation_id is null then
      raise exception 'campaign not found';
    end if;

    if v_campaign_operation_id <> v_client_operation_id
       or v_campaign_tenant_id <> v_client_tenant_id then
      raise exception 'campaign context does not match client context';
    end if;
  end if;

  new.tenant_id := v_client_tenant_id;
  new.operation_id := v_client_operation_id;
  new.updated_at := now();

  if tg_op = 'INSERT' then
    new.created_by := coalesce(new.created_by, auth.uid());
    new.created_at := coalesce(new.created_at, now());
  end if;

  if new.status = 'attended' and new.attended_at is null then
    new.attended_at := now();
  elsif new.status <> 'attended' then
    new.attended_at := null;
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_sync_scheduled_call_context on public.scheduled_calls;

create trigger trg_sync_scheduled_call_context
before insert or update on public.scheduled_calls
for each row
execute function public.sync_scheduled_call_context();

alter table public.scheduled_calls enable row level security;

drop policy if exists "scheduled_calls select scoped" on public.scheduled_calls;
create policy "scheduled_calls select scoped"
on public.scheduled_calls
for select
to authenticated
using (
  public.can_see_all_operations()
  or (
    public.current_operation_id() is not null
    and operation_id = public.current_operation_id()
    and (
      public.is_operation_admin()
      or (
        public.is_operation_agent()
        and agent_id = auth.uid()
      )
    )
  )
);

drop policy if exists "scheduled_calls write scoped" on public.scheduled_calls;
create policy "scheduled_calls write scoped"
on public.scheduled_calls
for all
to authenticated
using (
  public.can_see_all_operations()
  or (
    public.current_operation_id() is not null
    and operation_id = public.current_operation_id()
    and (
      public.is_operation_admin()
      or (
        public.is_operation_agent()
        and agent_id = auth.uid()
      )
    )
  )
)
with check (
  public.can_see_all_operations()
  or (
    public.current_operation_id() is not null
    and operation_id = public.current_operation_id()
    and (
      public.is_operation_admin()
      or (
        public.is_operation_agent()
        and agent_id = auth.uid()
      )
    )
  )
);

grant select, insert, update, delete on public.scheduled_calls to authenticated;
grant select, insert, update, delete on public.scheduled_calls to service_role;
