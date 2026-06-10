begin;

alter function public.import_clients_v1(jsonb, text, uuid)
rename to import_clients_v1_unguarded;

alter function public.import_clients_to_existing_campaign_v1(jsonb, uuid, uuid)
rename to import_clients_to_existing_campaign_v1_unguarded;

alter function public.hard_delete_campaign_v1(uuid, uuid)
rename to hard_delete_campaign_v1_unguarded;

alter function public.move_clients_to_campaign(uuid[], uuid, text, text)
rename to move_clients_to_campaign_unguarded;

alter function public.move_campaign_clients_by_status(uuid, uuid, text[], text, text)
rename to move_campaign_clients_by_status_unguarded;

create or replace function public.require_operation_2fa(
  p_operation_id uuid
)
returns void
language plpgsql
stable
security definer
set search_path = public
set row_security = off
as $function$
declare
  v_tenant_id uuid;
begin
  if p_operation_id is null then
    raise exception 'operation id is required';
  end if;

  select o.tenant_id
    into v_tenant_id
  from public.operations o
  where o.id = p_operation_id;

  if v_tenant_id is null then
    raise exception 'operation not found';
  end if;

  if not public.can_access_operation(p_operation_id, v_tenant_id) then
    raise exception 'operation not visible for current user';
  end if;

  if not public.operation_2fa_is_satisfied(p_operation_id) then
    raise exception 'operation 2fa verification required';
  end if;
end;
$function$;

