alter table public.campaigns
  add column if not exists deletion_requested_at timestamptz,
  add column if not exists deletion_available_at timestamptz,
  add column if not exists deletion_requested_by uuid references public.agents(id),
  add column if not exists deletion_reason text;

alter table public.clients
  add column if not exists quarantined_until timestamptz,
  add column if not exists quarantine_reason text;

create index if not exists idx_campaigns_deletion_available_at
  on public.campaigns (operation_id, deletion_available_at)
  where deletion_available_at is not null;

create index if not exists idx_clients_quarantined_until
  on public.clients (operation_id, quarantined_until)
  where quarantined_until is not null;
