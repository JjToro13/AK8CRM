-- Phase 1 hardening for operations visibility and function search_path hygiene.

create or replace function public.can_access_operation(
  p_operation_id uuid,
  p_tenant_id uuid
)
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
      on myop.id = me.operation_id
    where me.id = auth.uid()
      and me.is_active = true
      and (
        me.role in ('dev', 'super_admin')
        or me.operation_id = p_operation_id
        or (
          myop.tenant_id is not null
          and myop.tenant_id = p_tenant_id
        )
      )
  );
$function$;

alter table public.operations enable row level security;

drop policy if exists "Operations scoped read" on public.operations;

create policy "Operations scoped read"
on public.operations
for select
to authenticated
using (public.can_access_operation(id, tenant_id));

create or replace function public.set_active_operation(p_operation_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  r text;
begin
  select role
    into r
  from public.agents
  where id = auth.uid()
    and is_active = true;

  if r not in ('dev', 'super_admin') then
    raise exception 'not allowed';
  end if;

  if p_operation_id is null then
    raise exception 'operation id is required';
  end if;

  if not public.can_access_operation(
    p_operation_id,
    (select o.tenant_id from public.operations o where o.id = p_operation_id)
  ) then
    raise exception 'operation not visible for current user';
  end if;

  update public.agents
  set active_operation_id = p_operation_id,
      updated_at = now()
  where id = auth.uid();
end;
$function$;

create or replace function public.clear_active_operation()
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not public.can_see_all_operations() then
    raise exception 'not allowed';
  end if;

  update public.agents
  set active_operation_id = null
  where id = auth.uid();
end;
$function$;

create or replace function public.is_admin_like()
returns boolean
language sql
stable
set search_path to 'public'
as $function$
  select exists (
    select 1
    from public.agents a
    where a.id = auth.uid()
      and a.is_active is true
      and a.role in ('admin','dev','super_admin')
  );
$function$;

create or replace function public.is_operation_admin()
returns boolean
language sql
stable
set search_path to 'public'
as $function$
  select public.current_role() in ('admin','dev','super_admin')
$function$;

create or replace function public.is_operation_agent()
returns boolean
language sql
stable
set search_path to 'public'
as $function$
  select public.current_role() = 'agent'
$function$;

create or replace function public.list_agents()
returns table(
  id uuid,
  email text,
  name text,
  role text,
  operation_id uuid,
  is_active boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  active_operation_id uuid
)
language sql
stable
set search_path to 'public'
as $function$
  select
    a.id,
    a.email,
    a.name,
    a.role,
    a.operation_id,
    a.is_active,
    a.created_at,
    a.updated_at,
    a.active_operation_id
  from public.agents a
  where a.operation_id = public.current_operation_id()
  order by a.name;
$function$;

create or replace function public.normalize_email(p_email text)
returns text
language sql
immutable
set search_path to 'public'
as $function$
  select nullif(lower(trim(p_email)), '');
$function$;

create or replace function public.normalize_phone(p_phone text)
returns text
language sql
immutable
set search_path to 'public'
as $function$
  select nullif(regexp_replace(coalesce(p_phone,''), '[^0-9]+', '', 'g'), '');
$function$;

create or replace function public.set_comment_operation()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  select c.operation_id
    into new.operation_id
  from public.clients c
  where c.id = new.client_id;

  return new;
end;
$function$;

create or replace function public.update_client_last_comment()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  update public.clients
  set
    last_comment = new.comment,
    last_comment_at = new.created_at,
    last_comment_agent = new.agent_id,
    comment_count = comment_count + 1
  where id = new.client_id;

  return new;
end;
$function$;

revoke all on function public.can_access_operation(uuid, uuid) from public;
revoke all on function public.can_access_operation(uuid, uuid) from anon;
grant execute on function public.can_access_operation(uuid, uuid) to authenticated;
grant execute on function public.can_access_operation(uuid, uuid) to service_role;

revoke all on function public.get_visible_tenants() from public;
revoke all on function public.get_visible_tenants() from anon;
grant execute on function public.get_visible_tenants() to authenticated;
grant execute on function public.get_visible_tenants() to service_role;

revoke all on function public.get_visible_operations(uuid) from public;
revoke all on function public.get_visible_operations(uuid) from anon;
grant execute on function public.get_visible_operations(uuid) to authenticated;
grant execute on function public.get_visible_operations(uuid) to service_role;

revoke all on function public.set_active_operation(uuid) from public;
revoke all on function public.set_active_operation(uuid) from anon;
grant execute on function public.set_active_operation(uuid) to authenticated;
grant execute on function public.set_active_operation(uuid) to service_role;

revoke all on function public.clear_active_operation() from public;
revoke all on function public.clear_active_operation() from anon;
grant execute on function public.clear_active_operation() to authenticated;
grant execute on function public.clear_active_operation() to service_role;

revoke all on function public.list_agents() from public;
revoke all on function public.list_agents() from anon;
grant execute on function public.list_agents() to authenticated;
grant execute on function public.list_agents() to service_role;
