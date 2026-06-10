begin;

create or replace function public.get_visible_operations(
  p_tenant_id uuid default null
)
returns table (
  id uuid,
  slug text,
  name text,
  tenant_id uuid
)
language plpgsql
security definer
set search_path = public
set row_security = off
as $function$
declare
  v_role text;
  v_operation_id uuid;
  v_tenant_id uuid;
begin
  select a.role, a.operation_id
    into v_role, v_operation_id
  from public.agents a
  where a.id = auth.uid()
    and a.is_active = true
  limit 1;

  if v_role is null then
    return;
  end if;

  if v_role = 'dev' then
    return query
    select o.id, o.slug, o.name, o.tenant_id
    from public.operations o
    where p_tenant_id is null
       or o.tenant_id = p_tenant_id
    order by o.name;
    return;
  end if;

  select o.tenant_id
    into v_tenant_id
  from public.operations o
  where o.id = v_operation_id
  limit 1;

  if v_tenant_id is null then
    return;
  end if;

  return query
  select o.id, o.slug, o.name, o.tenant_id
  from public.operations o
  where o.tenant_id = v_tenant_id
    and (
      p_tenant_id is null
      or o.tenant_id = p_tenant_id
    )
  order by o.name;
end;
$function$;

revoke all on function public.get_visible_operations(uuid) from public;
revoke all on function public.get_visible_operations(uuid) from anon;
grant execute on function public.get_visible_operations(uuid) to authenticated;
grant execute on function public.get_visible_operations(uuid) to service_role;

commit;
