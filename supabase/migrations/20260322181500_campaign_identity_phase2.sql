-- Phase 2: move active campaign operations from prefix/serial inference to campaign_id.
-- This keeps serial as a stable operational identifier, but campaign ownership and stats
-- are now driven by clients.campaign_id.

create or replace function public.get_campaign_stats_v2(
  p_operation_id uuid default null
)
returns table (
  campaign_id uuid,
  prefix text,
  total_clients bigint,
  assigned_clients bigint,
  available_clients bigint,
  min_serial text,
  max_serial text
)
language sql
stable
security definer
set search_path = public
as $function$
  select
    ca.id as campaign_id,
    ca.prefix,
    count(cl.id) as total_clients,
    count(cl.id) filter (where cl.assigned_to is not null) as assigned_clients,
    count(cl.id) filter (where cl.assigned_to is null) as available_clients,
    min(cl.serial)::text as min_serial,
    max(cl.serial)::text as max_serial
  from public.campaigns ca
  left join public.clients cl
    on cl.campaign_id = ca.id
  where (
    p_operation_id is null
    or ca.operation_id = p_operation_id
  )
  group by ca.id, ca.prefix
  order by ca.prefix;
$function$;

create or replace function public.get_available_campaigns_v2(
  p_operation_id uuid default null
)
returns table (
  campaign_id uuid,
  prefix text,
  display_name text,
  available bigint
)
language sql
stable
security definer
set search_path = public
as $function$
  select
    ca.id as campaign_id,
    ca.prefix,
    ca.display_name,
    count(cl.id) filter (where cl.assigned_to is null) as available
  from public.campaigns ca
  left join public.clients cl
    on cl.campaign_id = ca.id
  where (
    p_operation_id is null
    or ca.operation_id = p_operation_id
  )
  group by ca.id, ca.prefix, ca.display_name
  order by ca.prefix;
$function$;

