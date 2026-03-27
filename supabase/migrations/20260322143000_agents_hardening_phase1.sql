-- Phase 1 hardening for agents visibility and role-safe mutations.

create index if not exists idx_agents_operation_id
  on public.agents (operation_id);

create index if not exists idx_agents_active_operation_id
  on public.agents (active_operation_id);

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
        and current_op.tenant_id is not null
        and current_op.tenant_id = target_op.tenant_id
        and (
          (me.role = 'dev' and p_role in ('super_admin', 'admin', 'agent'))
          or (me.role = 'super_admin' and p_role in ('admin', 'agent'))
          or (me.role = 'admin' and p_role = 'agent')
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
          and p_target_current_role in ('super_admin', 'admin', 'agent')
          and p_new_role in ('super_admin', 'admin', 'agent')
        )
        or (
          me.role = 'super_admin'
          and p_target_current_role in ('admin', 'agent')
          and p_new_role in ('admin', 'agent')
        )
        or (
          me.role = 'admin'
          and p_target_current_role = 'agent'
          and p_new_role = 'agent'
        )
      )
  );
$function$;

drop policy if exists "agents_select" on public.agents;
drop policy if exists "agents_self_select" on public.agents;
drop policy if exists "agents select scoped" on public.agents;
drop policy if exists "agents update blocked" on public.agents;
drop policy if exists "agents insert blocked" on public.agents;
drop policy if exists "agents delete blocked" on public.agents;

create policy "agents select scoped"
on public.agents
for select
to authenticated
using (public.can_access_agent(id, operation_id, role::text));

create policy "agents insert blocked"
on public.agents
for insert
to authenticated
with check (false);

create policy "agents update blocked"
on public.agents
for update
to authenticated
using (false)
with check (false);

create policy "agents delete blocked"
on public.agents
for delete
to authenticated
using (false);

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
  where a.operation_id is not null
    and public.can_access_agent(a.id, a.operation_id, a.role::text)
  order by a.name;
$function$;

create or replace function public.get_agent(p_id uuid)
returns table(
  id uuid,
  name text,
  email text,
  role text,
  is_active boolean,
  operation_id uuid,
  active_operation_id uuid,
  created_at timestamp with time zone
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
    a.created_at
  from public.agents a
  where a.id = p_id
    and public.can_access_agent(a.id, a.operation_id, a.role::text)
  limit 1;
$function$;

create or replace function public.update_agent(
  p_id uuid,
  p_name text,
  p_role text,
  p_is_active boolean
)
returns void
language plpgsql
security definer
set search_path to 'public'
set row_security to 'off'
as $function$
declare
  v_target_role text;
  v_target_operation_id uuid;
  v_next_role text;
begin
  select a.role::text, a.operation_id
    into v_target_role, v_target_operation_id
  from public.agents a
  where a.id = p_id;

  if v_target_role is null then
    raise exception 'Agent not found';
  end if;

  if not public.can_access_agent(p_id, v_target_operation_id, v_target_role) then
    raise exception 'Not allowed';
  end if;

  v_next_role := coalesce(nullif(trim(p_role), ''), v_target_role);

  if not public.can_write_agent_role(v_target_role, v_next_role) then
    raise exception 'Role change not allowed';
  end if;

  update public.agents
  set
    name = coalesce(nullif(trim(p_name), ''), name),
    role = v_next_role::text,
    is_active = coalesce(p_is_active, is_active),
    updated_at = now()
  where id = p_id;
end;
$function$;

create or replace function public.upsert_agent(
  p_id uuid,
  p_name text,
  p_role text,
  p_is_active boolean
)
returns void
language plpgsql
security definer
set search_path to 'public'
set row_security to 'off'
as $function$
begin
  perform public.update_agent(
    p_id,
    p_name,
    p_role,
    p_is_active
  );
end;
$function$;

create or replace function public.agent_name_map(p_agent_ids uuid[])
returns table(id uuid, label text)
language sql
stable
security definer
set search_path to 'public', 'auth'
set row_security to 'off'
as $function$
  select a.id, a.name::text as label
  from public.agents a
  where a.id = any(p_agent_ids)
    and a.is_active is true
    and public.can_access_agent(a.id, a.operation_id, a.role::text);
$function$;

revoke all on function public.can_access_agent(uuid, uuid, text) from public;
revoke all on function public.can_access_agent(uuid, uuid, text) from anon;
grant execute on function public.can_access_agent(uuid, uuid, text) to authenticated;
grant execute on function public.can_access_agent(uuid, uuid, text) to service_role;

revoke all on function public.can_write_agent_role(text, text) from public;
revoke all on function public.can_write_agent_role(text, text) from anon;
grant execute on function public.can_write_agent_role(text, text) to authenticated;
grant execute on function public.can_write_agent_role(text, text) to service_role;

revoke all on function public.list_agents() from public;
revoke all on function public.list_agents() from anon;
grant execute on function public.list_agents() to authenticated;
grant execute on function public.list_agents() to service_role;

revoke all on function public.get_agent(uuid) from public;
revoke all on function public.get_agent(uuid) from anon;
grant execute on function public.get_agent(uuid) to authenticated;
grant execute on function public.get_agent(uuid) to service_role;

revoke all on function public.update_agent(uuid, text, text, boolean) from public;
revoke all on function public.update_agent(uuid, text, text, boolean) from anon;
grant execute on function public.update_agent(uuid, text, text, boolean) to authenticated;
grant execute on function public.update_agent(uuid, text, text, boolean) to service_role;

revoke all on function public.upsert_agent(uuid, text, text, boolean) from public;
revoke all on function public.upsert_agent(uuid, text, text, boolean) from anon;
grant execute on function public.upsert_agent(uuid, text, text, boolean) to authenticated;
grant execute on function public.upsert_agent(uuid, text, text, boolean) to service_role;

revoke all on function public.agent_name_map(uuid[]) from public;
revoke all on function public.agent_name_map(uuid[]) from anon;
grant execute on function public.agent_name_map(uuid[]) to authenticated;
grant execute on function public.agent_name_map(uuid[]) to service_role;
