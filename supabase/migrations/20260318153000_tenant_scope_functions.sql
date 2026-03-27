create or replace function public.get_visible_tenants()
returns table (
  id uuid,
  slug text,
  name text,
  product_name text,
  brand_preset_id text
)
language plpgsql
security definer
set search_path = public
as $$
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

  if v_role in ('dev', 'super_admin') then
    return query
    select
      t.id,
      t.slug,
      t.name,
      ts.product_name,
      ts.brand_preset_id
    from public.tenants t
    left join public.tenant_settings ts
      on ts.tenant_id = t.id
    order by coalesce(ts.product_name, t.name), t.name;
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
  select
    t.id,
    t.slug,
    t.name,
    ts.product_name,
    ts.brand_preset_id
  from public.tenants t
  left join public.tenant_settings ts
    on ts.tenant_id = t.id
  where t.id = v_tenant_id
  order by coalesce(ts.product_name, t.name), t.name;
end;
$$;

grant execute on function public.get_visible_tenants() to authenticated;

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
as $$
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

  if v_role in ('dev', 'super_admin') then
    return query
    select
      o.id,
      o.slug,
      o.name,
      o.tenant_id
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
  select
    o.id,
    o.slug,
    o.name,
    o.tenant_id
  from public.operations o
  where o.tenant_id = v_tenant_id
  order by o.name;
end;
$$;

grant execute on function public.get_visible_operations(uuid) to authenticated;