create or replace function public.assign_leads_atomic_v2(
  p_agent_id uuid,
  p_count integer,
  p_assigned_by uuid,
  p_campaign_id uuid default null,
  p_campaign_prefix text default null
)
returns table(assigned_count integer)
language plpgsql
set search_path = public
as $function$
declare
  v_count int := 0;
  v_operation_id uuid;
  v_target_campaign_id uuid;
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

  if p_campaign_id is not null then
    select c.id
      into v_target_campaign_id
    from public.campaigns c
    where c.id = p_campaign_id
      and c.operation_id = v_operation_id;

    if v_target_campaign_id is null then
      raise exception 'Target campaign is not visible in the current operation';
    end if;
  elsif p_campaign_prefix is not null then
    select c.id
      into v_target_campaign_id
    from public.campaigns c
    where c.operation_id = v_operation_id
      and c.prefix = p_campaign_prefix
    limit 1;
  end if;

  with picked as (
    select c.id
    from public.clients c
    where c.operation_id = v_operation_id
      and c.assigned_to is null
      and (c.status = 'new' or c.status is null)
      and (
        v_target_campaign_id is null
        or c.campaign_id = v_target_campaign_id
      )
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

create or replace function public.move_clients_to_campaign(
  p_client_ids uuid[],
  p_target_campaign_id uuid,
  p_reason text default null,
  p_notes text default null
)
returns table(moved_count integer)
language plpgsql
security definer
set search_path = public
set row_security = off
as $function$
declare
  v_target_operation_id uuid;
  v_target_tenant_id uuid;
  v_count integer := 0;
begin
  if not (public.can_see_all_operations() or public.is_operation_admin()) then
    raise exception 'not allowed';
  end if;

  if p_target_campaign_id is null then
    raise exception 'target campaign is required';
  end if;

  select c.operation_id, c.tenant_id
    into v_target_operation_id, v_target_tenant_id
  from public.campaigns c
  where c.id = p_target_campaign_id;

  if v_target_operation_id is null then
    raise exception 'target campaign not found';
  end if;

  if not public.can_see_all_operations()
     and v_target_operation_id <> public.current_operation_id() then
    raise exception 'target campaign is outside current operation';
  end if;

  with candidates as (
    select c.id, c.campaign_id as from_campaign_id
    from public.clients c
    where c.id = any(coalesce(p_client_ids, '{}'::uuid[]))
      and c.operation_id = v_target_operation_id
      and c.campaign_id is distinct from p_target_campaign_id
  ),
  updated as (
    update public.clients c
       set campaign_id = p_target_campaign_id,
           tenant_id = v_target_tenant_id,
           updated_at = now()
      from candidates x
     where c.id = x.id
    returning c.id, x.from_campaign_id
  ),
  logged as (
    insert into public.client_campaign_movements (
      client_id,
      from_campaign_id,
      to_campaign_id,
      reason,
      notes,
      moved_by
    )
    select
      u.id,
      u.from_campaign_id,
      p_target_campaign_id,
      p_reason,
      p_notes,
      auth.uid()
    from updated u
    returning 1
  )
  select count(*)
    into v_count
  from logged;

  return query select coalesce(v_count, 0);
end;
$function$;

create or replace function public.move_campaign_clients_by_status(
  p_source_campaign_id uuid,
  p_target_campaign_id uuid,
  p_status_codes text[] default null,
  p_reason text default null,
  p_notes text default null
)
returns table(moved_count integer)
language plpgsql
security definer
set search_path = public
set row_security = off
as $function$
declare
  v_source_operation_id uuid;
  v_target_operation_id uuid;
  v_target_tenant_id uuid;
  v_count integer := 0;
begin
  if not (public.can_see_all_operations() or public.is_operation_admin()) then
    raise exception 'not allowed';
  end if;

  if p_source_campaign_id is null or p_target_campaign_id is null then
    raise exception 'source and target campaigns are required';
  end if;

  select c.operation_id
    into v_source_operation_id
  from public.campaigns c
  where c.id = p_source_campaign_id;

  select c.operation_id, c.tenant_id
    into v_target_operation_id, v_target_tenant_id
  from public.campaigns c
  where c.id = p_target_campaign_id;

  if v_source_operation_id is null or v_target_operation_id is null then
    raise exception 'source or target campaign not found';
  end if;

  if v_source_operation_id <> v_target_operation_id then
    raise exception 'source and target campaigns must belong to the same operation';
  end if;

  if not public.can_see_all_operations()
     and v_target_operation_id <> public.current_operation_id() then
    raise exception 'campaigns are outside current operation';
  end if;

  with candidates as (
    select c.id, c.campaign_id as from_campaign_id
    from public.clients c
    where c.campaign_id = p_source_campaign_id
      and c.operation_id = v_target_operation_id
      and (
        p_status_codes is null
        or c.status_code = any(p_status_codes)
      )
      and c.campaign_id is distinct from p_target_campaign_id
  ),
  updated as (
    update public.clients c
       set campaign_id = p_target_campaign_id,
           tenant_id = v_target_tenant_id,
           updated_at = now()
      from candidates x
     where c.id = x.id
    returning c.id, x.from_campaign_id
  ),
  logged as (
    insert into public.client_campaign_movements (
      client_id,
      from_campaign_id,
      to_campaign_id,
      reason,
      notes,
      moved_by
    )
    select
      u.id,
      u.from_campaign_id,
      p_target_campaign_id,
      coalesce(p_reason, 'status move'),
      p_notes,
      auth.uid()
    from updated u
    returning 1
  )
  select count(*)
    into v_count
  from logged;

  return query select coalesce(v_count, 0);
end;
$function$;

revoke all on function public.get_campaign_stats_v2(uuid) from public;
revoke all on function public.get_campaign_stats_v2(uuid) from anon;
grant execute on function public.get_campaign_stats_v2(uuid) to authenticated;
grant execute on function public.get_campaign_stats_v2(uuid) to service_role;

revoke all on function public.get_available_campaigns_v2(uuid) from public;
revoke all on function public.get_available_campaigns_v2(uuid) from anon;
grant execute on function public.get_available_campaigns_v2(uuid) to authenticated;
grant execute on function public.get_available_campaigns_v2(uuid) to service_role;

revoke all on function public.assign_leads_atomic_v2(uuid, integer, uuid, uuid, text) from public;
revoke all on function public.assign_leads_atomic_v2(uuid, integer, uuid, uuid, text) from anon;
grant execute on function public.assign_leads_atomic_v2(uuid, integer, uuid, uuid, text) to authenticated;
grant execute on function public.assign_leads_atomic_v2(uuid, integer, uuid, uuid, text) to service_role;

revoke all on function public.move_clients_to_campaign(uuid[], uuid, text, text) from public;
revoke all on function public.move_clients_to_campaign(uuid[], uuid, text, text) from anon;
grant execute on function public.move_clients_to_campaign(uuid[], uuid, text, text) to authenticated;
grant execute on function public.move_clients_to_campaign(uuid[], uuid, text, text) to service_role;

revoke all on function public.move_campaign_clients_by_status(uuid, uuid, text[], text, text) from public;
revoke all on function public.move_campaign_clients_by_status(uuid, uuid, text[], text, text) from anon;
grant execute on function public.move_campaign_clients_by_status(uuid, uuid, text[], text, text) to authenticated;
grant execute on function public.move_campaign_clients_by_status(uuid, uuid, text[], text, text) to service_role;
