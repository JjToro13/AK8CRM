-- Run this manually in production before or alongside the app rollout.
-- Concurrent index creation avoids write locks that would be risky on a live project.

create extension if not exists pg_trgm with schema public;

create index concurrently if not exists idx_calls_operation_start_time
  on public.calls using btree (operation_id, start_time desc)
  where operation_id is not null;

create index concurrently if not exists idx_calls_agent_start_time
  on public.calls using btree (agent_id, start_time desc);

create index concurrently if not exists idx_clients_assigned_operation_created
  on public.clients using btree (assigned_to, operation_id, created_at desc)
  where assigned_to is not null;

create index concurrently if not exists idx_clients_first_name_trgm
  on public.clients using gin (first_name gin_trgm_ops)
  where first_name is not null;

create index concurrently if not exists idx_clients_last_name_trgm
  on public.clients using gin (last_name gin_trgm_ops)
  where last_name is not null;

create index concurrently if not exists idx_clients_email_trgm
  on public.clients using gin (email gin_trgm_ops)
  where email is not null;

create index concurrently if not exists idx_clients_source_trgm
  on public.clients using gin (source gin_trgm_ops)
  where source is not null;

create index concurrently if not exists idx_clients_serial_trgm
  on public.clients using gin (serial gin_trgm_ops);

analyze public.calls;
analyze public.clients;