create or replace function public.import_clients_v1(
  p_clients jsonb,
  p_campaign_name text default null,
  p_operation_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $function$
declare
  v_target_operation_id uuid;
begin
  v_target_operation_id := coalesce(p_operation_id, public.current_operation_id());

  perform public.require_operation_2fa(v_target_operation_id);

  return public.import_clients_v1_unguarded(
    p_clients,
    p_campaign_name,
    p_operation_id
  );
end;
$function$;

create or replace function public.import_clients_to_existing_campaign_v1(
  p_clients jsonb,
  p_campaign_id uuid,
  p_operation_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $function$
declare
  v_target_operation_id uuid;
begin
  select c.operation_id
    into v_target_operation_id
  from public.campaigns c
  where c.id = p_campaign_id;

  v_target_operation_id := coalesce(p_operation_id, v_target_operation_id, public.current_operation_id());

  perform public.require_operation_2fa(v_target_operation_id);

  return public.import_clients_to_existing_campaign_v1_unguarded(
    p_clients,
    p_campaign_id,
    p_operation_id
  );
end;
$function$;

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
language plpgsql
stable
security definer
set search_path = public
set row_security = off
as $function$
declare
  v_target_operation_id uuid;
begin
  v_target_operation_id := coalesce(p_operation_id, public.current_operation_id());

  perform public.require_operation_2fa(v_target_operation_id);

  return query
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
  where ca.operation_id = v_target_operation_id
  group by ca.id, ca.prefix
  order by ca.prefix;
end;
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
language plpgsql
stable
security definer
set search_path = public
set row_security = off
as $function$
declare
  v_target_operation_id uuid;
begin
  v_target_operation_id := coalesce(p_operation_id, public.current_operation_id());

  perform public.require_operation_2fa(v_target_operation_id);

  return query
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
  where ca.operation_id = v_target_operation_id
  group by ca.id, ca.prefix, ca.display_name
  order by ca.prefix;
end;
$function$;

create or replace function public.hard_delete_campaign_v1(
  p_campaign_id uuid,
  p_operation_id uuid default null
)
returns table (
  deleted_clients integer,
  deleted_movements integer,
  deleted_scheduled_calls integer,
  deleted_campaigns integer
)
language plpgsql
security definer
set search_path = public
set row_security = off
as $function$
declare
  v_operation_id uuid;
begin
  select c.operation_id
    into v_operation_id
  from public.campaigns c
  where c.id = p_campaign_id;

  v_operation_id := coalesce(p_operation_id, v_operation_id);

  perform public.require_operation_2fa(v_operation_id);

  return query
  select *
  from public.hard_delete_campaign_v1_unguarded(p_campaign_id, p_operation_id);
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
  v_operation_id uuid;
begin
  select c.operation_id
    into v_operation_id
  from public.campaigns c
  where c.id = p_target_campaign_id;

  perform public.require_operation_2fa(v_operation_id);

  return query
  select *
  from public.move_clients_to_campaign_unguarded(
    p_client_ids,
    p_target_campaign_id,
    p_reason,
    p_notes
  );
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
begin
  select c.operation_id
    into v_source_operation_id
  from public.campaigns c
  where c.id = p_source_campaign_id;

  select c.operation_id
    into v_target_operation_id
  from public.campaigns c
  where c.id = p_target_campaign_id;

  if v_source_operation_id is null or v_target_operation_id is null then
    raise exception 'source or target campaign not found';
  end if;

  if v_source_operation_id <> v_target_operation_id then
    raise exception 'source and target campaigns must belong to the same operation';
  end if;

  perform public.require_operation_2fa(v_target_operation_id);

  return query
  select *
  from public.move_campaign_clients_by_status_unguarded(
    p_source_campaign_id,
    p_target_campaign_id,
    p_status_codes,
    p_reason,
    p_notes
  );
end;
$function$;

revoke all on function public.require_operation_2fa(uuid) from public;
revoke all on function public.require_operation_2fa(uuid) from anon;
grant execute on function public.require_operation_2fa(uuid) to authenticated;
grant execute on function public.require_operation_2fa(uuid) to service_role;

revoke all on function public.import_clients_v1_unguarded(jsonb, text, uuid) from public;
revoke all on function public.import_clients_v1_unguarded(jsonb, text, uuid) from anon;
revoke all on function public.import_clients_v1_unguarded(jsonb, text, uuid) from authenticated;
revoke all on function public.import_clients_to_existing_campaign_v1_unguarded(jsonb, uuid, uuid) from public;
revoke all on function public.import_clients_to_existing_campaign_v1_unguarded(jsonb, uuid, uuid) from anon;
revoke all on function public.import_clients_to_existing_campaign_v1_unguarded(jsonb, uuid, uuid) from authenticated;
revoke all on function public.hard_delete_campaign_v1_unguarded(uuid, uuid) from public;
revoke all on function public.hard_delete_campaign_v1_unguarded(uuid, uuid) from anon;
revoke all on function public.hard_delete_campaign_v1_unguarded(uuid, uuid) from authenticated;
revoke all on function public.move_clients_to_campaign_unguarded(uuid[], uuid, text, text) from public;
revoke all on function public.move_clients_to_campaign_unguarded(uuid[], uuid, text, text) from anon;
revoke all on function public.move_clients_to_campaign_unguarded(uuid[], uuid, text, text) from authenticated;
revoke all on function public.move_campaign_clients_by_status_unguarded(uuid, uuid, text[], text, text) from public;
revoke all on function public.move_campaign_clients_by_status_unguarded(uuid, uuid, text[], text, text) from anon;
revoke all on function public.move_campaign_clients_by_status_unguarded(uuid, uuid, text[], text, text) from authenticated;

grant execute on function public.import_clients_v1(jsonb, text, uuid) to authenticated;
grant execute on function public.import_clients_v1(jsonb, text, uuid) to service_role;
grant execute on function public.import_clients_to_existing_campaign_v1(jsonb, uuid, uuid) to authenticated;
grant execute on function public.import_clients_to_existing_campaign_v1(jsonb, uuid, uuid) to service_role;
grant execute on function public.get_campaign_stats_v2(uuid) to authenticated;
grant execute on function public.get_campaign_stats_v2(uuid) to service_role;
grant execute on function public.get_available_campaigns_v2(uuid) to authenticated;
grant execute on function public.get_available_campaigns_v2(uuid) to service_role;
grant execute on function public.hard_delete_campaign_v1(uuid, uuid) to authenticated;
grant execute on function public.hard_delete_campaign_v1(uuid, uuid) to service_role;
grant execute on function public.move_clients_to_campaign(uuid[], uuid, text, text) to authenticated;
grant execute on function public.move_clients_to_campaign(uuid[], uuid, text, text) to service_role;
grant execute on function public.move_campaign_clients_by_status(uuid, uuid, text[], text, text) to authenticated;
grant execute on function public.move_campaign_clients_by_status(uuid, uuid, text[], text, text) to service_role;

commit;
