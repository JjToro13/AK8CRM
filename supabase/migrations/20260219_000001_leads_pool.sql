-- 1) Columnas nuevas
alter table public.clients
  add column if not exists normalized_email text,
  add column if not exists normalized_phone text,
  add column if not exists status text default 'new',
  add column if not exists assigned_to uuid,
  add column if not exists assigned_at timestamptz,
  add column if not exists assigned_by uuid;

-- 2) Índices
create index if not exists idx_clients_assigned_to on public.clients (assigned_to);
create index if not exists idx_clients_status on public.clients (status);

-- 3) Uniques parciales (dedupe real)
create unique index if not exists clients_normalized_email_uniq
on public.clients (normalized_email)
where normalized_email is not null and normalized_email <> '';

create unique index if not exists clients_normalized_phone_uniq
on public.clients (normalized_phone)
where normalized_phone is not null and normalized_phone <> '';

-- 4) Normalizadores simples
create or replace function public.normalize_email(p_email text)
returns text
language sql
immutable
as $$
  select nullif(lower(trim(p_email)), '');
$$;

create or replace function public.normalize_phone(p_phone text)
returns text
language sql
immutable
as $$
  select nullif(regexp_replace(coalesce(p_phone,''), '[^0-9]+', '', 'g'), '');
$$;

-- 5) RPC atómica anti-choque (asignación por prefijo de campaña opcional)
create or replace function public.assign_leads_atomic(
  p_agent_id uuid,
  p_count int,
  p_assigned_by uuid,
  p_campaign_prefix text default null
)
returns table (assigned_count int)
language plpgsql
as $$
declare
  v_count int := 0;
begin
  if not is_admin() then
    raise exception 'Only admins can assign leads';
  end if;

  if p_count is null or p_count <= 0 then
    return query select 0;
    return;
  end if;

  with picked as (
    select id
    from public.clients
    where assigned_to is null
      and (status = 'new' or status is null)
      and (p_campaign_prefix is null or serial like (p_campaign_prefix || '%'))
    order by created_at asc nulls last
    for update skip locked
    limit p_count
  )
  update public.clients c
     set assigned_to = p_agent_id,
         assigned_at = now(),
         assigned_by = p_assigned_by,
         status = 'assigned'
    from picked
   where c.id = picked.id;

  get diagnostics v_count = row_count;
  return query select v_count;
end;
$$;
