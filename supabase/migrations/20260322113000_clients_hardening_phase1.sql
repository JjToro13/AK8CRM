-- Phase 1 hardening for clients scope in production.
-- Goals:
-- 1. Remove legacy overlapping policies on public.clients.
-- 2. Keep a single coherent scoped policy set.
-- 3. Scope client-adjacent functions to the active operation.
-- 4. Remove anonymous execute access from sensitive functions.

alter table public.clients enable row level security;

-- Remove legacy and overlapping policies before recreating the canonical set.
drop policy if exists "clients delete admin scoped" on public.clients;
drop policy if exists "clients insert admin scoped" on public.clients;
drop policy if exists "clients select scoped" on public.clients;
drop policy if exists "clients update scoped" on public.clients;
drop policy if exists "clients_select" on public.clients;
drop policy if exists "clients_select_assigned_agent" on public.clients;
drop policy if exists "clients_update_admin_like" on public.clients;
drop policy if exists "clients_update_assigned_agent" on public.clients;
drop policy if exists "clients_write" on public.clients;

create policy "clients select scoped"
on public.clients
for select
to authenticated
using (
  can_see_all_operations()
  or (
    current_operation_id() is not null
    and operation_id = current_operation_id()
    and (
      is_operation_admin()
      or (
        is_operation_agent()
        and (
          assigned_to = auth.uid()
          or exists (
            select 1
            from public.agent_assignments aa
            where aa.agent_id = auth.uid()
              and aa.is_active = true
              and aa.operation_id = current_operation_id()
              and clients.serial::text >= aa.client_serial_start::text
              and clients.serial::text <= aa.client_serial_end::text
          )
        )
      )
    )
  )
);

create policy "clients insert admin scoped"
on public.clients
for insert
to authenticated
with check (
  can_see_all_operations()
  or (
    is_operation_admin()
    and current_operation_id() is not null
    and operation_id = current_operation_id()
  )
);

create policy "clients update scoped"
on public.clients
for update
to authenticated
using (
  can_see_all_operations()
  or (
    current_operation_id() is not null
    and operation_id = current_operation_id()
    and (
      is_operation_admin()
      or (
        is_operation_agent()
        and (
          assigned_to = auth.uid()
          or exists (
            select 1
            from public.agent_assignments aa
            where aa.agent_id = auth.uid()
              and aa.is_active = true
              and aa.operation_id = current_operation_id()
              and clients.serial::text >= aa.client_serial_start::text
              and clients.serial::text <= aa.client_serial_end::text
          )
        )
      )
    )
  )
)
with check (
  can_see_all_operations()
  or (
    current_operation_id() is not null
    and operation_id = current_operation_id()
    and (
      is_operation_admin()
      or (
        is_operation_agent()
        and (
          assigned_to = auth.uid()
          or exists (
            select 1
            from public.agent_assignments aa
            where aa.agent_id = auth.uid()
              and aa.is_active = true
              and aa.operation_id = current_operation_id()
              and clients.serial::text >= aa.client_serial_start::text
              and clients.serial::text <= aa.client_serial_end::text
          )
        )
      )
    )
  )
);

create policy "clients delete admin scoped"
on public.clients
for delete
to authenticated
using (
  can_see_all_operations()
  or (
    is_operation_admin()
    and current_operation_id() is not null
    and operation_id = current_operation_id()
  )
);

create or replace function public.assign_leads_atomic(
  p_agent_id uuid,
  p_count integer,
  p_assigned_by uuid,
  p_campaign_prefix text default null
)
returns table(assigned_count integer)
language plpgsql
set search_path = public
as $function$
declare
  v_count int := 0;
  v_operation_id uuid;
begin
  if not public.is_admin_like() then
    raise exception 'Only admin-like can assign leads';
  end if;

  v_operation_id := public.current_operation_id();

  if v_operation_id is null then
    raise exception 'No active operation selected';
  end if;

  if p_count is null or p_count <= 0 then
    return query select 0;
    return;
  end if;

  if not exists (
    select 1
    from public.agents a
    where a.id = p_agent_id
      and a.is_active = true
      and a.role = 'agent'
      and a.operation_id = v_operation_id
  ) then
    raise exception 'Target agent is not active in the current operation';
  end if;

  with picked as (
    select c.id
    from public.clients c
    where c.operation_id = v_operation_id
      and c.assigned_to is null
      and (c.status = 'new' or c.status is null)
      and (
        p_campaign_prefix is null
        or c.serial like (p_campaign_prefix || '%')
      )
    order by c.created_at asc nulls last
    for update skip locked
    limit p_count
  )
  update public.clients c
     set assigned_to = p_agent_id,
         assigned_at = now(),
         assigned_by = coalesce(auth.uid(), p_assigned_by),
         status = 'assigned'
    from picked
   where c.id = picked.id;

  get diagnostics v_count = row_count;
  return query select v_count;
end;
$function$;

create or replace function public.get_recent_calls(
  p_agent_id uuid default null
)
returns table(
  id uuid,
  client_id uuid,
  agent_id uuid,
  start_time timestamp with time zone,
  end_time timestamp with time zone,
  status character varying,
  duration integer,
  created_at timestamp with time zone,
  client_first_name character varying,
  client_serial character varying,
  client_status_color character varying,
  agent_name character varying
)
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_operation_id uuid;
begin
  v_operation_id := public.current_operation_id();

  return query
  select
    c.id,
    c.client_id,
    c.agent_id,
    c.start_time,
    c.end_time,
    c.status,
    c.duration,
    c.created_at,
    cl.first_name as client_first_name,
    cl.serial as client_serial,
    cl.status_color as client_status_color,
    a.name as agent_name
  from public.calls c
  join public.clients cl
    on cl.id = c.client_id
  join public.agents a
    on a.id = c.agent_id
  where (p_agent_id is null or c.agent_id = p_agent_id)
    and (
      (v_operation_id is not null and cl.operation_id = v_operation_id)
      or (v_operation_id is null and public.can_see_all_operations())
    )
  order by c.created_at desc
  limit 50;
end;
$function$;

revoke all on function public.assign_leads_atomic(uuid, integer, uuid, text) from anon;
grant execute on function public.assign_leads_atomic(uuid, integer, uuid, text) to authenticated;
grant execute on function public.assign_leads_atomic(uuid, integer, uuid, text) to service_role;

revoke all on function public.get_recent_calls(uuid) from anon;
grant execute on function public.get_recent_calls(uuid) to authenticated;
grant execute on function public.get_recent_calls(uuid) to service_role;

revoke all on function public.get_agent_assigned_counts() from anon;
grant execute on function public.get_agent_assigned_counts() to authenticated;
grant execute on function public.get_agent_assigned_counts() to service_role;

revoke all on function public.get_available_campaigns() from anon;
grant execute on function public.get_available_campaigns() to authenticated;
grant execute on function public.get_available_campaigns() to service_role;

revoke all on function public.get_campaign_stats() from anon;
grant execute on function public.get_campaign_stats() to authenticated;
grant execute on function public.get_campaign_stats() to service_role;
