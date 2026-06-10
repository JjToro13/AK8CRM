begin;

create table if not exists public.operation_settings (
  operation_id uuid primary key references public.operations(id) on delete cascade,
  client_phone_masked boolean not null default false,
  client_email_masked boolean not null default false,
  extra jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.operation_settings owner to postgres;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'trg_operation_settings_updated_at'
  ) then
    create trigger trg_operation_settings_updated_at
    before update on public.operation_settings
    for each row
    execute function public.set_updated_at();
  end if;
end $$;

alter table public.operation_settings enable row level security;

grant select on public.operation_settings to authenticated;
grant select, insert, update, delete on public.operation_settings to service_role;

drop policy if exists "Operation settings scoped read" on public.operation_settings;

create policy "Operation settings scoped read"
on public.operation_settings
for select
to authenticated
using (
  exists (
    select 1
    from public.operations o
    where o.id = public.operation_settings.operation_id
      and public.can_access_operation(o.id, o.tenant_id)
  )
);

create or replace function public.can_manage_tenant(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
set row_security to 'off'
as $function$
  select exists (
    select 1
    from public.agents me
    left join public.operations myop
      on myop.id = coalesce(me.active_operation_id, me.operation_id)
    where me.id = auth.uid()
      and me.is_active = true
      and (
        me.role = 'dev'
        or (
          me.role = 'owner'
          and myop.tenant_id is not null
          and myop.tenant_id = p_tenant_id
        )
      )
  )
$function$;

create or replace function public.can_manage_operation(p_operation_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
set row_security to 'off'
as $function$
  select exists (
    select 1
    from public.operations target_op
    where target_op.id = p_operation_id
      and public.can_manage_tenant(target_op.tenant_id)
  )
$function$;

create or replace function public.get_operation_client_privacy_settings(
  p_operation_id uuid
)
returns table (
  operation_id uuid,
  client_phone_masked boolean,
  client_email_masked boolean
)
language plpgsql
security definer
set search_path to 'public'
set row_security to 'off'
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

  return query
  select
    p_operation_id,
    coalesce(os.client_phone_masked, false),
    coalesce(os.client_email_masked, false)
  from (select p_operation_id as id) op
  left join public.operation_settings os
    on os.operation_id = op.id;
end;
$function$;

create or replace function public.get_operation_admin_settings(
  p_operation_id uuid
)
returns table (
  operation_id uuid,
  operation_name text,
  operation_slug text,
  tenant_id uuid,
  client_phone_masked boolean,
  client_email_masked boolean
)
language plpgsql
security definer
set search_path to 'public'
set row_security to 'off'
as $function$
begin
  if p_operation_id is null then
    raise exception 'operation id is required';
  end if;

  if not public.can_manage_operation(p_operation_id) then
    raise exception 'operation not manageable for current user';
  end if;

  return query
  select
    o.id,
    o.name,
    o.slug,
    o.tenant_id,
    coalesce(os.client_phone_masked, false),
    coalesce(os.client_email_masked, false)
  from public.operations o
  left join public.operation_settings os
    on os.operation_id = o.id
  where o.id = p_operation_id;
end;
$function$;

create or replace function public.update_operation_client_privacy(
  p_operation_id uuid,
  p_mask_phone_numbers boolean,
  p_mask_emails boolean
)
returns table (
  operation_id uuid,
  client_phone_masked boolean,
  client_email_masked boolean
)
language plpgsql
security definer
set search_path to 'public'
set row_security to 'off'
as $function$
begin
  if p_operation_id is null then
    raise exception 'operation id is required';
  end if;

  if not public.can_manage_operation(p_operation_id) then
    raise exception 'operation not manageable for current user';
  end if;

  insert into public.operation_settings (
    operation_id,
    client_phone_masked,
    client_email_masked
  )
  values (
    p_operation_id,
    coalesce(p_mask_phone_numbers, false),
    coalesce(p_mask_emails, false)
  )
  on conflict (operation_id) do update
  set client_phone_masked = excluded.client_phone_masked,
      client_email_masked = excluded.client_email_masked,
      updated_at = now();

  return query
  select
    os.operation_id,
    os.client_phone_masked,
    os.client_email_masked
  from public.operation_settings os
  where os.operation_id = p_operation_id;
end;
$function$;

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

revoke all on function public.can_manage_tenant(uuid) from public;
revoke all on function public.can_manage_tenant(uuid) from anon;
grant execute on function public.can_manage_tenant(uuid) to authenticated;
grant execute on function public.can_manage_tenant(uuid) to service_role;

revoke all on function public.can_manage_operation(uuid) from public;
revoke all on function public.can_manage_operation(uuid) from anon;
grant execute on function public.can_manage_operation(uuid) to authenticated;
grant execute on function public.can_manage_operation(uuid) to service_role;

revoke all on function public.get_operation_client_privacy_settings(uuid) from public;
revoke all on function public.get_operation_client_privacy_settings(uuid) from anon;
grant execute on function public.get_operation_client_privacy_settings(uuid) to authenticated;
grant execute on function public.get_operation_client_privacy_settings(uuid) to service_role;

revoke all on function public.get_operation_admin_settings(uuid) from public;
revoke all on function public.get_operation_admin_settings(uuid) from anon;
grant execute on function public.get_operation_admin_settings(uuid) to authenticated;
grant execute on function public.get_operation_admin_settings(uuid) to service_role;

revoke all on function public.update_operation_client_privacy(uuid, boolean, boolean) from public;
revoke all on function public.update_operation_client_privacy(uuid, boolean, boolean) from anon;
grant execute on function public.update_operation_client_privacy(uuid, boolean, boolean) to authenticated;
grant execute on function public.update_operation_client_privacy(uuid, boolean, boolean) to service_role;

revoke all on function public.create_operation_for_tenant(uuid, text, text) from public;
revoke all on function public.create_operation_for_tenant(uuid, text, text) from anon;
grant execute on function public.create_operation_for_tenant(uuid, text, text) to authenticated;
grant execute on function public.create_operation_for_tenant(uuid, text, text) to service_role;

commit;
