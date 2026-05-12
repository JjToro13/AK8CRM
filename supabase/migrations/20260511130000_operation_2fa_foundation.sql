begin;

create table if not exists public.operation_security_settings (
  operation_id uuid primary key references public.operations(id) on delete cascade,
  totp_enabled boolean not null default false,
  totp_secret_ciphertext text,
  totp_secret_iv text,
  totp_issuer text not null default 'AK8 CRM',
  totp_label text,
  totp_rotated_at timestamptz,
  pending_setup_id uuid,
  pending_totp_secret_ciphertext text,
  pending_totp_secret_iv text,
  pending_setup_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.operation_security_settings owner to postgres;

create table if not exists public.operation_2fa_verifications (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid not null references public.operations(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete cascade,
  verified_at timestamptz not null default now(),
  expires_at timestamptz not null,
  secret_version timestamptz,
  created_at timestamptz not null default now()
);

alter table public.operation_2fa_verifications owner to postgres;

create table if not exists public.operation_2fa_attempts (
  id uuid primary key default gen_random_uuid(),
  operation_id uuid references public.operations(id) on delete cascade,
  agent_id uuid references public.agents(id) on delete set null,
  attempted_at timestamptz not null default now(),
  success boolean not null,
  reason text,
  ip_hash text,
  user_agent_hash text
);

alter table public.operation_2fa_attempts owner to postgres;

create index if not exists idx_operation_2fa_verifications_lookup
  on public.operation_2fa_verifications (operation_id, agent_id, expires_at desc);

create index if not exists idx_operation_2fa_attempts_lookup
  on public.operation_2fa_attempts (operation_id, agent_id, attempted_at desc);

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'trg_operation_security_settings_updated_at'
  ) then
    create trigger trg_operation_security_settings_updated_at
    before update on public.operation_security_settings
    for each row
    execute function public.set_updated_at();
  end if;
end $$;

alter table public.operation_security_settings enable row level security;
alter table public.operation_2fa_verifications enable row level security;
alter table public.operation_2fa_attempts enable row level security;

grant select on public.operation_security_settings to authenticated;
grant select on public.operation_2fa_verifications to authenticated;
grant select on public.operation_2fa_attempts to authenticated;
grant select, insert, update, delete on public.operation_security_settings to service_role;
grant select, insert, update, delete on public.operation_2fa_verifications to service_role;
grant select, insert, update, delete on public.operation_2fa_attempts to service_role;

drop policy if exists "Operation security settings scoped read" on public.operation_security_settings;
create policy "Operation security settings scoped read"
on public.operation_security_settings
for select
to authenticated
using (
  exists (
    select 1
    from public.operations o
    where o.id = public.operation_security_settings.operation_id
      and public.can_access_operation(o.id, o.tenant_id)
  )
);

drop policy if exists "Operation 2fa verifications own scoped read" on public.operation_2fa_verifications;
create policy "Operation 2fa verifications own scoped read"
on public.operation_2fa_verifications
for select
to authenticated
using (
  agent_id = auth.uid()
  and exists (
    select 1
    from public.operations o
    where o.id = public.operation_2fa_verifications.operation_id
      and public.can_access_operation(o.id, o.tenant_id)
  )
);

drop policy if exists "Operation 2fa attempts own scoped read" on public.operation_2fa_attempts;
create policy "Operation 2fa attempts own scoped read"
on public.operation_2fa_attempts
for select
to authenticated
using (
  agent_id = auth.uid()
  and exists (
    select 1
    from public.operations o
    where o.id = public.operation_2fa_attempts.operation_id
      and public.can_access_operation(o.id, o.tenant_id)
  )
);

create or replace function public.can_access_operation_by_id(p_operation_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
set row_security to 'off'
as $function$
  select exists (
    select 1
    from public.operations o
    where o.id = p_operation_id
      and public.can_access_operation(o.id, o.tenant_id)
  )
$function$;

create or replace function public.get_operation_security_settings(
  p_operation_id uuid
)
returns table (
  operation_id uuid,
  totp_enabled boolean,
  totp_issuer text,
  totp_label text,
  totp_rotated_at timestamptz,
  has_pending_setup boolean
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
    p_operation_id,
    coalesce(oss.totp_enabled, false),
    coalesce(oss.totp_issuer, 'AK8 CRM'),
    oss.totp_label,
    oss.totp_rotated_at,
    coalesce(oss.pending_setup_expires_at > now(), false)
  from (select p_operation_id as id) op
  left join public.operation_security_settings oss
    on oss.operation_id = op.id;
end;
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
  join public.operation_security_settings oss
    on oss.operation_id = v.operation_id
  where v.operation_id = p_operation_id
    and v.agent_id = auth.uid()
    and v.expires_at > now()
    and (
      oss.totp_rotated_at is null
      or v.secret_version is null
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

revoke all on function public.can_access_operation_by_id(uuid) from public;
revoke all on function public.can_access_operation_by_id(uuid) from anon;
grant execute on function public.can_access_operation_by_id(uuid) to authenticated;
grant execute on function public.can_access_operation_by_id(uuid) to service_role;

revoke all on function public.get_operation_security_settings(uuid) from public;
revoke all on function public.get_operation_security_settings(uuid) from anon;
grant execute on function public.get_operation_security_settings(uuid) to authenticated;
grant execute on function public.get_operation_security_settings(uuid) to service_role;

revoke all on function public.get_operation_2fa_status(uuid) from public;
revoke all on function public.get_operation_2fa_status(uuid) from anon;
grant execute on function public.get_operation_2fa_status(uuid) to authenticated;
grant execute on function public.get_operation_2fa_status(uuid) to service_role;

commit;
