begin;

create table if not exists public.client_status_definitions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  code varchar(20) not null,
  label text not null,
  short_label text not null,
  description text not null default '',
  color_token text not null default 'slate',
  sort_order integer not null default 1000,
  is_system boolean not null default false,
  is_active boolean not null default true,
  created_by uuid references public.agents(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.client_status_definitions owner to postgres;
alter table public.client_status_definitions enable row level security;

create unique index if not exists idx_client_status_definitions_global_code
  on public.client_status_definitions (code)
  where tenant_id is null;

create unique index if not exists idx_client_status_definitions_tenant_code
  on public.client_status_definitions (tenant_id, code)
  where tenant_id is not null;

create index if not exists idx_client_status_definitions_tenant_active
  on public.client_status_definitions (tenant_id, is_active, sort_order, code);

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'trg_client_status_definitions_updated_at'
  ) then
    create trigger trg_client_status_definitions_updated_at
    before update on public.client_status_definitions
    for each row
    execute function public.set_updated_at();
  end if;
end $$;

insert into public.client_status_definitions (
  tenant_id,
  code,
  label,
  short_label,
  description,
  color_token,
  sort_order,
  is_system,
  is_active
)
values
  (null, 'NU', 'Nuevo', 'NU', 'Estado base automatico al cargar una base nueva', 'slate', 10, true, true),
  (null, 'LD', 'Llamar despues', 'LD', 'Cliente pidio retomar el contacto mas adelante', 'sky', 20, true, true),
  (null, 'DP', 'Deposito', 'DP', 'El cliente ya realizo el deposito o confirmo ingreso', 'emerald', 30, true, true),
  (null, 'SG', 'Seguimiento', 'SG', 'Cliente activo en gestion comercial o de continuidad', 'blue', 40, true, true),
  (null, 'NC', 'No contesta', 'NC', 'No atiende, buzon o no fue posible concretar contacto', 'slate', 50, true, true),
  (null, 'NI', 'No interesado', 'NI', 'Rechazo explicito o sin intencion de continuar', 'rose', 60, true, true),
  (null, 'NX', 'Numero no existe', 'NX', 'La linea no existe, esta fuera de servicio o invalida', 'amber', 70, true, true),
  (null, 'NE', 'Numero equivocado', 'NE', 'El contacto responde, pero no corresponde al cliente', 'yellow', 80, true, true),
  (null, 'RA', 'Reasignar', 'RA', 'El lead debe volver a reparto o cambiar de responsable', 'violet', 90, true, true),
  (null, 'FS', 'Fin de seguimiento', 'FS', 'La gestion se cierra sin mas acciones pendientes', 'zinc', 100, true, true)
on conflict do nothing;

alter table public.clients
  drop constraint if exists clients_status_code_check;

create or replace function public.list_client_status_definitions(
  p_tenant_id uuid default null
)
returns table (
  id uuid,
  tenant_id uuid,
  code varchar,
  label text,
  short_label text,
  description text,
  color_token text,
  sort_order integer,
  is_system boolean,
  is_active boolean,
  is_global boolean
)
language plpgsql
security definer
set search_path to 'public'
set row_security to 'off'
as $function$
declare
  v_current_tenant_id uuid;
  v_requested_tenant_id uuid;
begin
  select o.tenant_id
    into v_current_tenant_id
  from public.agents me
  join public.operations o
    on o.id = coalesce(me.active_operation_id, me.operation_id)
  where me.id = auth.uid()
    and me.is_active = true
  limit 1;

  v_requested_tenant_id := coalesce(p_tenant_id, v_current_tenant_id);

  if v_requested_tenant_id is null then
    return query
    select
      csd.id,
      csd.tenant_id,
      csd.code,
      csd.label,
      csd.short_label,
      csd.description,
      csd.color_token,
      csd.sort_order,
      csd.is_system,
      csd.is_active,
      csd.tenant_id is null as is_global
    from public.client_status_definitions csd
    where csd.tenant_id is null
      and csd.is_active = true
    order by csd.sort_order, csd.code;
    return;
  end if;

  if not public.can_manage_tenant(v_requested_tenant_id)
     and v_requested_tenant_id is distinct from v_current_tenant_id then
    raise exception 'tenant not visible for current user';
  end if;

  return query
  with ranked as (
    select distinct on (csd.code)
      csd.id,
      csd.tenant_id,
      csd.code,
      csd.label,
      csd.short_label,
      csd.description,
      csd.color_token,
      csd.sort_order,
      csd.is_system,
      csd.is_active,
      csd.tenant_id is null as is_global
    from public.client_status_definitions csd
    where csd.is_active = true
      and (
        csd.tenant_id is null
        or csd.tenant_id = v_requested_tenant_id
      )
    order by
      csd.code,
      case when csd.tenant_id = v_requested_tenant_id then 0 else 1 end,
      csd.sort_order,
      csd.created_at
  )
  select
    ranked.id,
    ranked.tenant_id,
    ranked.code,
    ranked.label,
    ranked.short_label,
    ranked.description,
    ranked.color_token,
    ranked.sort_order,
    ranked.is_system,
    ranked.is_active,
    ranked.is_global
  from ranked
  order by ranked.sort_order, ranked.code;
