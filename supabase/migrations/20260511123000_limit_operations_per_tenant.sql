begin;

create or replace function public.create_operation_for_tenant(
  p_tenant_id uuid,
  p_name text,
  p_slug text
)
returns table (
  id uuid,
  slug text,
  name text,
  tenant_id uuid
)
language plpgsql
security definer
set search_path to 'public'
set row_security to 'off'
as $function$
declare
  v_operation_id uuid;
  v_name text;
  v_operation_count integer;
  v_slug text;
begin
  v_name := nullif(trim(p_name), '');
  v_slug := lower(regexp_replace(nullif(trim(p_slug), ''), '[^a-zA-Z0-9_-]+', '-', 'g'));

  if p_tenant_id is null then
    raise exception 'tenant id is required';
  end if;

  if v_name is null then
    raise exception 'operation name is required';
  end if;

  if v_slug is null then
    raise exception 'operation slug is required';
  end if;

  if not public.can_manage_tenant(p_tenant_id) then
    raise exception 'tenant not manageable for current user';
  end if;

  select count(*)
    into v_operation_count
  from public.operations o
  where o.tenant_id = p_tenant_id;

  if v_operation_count >= 3 then
    raise exception 'operation limit reached'
      using
        errcode = 'P0001',
        detail = 'Este tenant ya tiene 3 operaciones.',
        hint = 'Comuniquese con el administrador para establecer nuevos limites de bases de datos y de procesamiento de informacion.';
  end if;

  insert into public.operations (tenant_id, name, slug)
  values (p_tenant_id, v_name, v_slug)
  returning public.operations.id
    into v_operation_id;

  insert into public.operation_settings (operation_id)
  values (v_operation_id)
  on conflict (operation_id) do nothing;

  return query
  select o.id, o.slug, o.name, o.tenant_id
  from public.operations o
  where o.id = v_operation_id;
end;
$function$;

revoke all on function public.create_operation_for_tenant(uuid, text, text) from public;
revoke all on function public.create_operation_for_tenant(uuid, text, text) from anon;
grant execute on function public.create_operation_for_tenant(uuid, text, text) to authenticated;
grant execute on function public.create_operation_for_tenant(uuid, text, text) to service_role;

commit;
