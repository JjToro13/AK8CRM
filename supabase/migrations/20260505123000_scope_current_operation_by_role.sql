create or replace function public.current_operation_id()
returns uuid
language sql
stable
security definer
set search_path to 'public'
set row_security to 'off'
as $function$
  select case
    when a.role in ('dev', 'owner') then coalesce(a.active_operation_id, a.operation_id)
    else a.operation_id
  end
  from public.agents a
  where a.id = auth.uid()
    and a.is_active = true;
$function$;

revoke all on function public.current_operation_id() from public;
revoke all on function public.current_operation_id() from anon;
grant execute on function public.current_operation_id() to authenticated;
grant execute on function public.current_operation_id() to service_role;
