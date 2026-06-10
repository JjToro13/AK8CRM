create or replace function public.delete_agent(p_id uuid)
returns void
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
    from public.scheduled_calls sc
    where sc.agent_id = p_id
  ) then
    raise exception 'El usuario tiene citas programadas. Reasignalas o eliminalas antes de continuar.';
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
end;
$function$;

revoke all on function public.delete_agent(uuid) from public;
revoke all on function public.delete_agent(uuid) from anon;
grant execute on function public.delete_agent(uuid) to authenticated;
grant execute on function public.delete_agent(uuid) to service_role;
