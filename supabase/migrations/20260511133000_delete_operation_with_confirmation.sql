begin;

create or replace function public.get_operation_delete_preview(
  p_operation_id uuid
)
returns table (
  operation_id uuid,
  operation_name text,
  operation_slug text,
  tenant_id uuid,
  campaign_count bigint,
  client_count bigint,
  scheduled_call_count bigint,
  assigned_agent_count bigint,
  active_agent_count bigint,
  requires_extended_confirmation boolean,
  confirmation_phrase text
)
language plpgsql
security definer
set search_path to 'public'
set row_security to 'off'
as $function$
declare
  v_operation record;
  v_campaign_count bigint := 0;
  v_client_count bigint := 0;
  v_scheduled_call_count bigint := 0;
  v_assigned_agent_count bigint := 0;
  v_active_agent_count bigint := 0;
  v_confirmation_phrase text;
begin
  if p_operation_id is null then
    raise exception 'operation id is required';
  end if;

  if not public.can_manage_operation(p_operation_id) then
    raise exception 'operation not manageable for current user';
  end if;

  select o.id, o.name, o.slug, o.tenant_id
    into v_operation
  from public.operations o
  where o.id = p_operation_id;

  if v_operation.id is null then
    raise exception 'operation not found';
  end if;

  select count(*)
    into v_campaign_count
  from public.campaigns c
  where c.operation_id = p_operation_id;

  select count(*)
    into v_client_count
  from public.clients c
  where c.operation_id = p_operation_id;

  select count(*)
    into v_scheduled_call_count
  from public.scheduled_calls sc
  where sc.operation_id = p_operation_id;

  select count(*)
    into v_assigned_agent_count
  from public.agents a
  where a.operation_id = p_operation_id;

  select count(*)
    into v_active_agent_count
  from public.agents a
  where a.active_operation_id = p_operation_id;

  v_confirmation_phrase :=
    case
      when v_campaign_count > 0 then
        'ELIMINAR OPERACION ' || v_operation.name || ' Y SUS CAMPANAS'
      else
        'ELIMINAR OPERACION ' || v_operation.name
    end;

  return query
  select
    v_operation.id,
    v_operation.name,
    v_operation.slug,
    v_operation.tenant_id,
    v_campaign_count,
    v_client_count,
    v_scheduled_call_count,
    v_assigned_agent_count,
    v_active_agent_count,
    v_campaign_count > 0,
    v_confirmation_phrase;
end;
$function$;

create or replace function public.delete_operation_for_tenant(
  p_operation_id uuid,
  p_confirmation text
)
returns table (
  deleted_operation boolean,
  deleted_campaigns integer,
  deleted_clients integer,
  deleted_scheduled_calls integer,
  deleted_movements integer,
  cleared_active_agents integer
)
language plpgsql
security definer
set search_path to 'public'
set row_security to 'off'
as $function$
declare
  v_operation record;
  v_campaign_count bigint := 0;
  v_assigned_agent_count bigint := 0;
  v_required_confirmation text;
  v_deleted_campaigns integer := 0;
  v_deleted_clients integer := 0;
  v_deleted_scheduled_calls integer := 0;
  v_deleted_movements integer := 0;
  v_cleared_active_agents integer := 0;
begin
  if p_operation_id is null then
    raise exception 'operation id is required';
  end if;

  if not public.can_manage_operation(p_operation_id) then
    raise exception 'operation not manageable for current user';
  end if;

  select o.id, o.name, o.slug, o.tenant_id
    into v_operation
  from public.operations o
  where o.id = p_operation_id;

  if v_operation.id is null then
    raise exception 'operation not found';
  end if;

  select count(*)
    into v_campaign_count
  from public.campaigns c
  where c.operation_id = p_operation_id;

  select count(*)
    into v_assigned_agent_count
  from public.agents a
  where a.operation_id = p_operation_id;

  if v_assigned_agent_count > 0 then
    raise exception 'operation has assigned agents'
      using hint = 'Move or deactivate assigned agents before deleting this operation.';
  end if;

  v_required_confirmation :=
    case
      when v_campaign_count > 0 then
        'ELIMINAR OPERACION ' || v_operation.name || ' Y SUS CAMPANAS'
      else
        'ELIMINAR OPERACION ' || v_operation.name
    end;

  if trim(coalesce(p_confirmation, '')) <> v_required_confirmation then
    raise exception 'confirmation phrase does not match'
      using hint = v_required_confirmation;
  end if;

  delete from public.scheduled_calls sc
  where sc.operation_id = p_operation_id
     or exists (
       select 1
       from public.campaigns c
       where c.id = sc.campaign_id
         and c.operation_id = p_operation_id
     );
  get diagnostics v_deleted_scheduled_calls = row_count;

  delete from public.client_campaign_movements m
  where exists (
      select 1
      from public.campaigns c
      where c.id = m.from_campaign_id
        and c.operation_id = p_operation_id
    )
     or exists (
      select 1
      from public.campaigns c
      where c.id = m.to_campaign_id
        and c.operation_id = p_operation_id
    );
  get diagnostics v_deleted_movements = row_count;

  delete from public.clients c
  where c.operation_id = p_operation_id;
  get diagnostics v_deleted_clients = row_count;

  delete from public.campaigns c
  where c.operation_id = p_operation_id;
  get diagnostics v_deleted_campaigns = row_count;

  update public.agents a
  set active_operation_id = null,
      updated_at = now()
  where a.active_operation_id = p_operation_id;
  get diagnostics v_cleared_active_agents = row_count;

  delete from public.operations o
  where o.id = p_operation_id;

  return query
  select
    true,
    v_deleted_campaigns,
    v_deleted_clients,
    v_deleted_scheduled_calls,
    v_deleted_movements,
    v_cleared_active_agents;
end;
$function$;

revoke all on function public.get_operation_delete_preview(uuid) from public;
revoke all on function public.get_operation_delete_preview(uuid) from anon;
grant execute on function public.get_operation_delete_preview(uuid) to authenticated;
grant execute on function public.get_operation_delete_preview(uuid) to service_role;

revoke all on function public.delete_operation_for_tenant(uuid, text) from public;
revoke all on function public.delete_operation_for_tenant(uuid, text) from anon;
grant execute on function public.delete_operation_for_tenant(uuid, text) to authenticated;
grant execute on function public.delete_operation_for_tenant(uuid, text) to service_role;

commit;
