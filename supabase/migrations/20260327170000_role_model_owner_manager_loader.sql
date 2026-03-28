begin;

alter table public.agents
drop constraint if exists agents_role_check;

alter table public.agents
add constraint agents_role_check
check (
  role::text = any (
    array[
      'dev'::text,
      'owner'::text,
      'manager'::text,
      'loader'::text,
      'agent'::text
    ]
  )
);

create or replace function public.can_see_all_operations()
returns boolean
language sql
stable
set search_path to 'public'
as $function$
  select coalesce(public.current_role() = 'dev', false)
$function$;

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
        or me.operation_id = p_operation_id
      )
  );
$function$;

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

  if r not in ('dev', 'owner') then
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
      and a.role in ('dev', 'owner', 'manager')
  );
$function$;

create or replace function public.is_operation_admin()
returns boolean
language sql
stable
set search_path to 'public'
as $function$
  select public.current_role() in ('dev', 'owner', 'manager')
$function$;

create or replace function public.is_operation_agent()
returns boolean
language sql
stable
set search_path to 'public'
as $function$
  select public.current_role() = 'agent'
$function$;

create or replace function public.can_access_agent(
  p_agent_id uuid,
  p_operation_id uuid,
  p_role text
)
returns boolean
language sql
stable
security definer
set search_path to 'public'
set row_security to 'off'
as $function$
  select
    p_agent_id = auth.uid()
    or exists (
      select 1
      from public.agents me
      join public.operations current_op
        on current_op.id = coalesce(me.active_operation_id, me.operation_id)
      join public.operations target_op
        on target_op.id = p_operation_id
      where me.id = auth.uid()
        and me.is_active = true
        and (
          me.role = 'dev'
          or (
            me.role = 'owner'
            and current_op.tenant_id is not null
            and current_op.tenant_id = target_op.tenant_id
            and p_role in ('owner', 'manager', 'loader', 'agent')
          )
          or (
            me.role = 'manager'
            and me.operation_id = p_operation_id
            and p_role in ('loader', 'agent')
          )
        )
    );
$function$;

create or replace function public.can_write_agent_role(
  p_target_current_role text,
  p_new_role text
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
    where me.id = auth.uid()
      and me.is_active = true
      and (
        (
          me.role = 'dev'
          and p_target_current_role in ('owner', 'manager', 'loader', 'agent')
          and p_new_role in ('owner', 'manager', 'loader', 'agent')
        )
        or (
          me.role = 'owner'
          and p_target_current_role in ('manager', 'loader', 'agent')
          and p_new_role in ('manager', 'loader', 'agent')
        )
      )
  );
$function$;

create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path to 'public'
as $function$
  select coalesce(public.current_role() = 'owner', false)
$function$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
set search_path to 'public'
as $function$
  select coalesce(public.current_role() = 'dev', false)
$function$;

create or replace function public.is_agent()
returns boolean
language sql
stable
set search_path to 'public'
as $function$
  select coalesce(public.current_role() = 'agent', false)
$function$;

commit;