end;
$function$;

create or replace function public.create_tenant_client_status(
  p_tenant_id uuid,
  p_code text,
  p_label text,
  p_short_label text default null,
  p_description text default null,
  p_color_token text default 'slate'
)
returns table (
  id uuid,
  tenant_id uuid,
  code varchar,
  label text,
  short_label text,
  description text,
  color_token text,
  sort_order integer,
  is_system boolean,
  is_active boolean,
  is_global boolean
)
language plpgsql
security definer
set search_path to 'public'
set row_security to 'off'
as $function$
declare
  v_code varchar(20);
  v_label text;
  v_short_label text;
  v_description text;
  v_color_token text;
  v_sort_order integer;
  v_row public.client_status_definitions%rowtype;
begin
  if p_tenant_id is null then
    raise exception 'tenant id is required';
  end if;

  if not public.can_manage_tenant(p_tenant_id) then
    raise exception 'tenant not manageable for current user';
  end if;

  v_code := upper(trim(coalesce(p_code, '')));
  v_label := trim(coalesce(p_label, ''));
  v_short_label := upper(trim(coalesce(nullif(p_short_label, ''), v_code)));
  v_description := trim(coalesce(p_description, ''));
  v_color_token := lower(trim(coalesce(nullif(p_color_token, ''), 'slate')));

  if v_code = '' then
    raise exception 'status code is required';
  end if;

  if v_code !~ '^[A-Z0-9_]{2,20}$' then
    raise exception 'status code must contain only A-Z, 0-9 or _ and have 2 to 20 characters';
  end if;

  if v_label = '' then
    raise exception 'status label is required';
  end if;

  if v_color_token not in ('slate', 'sky', 'emerald', 'blue', 'rose', 'amber', 'yellow', 'violet', 'zinc') then
    raise exception 'unsupported color token';
  end if;

  if exists (
    select 1
    from public.client_status_definitions csd
    where csd.code = v_code
      and csd.tenant_id is null
  ) then
    raise exception 'status code already exists as global';
  end if;

  if exists (
    select 1
    from public.client_status_definitions csd
    where csd.tenant_id = p_tenant_id
      and csd.code = v_code
  ) then
    raise exception 'status code already exists for this tenant';
  end if;

  select coalesce(max(csd.sort_order), 1000) + 10
    into v_sort_order
  from public.client_status_definitions csd
  where csd.tenant_id = p_tenant_id;

  insert into public.client_status_definitions (
    tenant_id,
    code,
    label,
    short_label,
    description,
    color_token,
    sort_order,
    is_system,
    is_active,
    created_by
  )
  values (
    p_tenant_id,
    v_code,
    v_label,
    v_short_label,
    v_description,
    v_color_token,
    v_sort_order,
    false,
    true,
    auth.uid()
  )
  returning *
    into v_row;

  return query
  select
    v_row.id,
    v_row.tenant_id,
    v_row.code,
    v_row.label,
    v_row.short_label,
    v_row.description,
    v_row.color_token,
    v_row.sort_order,
    v_row.is_system,
    v_row.is_active,
    false as is_global;
end;
$function$;

create or replace function public.get_agent_delete_preview(
  p_id uuid
)
returns table (
  agent_id uuid,
  operation_id uuid,
  scheduled_calls_count integer,
  blocking_comments_count integer,
  blocking_assignments_count integer
)
language plpgsql
security definer
set search_path to 'public'
set row_security to 'off'
as $function$
declare
  v_target_role text;
  v_target_operation_id uuid;
begin
  select a.role::text, a.operation_id
    into v_target_role, v_target_operation_id
  from public.agents a
  where a.id = p_id;

  if v_target_role is null then
    raise exception 'Usuario no encontrado.';
  end if;

  if not public.can_access_agent(p_id, v_target_operation_id, v_target_role) then
    raise exception 'No tienes permisos para consultar este usuario.';
  end if;

  return query
  select
    p_id,
    v_target_operation_id,
    (
      select count(*)::integer
      from public.scheduled_calls sc
      where sc.agent_id = p_id
    ),
    (
      select count(*)::integer
      from public.client_comments cc
      where cc.agent_id = p_id
    ),
    (
      select count(*)::integer
      from public.agent_assignments aa
      where aa.assigned_by = p_id
    );
end;
$function$;

drop function if exists public.delete_agent(uuid);

create or replace function public.delete_agent(
  p_id uuid,
  p_scheduled_calls_action text default 'block',
  p_migrate_to_agent_id uuid default null
)
returns table (
  deleted_scheduled_calls integer,
  migrated_scheduled_calls integer
)
language plpgsql
security definer
set search_path to 'public'
set row_security to 'off'
as $function$
declare
  v_target_role text;
  v_target_operation_id uuid;
  v_target_scheduled_calls integer := 0;
  v_action text := lower(trim(coalesce(p_scheduled_calls_action, 'block')));
  v_migrate_role text;
  v_migrate_operation_id uuid;
  v_migrate_is_active boolean;
  v_deleted_scheduled_calls integer := 0;
  v_migrated_scheduled_calls integer := 0;
