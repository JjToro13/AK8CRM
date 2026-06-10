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
  v_deleted_clients integer := 0;
  v_deleted_movements integer := 0;
  v_deleted_scheduled_calls integer := 0;
  v_deleted_campaigns integer := 0;
begin
  if not (public.can_see_all_operations() or public.is_operation_admin()) then
    raise exception 'not allowed';
  end if;

  if p_campaign_id is null then
    raise exception 'campaign is required';
  end if;

  select c.operation_id
    into v_operation_id
  from public.campaigns c
  where c.id = p_campaign_id;

  if v_operation_id is null then
    return query select 0, 0, 0, 0;
    return;
  end if;

  if p_operation_id is not null and v_operation_id <> p_operation_id then
    raise exception 'campaign is outside selected operation';
  end if;

  if not public.can_see_all_operations()
     and v_operation_id <> public.current_operation_id() then
    raise exception 'campaign is outside current operation';
  end if;

  delete from public.scheduled_calls sc
  where sc.campaign_id = p_campaign_id;
  get diagnostics v_deleted_scheduled_calls = row_count;

  delete from public.client_campaign_movements m
  where m.from_campaign_id = p_campaign_id
     or m.to_campaign_id = p_campaign_id;
  get diagnostics v_deleted_movements = row_count;

  delete from public.clients c
  where c.campaign_id = p_campaign_id
    and c.operation_id = v_operation_id;
  get diagnostics v_deleted_clients = row_count;

  delete from public.campaigns c
  where c.id = p_campaign_id
    and c.operation_id = v_operation_id;
  get diagnostics v_deleted_campaigns = row_count;

  return query select
    v_deleted_clients,
    v_deleted_movements,
    v_deleted_scheduled_calls,
    v_deleted_campaigns;
end;
$function$;

revoke all on function public.hard_delete_campaign_v1(uuid, uuid) from public;
revoke all on function public.hard_delete_campaign_v1(uuid, uuid) from anon;
grant execute on function public.hard_delete_campaign_v1(uuid, uuid) to authenticated;
grant execute on function public.hard_delete_campaign_v1(uuid, uuid) to service_role;
