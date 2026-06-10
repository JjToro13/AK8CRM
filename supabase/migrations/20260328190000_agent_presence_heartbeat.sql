begin;

alter table public.agents
  add column if not exists presence_status text not null default 'offline',
  add column if not exists last_seen_at timestamp with time zone;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'agents_presence_status_check'
      and conrelid = 'public.agents'::regclass
  ) then
    alter table public.agents
      add constraint agents_presence_status_check
      check (presence_status in ('online', 'offline'));
  end if;
end;
$$;

create index if not exists idx_agents_presence_status_last_seen
  on public.agents (presence_status, last_seen_at desc);

drop function if exists public.list_agents();
create function public.list_agents()
returns table(
  id uuid,
  email text,
  name text,
  role text,
  operation_id uuid,
  is_active boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  active_operation_id uuid,
  presence_status text,
  last_seen_at timestamp with time zone
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
    a.active_operation_id,
    a.presence_status,
    a.last_seen_at
  from public.agents a
  where a.operation_id is not null
    and public.can_access_agent(a.id, a.operation_id, a.role::text)
  order by a.name;
$function$;

drop function if exists public.get_agent(uuid);
create function public.get_agent(p_id uuid)
returns table(
  id uuid,
  name text,
  email text,
  role text,
  is_active boolean,
  operation_id uuid,
  active_operation_id uuid,
  created_at timestamp with time zone,
  presence_status text,
  last_seen_at timestamp with time zone
)
language sql
stable
security definer
set search_path to 'public'
set row_security to 'off'
as $function$
  select
    a.id,
    a.name,
    a.email,
    a.role::text,
    a.is_active,
    a.operation_id,
    a.active_operation_id,
    a.created_at,
    a.presence_status,
    a.last_seen_at
  from public.agents a
  where a.id = p_id
    and public.can_access_agent(a.id, a.operation_id, a.role::text)
  limit 1;
$function$;

drop function if exists public.my_agent();
create function public.my_agent()
returns table(
  id uuid,
  role text,
  is_active boolean,
  operation_id uuid,
  active_operation_id uuid,
  name text,
  presence_status text,
  last_seen_at timestamp with time zone
)
language sql
stable
security definer
set search_path to 'public'
set row_security to 'off'
as $function$
  select
    a.id,
    a.role::text,
    a.is_active,
    a.operation_id,
    a.active_operation_id,
    a.name,
    a.presence_status,
    a.last_seen_at
  from public.agents a
  where a.id = auth.uid()
  limit 1;
$function$;

create or replace function public.touch_my_presence()
returns timestamp with time zone
language plpgsql
security definer
set search_path to 'public'
set row_security to 'off'
as $function$
declare
  v_now timestamp with time zone := now();
begin
  update public.agents
  set
    presence_status = 'online',
    last_seen_at = v_now
  where id = auth.uid()
    and is_active is true;

  return v_now;
end;
$function$;

create or replace function public.set_my_presence_offline()
returns timestamp with time zone
language plpgsql
security definer
set search_path to 'public'
set row_security to 'off'
as $function$
declare
  v_now timestamp with time zone := now();
begin
  update public.agents
  set
    presence_status = 'offline',
    last_seen_at = v_now
  where id = auth.uid();

  return v_now;
end;
$function$;

revoke all on function public.list_agents() from public;
revoke all on function public.list_agents() from anon;
grant execute on function public.list_agents() to authenticated;
grant execute on function public.list_agents() to service_role;

revoke all on function public.get_agent(uuid) from public;
revoke all on function public.get_agent(uuid) from anon;
grant execute on function public.get_agent(uuid) to authenticated;
grant execute on function public.get_agent(uuid) to service_role;

revoke all on function public.my_agent() from public;
revoke all on function public.my_agent() from anon;
grant execute on function public.my_agent() to authenticated;
grant execute on function public.my_agent() to service_role;

revoke all on function public.touch_my_presence() from public;
revoke all on function public.touch_my_presence() from anon;
grant execute on function public.touch_my_presence() to authenticated;
grant execute on function public.touch_my_presence() to service_role;

revoke all on function public.set_my_presence_offline() from public;
revoke all on function public.set_my_presence_offline() from anon;
grant execute on function public.set_my_presence_offline() to authenticated;
grant execute on function public.set_my_presence_offline() to service_role;

commit;