begin
  select a.role::text, a.operation_id
    into v_target_role, v_target_operation_id
  from public.agents a
  where a.id = p_id;

  if v_target_role is null then
    raise exception 'Usuario no encontrado.';
  end if;

  if p_id = auth.uid() then
    raise exception 'No puedes eliminar tu propio usuario.';
  end if;

  if not public.can_access_agent(p_id, v_target_operation_id, v_target_role) then
    raise exception 'No tienes permisos para eliminar este usuario.';
  end if;

  if not public.can_write_agent_role(v_target_role, v_target_role) then
    raise exception 'No tienes permisos para eliminar este usuario.';
  end if;

  if exists (
    select 1
    from public.client_comments cc
    where cc.agent_id = p_id
  ) then
    raise exception 'El usuario tiene comentarios registrados y no puede eliminarse por ahora.';
  end if;

  if exists (
    select 1
    from public.agent_assignments aa
    where aa.assigned_by = p_id
  ) then
    raise exception 'El usuario tiene asignaciones historicas registradas y no puede eliminarse por ahora.';
  end if;

  select count(*)::integer
    into v_target_scheduled_calls
  from public.scheduled_calls sc
  where sc.agent_id = p_id;

  if v_target_scheduled_calls > 0 then
    if v_action = 'block' then
      raise exception 'El usuario tiene citas programadas. Reasignalas o eliminalas antes de continuar.';
    elsif v_action = 'delete' then
      delete from public.scheduled_calls sc
      where sc.agent_id = p_id;

      get diagnostics v_deleted_scheduled_calls = row_count;
    elsif v_action = 'migrate' then
      if p_migrate_to_agent_id is null then
        raise exception 'Debes seleccionar un agente destino para migrar las citas.';
      end if;

      if p_migrate_to_agent_id = p_id then
        raise exception 'El agente destino debe ser diferente al que se va a eliminar.';
      end if;

      select a.role::text, a.operation_id, a.is_active
        into v_migrate_role, v_migrate_operation_id, v_migrate_is_active
      from public.agents a
      where a.id = p_migrate_to_agent_id;

      if v_migrate_role is null then
        raise exception 'El agente destino no existe.';
      end if;

      if v_migrate_role <> 'agent' then
        raise exception 'Solo puedes migrar citas hacia un agente operativo.';
      end if;

      if v_migrate_is_active is false then
        raise exception 'El agente destino debe estar activo.';
      end if;

      if v_migrate_operation_id is distinct from v_target_operation_id then
        raise exception 'Solo puedes migrar citas a un agente de la misma operacion.';
      end if;

      if not public.can_access_agent(
        p_migrate_to_agent_id,
        v_migrate_operation_id,
        v_migrate_role
      ) then
        raise exception 'No tienes permisos para usar el agente destino.';
      end if;

      update public.scheduled_calls
      set agent_id = p_migrate_to_agent_id,
          updated_at = now()
      where agent_id = p_id;

      get diagnostics v_migrated_scheduled_calls = row_count;
    else
      raise exception 'scheduled calls action not supported';
    end if;
  end if;

  update public.clients
  set assigned_to = null,
      assigned_at = null,
      updated_at = now()
  where assigned_to = p_id;

  update public.invitation_codes
  set created_by = null,
      updated_at = now()
  where created_by = p_id;

  delete from public.agents
  where id = p_id;

  return query
  select v_deleted_scheduled_calls, v_migrated_scheduled_calls;
end;
$function$;

revoke all on table public.client_status_definitions from public;
revoke all on table public.client_status_definitions from anon;
revoke all on table public.client_status_definitions from authenticated;
grant all on table public.client_status_definitions to service_role;

revoke all on function public.list_client_status_definitions(uuid) from public;
revoke all on function public.list_client_status_definitions(uuid) from anon;
grant execute on function public.list_client_status_definitions(uuid) to authenticated;
grant execute on function public.list_client_status_definitions(uuid) to service_role;

revoke all on function public.create_tenant_client_status(uuid, text, text, text, text, text) from public;
revoke all on function public.create_tenant_client_status(uuid, text, text, text, text, text) from anon;
grant execute on function public.create_tenant_client_status(uuid, text, text, text, text, text) to authenticated;
grant execute on function public.create_tenant_client_status(uuid, text, text, text, text, text) to service_role;

revoke all on function public.get_agent_delete_preview(uuid) from public;
revoke all on function public.get_agent_delete_preview(uuid) from anon;
grant execute on function public.get_agent_delete_preview(uuid) to authenticated;
grant execute on function public.get_agent_delete_preview(uuid) to service_role;

revoke all on function public.delete_agent(uuid, text, uuid) from public;
revoke all on function public.delete_agent(uuid, text, uuid) from anon;
grant execute on function public.delete_agent(uuid, text, uuid) to authenticated;
grant execute on function public.delete_agent(uuid, text, uuid) to service_role;

commit;
