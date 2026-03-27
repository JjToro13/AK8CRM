-- Phase 1: make campaigns a real entity without breaking the current app.
-- This migration is additive and compatibility-oriented:
-- - keeps campaigns.prefix as the legacy identifier used by the frontend today
-- - adds campaigns.id and tenant scoping
-- - adds clients.campaign_id so campaign ownership no longer depends on serial
-- - adds a movement log table for future campaign reassignments
-- - adds compatibility triggers so old inserts that still send serial/prefix keep working

alter table public.campaigns
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists tenant_id uuid;

update public.campaigns
set id = gen_random_uuid()
where id is null;

update public.campaigns c
set tenant_id = o.tenant_id
from public.operations o
where o.id = c.operation_id
  and c.tenant_id is null;

alter table public.campaigns
  alter column id set not null;

create unique index if not exists idx_campaigns_id
  on public.campaigns (id);

create unique index if not exists idx_campaigns_operation_prefix_unique
  on public.campaigns (operation_id, prefix);

create index if not exists idx_campaigns_tenant_operation
  on public.campaigns (tenant_id, operation_id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'campaigns_tenant_id_fkey'
  ) then
    alter table public.campaigns
      add constraint campaigns_tenant_id_fkey
      foreign key (tenant_id)
      references public.tenants(id)
      on delete restrict;
  end if;
end $$;

create or replace function public.sync_campaign_tenant_scope()
returns trigger
language plpgsql
set search_path = public
as $function$
declare
  v_tenant_id uuid;
begin
  if new.operation_id is null then
    return new;
  end if;

  select o.tenant_id
    into v_tenant_id
  from public.operations o
  where o.id = new.operation_id;

  if v_tenant_id is null then
    raise exception 'campaign operation has no tenant';
  end if;

  if new.tenant_id is null then
    new.tenant_id := v_tenant_id;
  elsif new.tenant_id <> v_tenant_id then
    raise exception 'campaign tenant does not match operation tenant';
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_campaigns_sync_tenant_scope on public.campaigns;
create trigger trg_campaigns_sync_tenant_scope
before insert or update of operation_id, tenant_id
on public.campaigns
for each row
execute function public.sync_campaign_tenant_scope();

alter table public.clients
  add column if not exists tenant_id uuid,
  add column if not exists campaign_id uuid;

update public.clients c
set tenant_id = o.tenant_id
from public.operations o
where o.id = c.operation_id
  and c.tenant_id is null;

with ranked_matches as (
  select
    c.id as client_id,
    ca.id as campaign_id,
    row_number() over (
      partition by c.id
      order by length(ca.prefix) desc, ca.created_at asc, ca.id
    ) as rn
  from public.clients c
  join public.campaigns ca
    on ca.operation_id = c.operation_id
   and c.serial like (ca.prefix || '%')
  where c.campaign_id is null
)
update public.clients c
set campaign_id = rm.campaign_id
from ranked_matches rm
where rm.client_id = c.id
  and rm.rn = 1;

create index if not exists idx_clients_tenant_id
  on public.clients (tenant_id);

create index if not exists idx_clients_campaign_id
  on public.clients (campaign_id);

create index if not exists idx_clients_operation_campaign
  on public.clients (operation_id, campaign_id);

create index if not exists idx_clients_tenant_campaign
  on public.clients (tenant_id, campaign_id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'clients_tenant_id_fkey'
  ) then
    alter table public.clients
      add constraint clients_tenant_id_fkey
      foreign key (tenant_id)
      references public.tenants(id)
      on delete restrict;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'clients_campaign_id_fkey'
  ) then
    alter table public.clients
      add constraint clients_campaign_id_fkey
      foreign key (campaign_id)
      references public.campaigns(id)
      on delete restrict;
  end if;
end $$;

