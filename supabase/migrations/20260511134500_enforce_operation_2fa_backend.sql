begin;

create or replace function public.operation_2fa_is_satisfied(
  p_operation_id uuid
)
returns boolean
language sql
stable
security definer
set search_path to 'public'
set row_security to 'off'
as $function$
  select
    p_operation_id is not null
    and (
      not coalesce(
        (
          select oss.totp_enabled
          from public.operation_security_settings oss
          where oss.operation_id = p_operation_id
        ),
        false
      )
      or exists (
        select 1
        from public.operation_2fa_verifications v
        left join public.operation_security_settings oss
          on oss.operation_id = v.operation_id
        where v.operation_id = p_operation_id
          and v.agent_id = auth.uid()
          and v.expires_at > now()
          and (
            oss.totp_rotated_at is null
            or v.secret_version >= oss.totp_rotated_at
          )
      )
    )
$function$;

create or replace function public.get_operation_2fa_status(
  p_operation_id uuid
)
returns table (
  operation_id uuid,
  required boolean,
  verified boolean,
  verified_until timestamptz
)
language plpgsql
security definer
set search_path to 'public'
set row_security to 'off'
as $function$
declare
  v_required boolean;
  v_verified_until timestamptz;
begin
  if p_operation_id is null then
    raise exception 'operation id is required';
  end if;

  if not public.can_access_operation_by_id(p_operation_id) then
    raise exception 'operation not visible for current user';
  end if;

  select coalesce(oss.totp_enabled, false)
    into v_required
  from public.operation_security_settings oss
  where oss.operation_id = p_operation_id;

  v_required := coalesce(v_required, false);

  select max(v.expires_at)
    into v_verified_until
  from public.operation_2fa_verifications v
  left join public.operation_security_settings oss
    on oss.operation_id = v.operation_id
  where v.operation_id = p_operation_id
    and v.agent_id = auth.uid()
    and v.expires_at > now()
    and (
      oss.totp_rotated_at is null
      or v.secret_version >= oss.totp_rotated_at
    );

  return query
  select
    p_operation_id,
    v_required,
    coalesce(v_verified_until > now(), false),
    v_verified_until;
end;
$function$;

drop policy if exists "operation 2fa gate clients" on public.clients;
create policy "operation 2fa gate clients"
on public.clients
as restrictive
for all
to authenticated
using (public.operation_2fa_is_satisfied(operation_id))
with check (public.operation_2fa_is_satisfied(operation_id));

drop policy if exists "operation 2fa gate campaigns" on public.campaigns;
create policy "operation 2fa gate campaigns"
on public.campaigns
as restrictive
for all
to authenticated
using (public.operation_2fa_is_satisfied(operation_id))
with check (public.operation_2fa_is_satisfied(operation_id));

drop policy if exists "operation 2fa gate scheduled calls" on public.scheduled_calls;
create policy "operation 2fa gate scheduled calls"
on public.scheduled_calls
as restrictive
for all
to authenticated
using (public.operation_2fa_is_satisfied(operation_id))
with check (public.operation_2fa_is_satisfied(operation_id));

drop policy if exists "operation 2fa gate calls" on public.calls;
create policy "operation 2fa gate calls"
on public.calls
as restrictive
for all
to authenticated
using (
  exists (
    select 1
    from public.clients c
    where c.id = public.calls.client_id
      and public.operation_2fa_is_satisfied(c.operation_id)
  )
)
with check (
  exists (
    select 1
    from public.clients c
    where c.id = public.calls.client_id
      and public.operation_2fa_is_satisfied(c.operation_id)
  )
);

drop policy if exists "operation 2fa gate client comments" on public.client_comments;
create policy "operation 2fa gate client comments"
on public.client_comments
as restrictive
for all
to authenticated
using (
  exists (
    select 1
    from public.clients c
    where c.id = public.client_comments.client_id
      and public.operation_2fa_is_satisfied(c.operation_id)
  )
)
with check (
  exists (
    select 1
    from public.clients c
    where c.id = public.client_comments.client_id
      and public.operation_2fa_is_satisfied(c.operation_id)
  )
);

drop policy if exists "operation 2fa gate email logs" on public.email_logs;
create policy "operation 2fa gate email logs"
on public.email_logs
as restrictive
for all
to authenticated
using (
  exists (
    select 1
    from public.clients c
    where c.id = public.email_logs.client_id
      and public.operation_2fa_is_satisfied(c.operation_id)
  )
)
with check (
  exists (
    select 1
    from public.clients c
    where c.id = public.email_logs.client_id
      and public.operation_2fa_is_satisfied(c.operation_id)
  )
);

drop policy if exists "operation 2fa gate campaign movements" on public.client_campaign_movements;
create policy "operation 2fa gate campaign movements"
on public.client_campaign_movements
as restrictive
for all
to authenticated
using (
  exists (
    select 1
    from public.clients c
    where c.id = public.client_campaign_movements.client_id
      and public.operation_2fa_is_satisfied(c.operation_id)
  )
)
with check (
  exists (
    select 1
    from public.clients c
    where c.id = public.client_campaign_movements.client_id
      and public.operation_2fa_is_satisfied(c.operation_id)
  )
);

revoke all on function public.operation_2fa_is_satisfied(uuid) from public;
revoke all on function public.operation_2fa_is_satisfied(uuid) from anon;
grant execute on function public.operation_2fa_is_satisfied(uuid) to authenticated;
grant execute on function public.operation_2fa_is_satisfied(uuid) to service_role;

revoke all on function public.get_operation_2fa_status(uuid) from public;
revoke all on function public.get_operation_2fa_status(uuid) from anon;
grant execute on function public.get_operation_2fa_status(uuid) to authenticated;
grant execute on function public.get_operation_2fa_status(uuid) to service_role;

commit;
