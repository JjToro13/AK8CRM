-- Reassignment pool: any non-quarantined client without an agent can be
-- distributed again, even if its historical assignment status remains assigned.

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
    count(cl.id) filter (
      where cl.assigned_to is null
        and (
          cl.quarantined_until is null
          or cl.quarantined_until < now()
        )
    ) as available_clients,
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
    count(cl.id) filter (
      where cl.assigned_to is null
        and (
          cl.quarantined_until is null
          or cl.quarantined_until < now()
        )
    ) as available
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
      and (
        c.quarantined_until is null
        or c.quarantined_until < now()
      )
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

create or replace function public.assign_leads_atomic_filtered_v1(
  p_agent_id uuid,
  p_count integer,
  p_assigned_by uuid,
  p_campaign_id uuid default null,
  p_campaign_prefix text default null,
  p_status_codes text[] default null,
  p_country text default null,
  p_balance_min numeric default null,
  p_balance_max numeric default null
)
returns table(assigned_count integer)
language plpgsql
set search_path = public
as $function$
declare
  v_count integer := 0;
  v_operation_id uuid;
  v_target_campaign_id uuid;
  v_country text := nullif(trim(coalesce(p_country, '')), '');
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
      and (
        c.quarantined_until is null
        or c.quarantined_until < now()
      )
      and (
        v_target_campaign_id is null
        or c.campaign_id = v_target_campaign_id
      )
      and (
        p_campaign_prefix is null
        or c.serial like (p_campaign_prefix || '%')
      )
      and (
        p_status_codes is null
        or array_length(p_status_codes, 1) is null
        or c.status_code = any(p_status_codes)
      )
      and (
        v_country is null
        or coalesce(c.country, '') ilike ('%' || v_country || '%')
      )
      and (
        p_balance_min is null
        or c.user_balance >= p_balance_min
      )
      and (
        p_balance_max is null
        or c.user_balance < p_balance_max
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

revoke all on function public.assign_leads_atomic_filtered_v1(
  uuid,
  integer,
  uuid,
  uuid,
  text,
  text[],
  text,
  numeric,
  numeric
) from public;
revoke all on function public.assign_leads_atomic_filtered_v1(
  uuid,
  integer,
  uuid,
  uuid,
  text,
  text[],
  text,
  numeric,
  numeric
) from anon;
grant execute on function public.assign_leads_atomic_filtered_v1(
  uuid,
  integer,
  uuid,
  uuid,
  text,
  text[],
  text,
  numeric,
  numeric
) to authenticated;
grant execute on function public.assign_leads_atomic_filtered_v1(
  uuid,
  integer,
  uuid,
  uuid,
  text,
  text[],
  text,
  numeric,
  numeric
) to service_role;