create or replace function public.sync_client_campaign_scope()
returns trigger
language plpgsql
set search_path = public
as $function$
declare
  v_campaign_id uuid;
  v_campaign_operation_id uuid;
  v_campaign_tenant_id uuid;
begin
  if new.campaign_id is not null then
    select c.id, c.operation_id, c.tenant_id
      into v_campaign_id, v_campaign_operation_id, v_campaign_tenant_id
    from public.campaigns c
    where c.id = new.campaign_id;

    if v_campaign_id is null then
      raise exception 'campaign_id does not exist';
    end if;

    if new.operation_id is null then
      new.operation_id := v_campaign_operation_id;
    elsif new.operation_id <> v_campaign_operation_id then
      raise exception 'client campaign does not match operation';
    end if;

    if new.tenant_id is null then
      new.tenant_id := v_campaign_tenant_id;
    elsif new.tenant_id <> v_campaign_tenant_id then
      raise exception 'client campaign does not match tenant';
    end if;
  end if;

  if new.operation_id is not null and new.tenant_id is null then
    select o.tenant_id
      into new.tenant_id
    from public.operations o
    where o.id = new.operation_id;
  end if;

  if new.campaign_id is null
     and new.operation_id is not null
     and new.serial is not null then
    select c.id, c.tenant_id
      into v_campaign_id, v_campaign_tenant_id
    from public.campaigns c
    where c.operation_id = new.operation_id
      and new.serial like (c.prefix || '%')
    order by length(c.prefix) desc, c.created_at asc, c.id
    limit 1;

    if v_campaign_id is not null then
      new.campaign_id := v_campaign_id;
      if new.tenant_id is null then
        new.tenant_id := v_campaign_tenant_id;
      end if;
    end if;
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_clients_sync_campaign_scope on public.clients;
create trigger trg_clients_sync_campaign_scope
before insert or update of serial, operation_id, tenant_id, campaign_id
on public.clients
for each row
execute function public.sync_client_campaign_scope();

create table if not exists public.client_campaign_movements (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  from_campaign_id uuid references public.campaigns(id) on delete restrict,
  to_campaign_id uuid not null references public.campaigns(id) on delete restrict,
  reason text,
  notes text,
  moved_by uuid references public.agents(id) on delete set null,
  moved_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_client_campaign_movements_client
  on public.client_campaign_movements (client_id, moved_at desc);

create index if not exists idx_client_campaign_movements_to_campaign
  on public.client_campaign_movements (to_campaign_id, moved_at desc);

create index if not exists idx_client_campaign_movements_from_campaign
  on public.client_campaign_movements (from_campaign_id, moved_at desc);

alter table public.client_campaign_movements enable row level security;

drop policy if exists "client_campaign_movements admin scoped select" on public.client_campaign_movements;
drop policy if exists "client_campaign_movements admin scoped insert" on public.client_campaign_movements;
drop policy if exists "client_campaign_movements admin scoped update" on public.client_campaign_movements;
drop policy if exists "client_campaign_movements admin scoped delete" on public.client_campaign_movements;

create policy "client_campaign_movements admin scoped select"
on public.client_campaign_movements
for select
to authenticated
using (
  public.can_see_all_operations()
  or exists (
    select 1
    from public.clients c
    where c.id = client_campaign_movements.client_id
      and c.operation_id = public.current_operation_id()
      and public.is_operation_admin()
  )
);

create policy "client_campaign_movements admin scoped insert"
on public.client_campaign_movements
for insert
to authenticated
with check (
  public.can_see_all_operations()
  or exists (
    select 1
    from public.clients c
    where c.id = client_campaign_movements.client_id
      and c.operation_id = public.current_operation_id()
      and public.is_operation_admin()
  )
);

create policy "client_campaign_movements admin scoped update"
on public.client_campaign_movements
for update
to authenticated
using (false)
with check (false);

create policy "client_campaign_movements admin scoped delete"
on public.client_campaign_movements
for delete
to authenticated
using (false);
