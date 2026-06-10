begin;

create or replace function public.int_to_campaign_prefix(p_value integer)
returns text
language plpgsql
immutable
set search_path = public
as $function$
declare
  v_value integer := p_value;
  v_remainder integer;
  v_prefix text := '';
begin
  if p_value is null or p_value <= 0 then
    raise exception 'campaign prefix index must be positive';
  end if;

  while v_value > 0 loop
    v_remainder := (v_value - 1) % 26;
    v_prefix := chr(65 + v_remainder) || v_prefix;
    v_value := (v_value - 1) / 26;
  end loop;

  return v_prefix;
end;
$function$;

create or replace function public.import_clients_v1(
  p_clients jsonb,
  p_campaign_name text default null,
  p_operation_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
set row_security = off
as $function$
declare
  v_user_role text;
  v_user_operation_id uuid;
  v_user_active_operation_id uuid;
  v_target_operation_id uuid;
  v_target_tenant_id uuid;
  v_campaign_id uuid;
  v_campaign_prefix text;
  v_prefix_index integer := 1;
  v_inserted_count integer := 0;
  v_invalid_count integer := 0;
  v_batch_duplicate_count integer := 0;
  v_existing_duplicate_count integer := 0;
  v_errors text[] := '{}'::text[];
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select
    a.role,
    a.operation_id,
    a.active_operation_id
  into
    v_user_role,
    v_user_operation_id,
    v_user_active_operation_id
  from public.agents a
  where a.id = auth.uid()
    and a.is_active = true;

  if v_user_role is null then
    raise exception 'active agent profile not found';
  end if;

  if v_user_role not in ('dev', 'owner') then
    raise exception 'not allowed';
  end if;

  v_target_operation_id := coalesce(
    p_operation_id,
    v_user_active_operation_id,
    v_user_operation_id
  );

  if v_target_operation_id is null then
    raise exception 'operation id is required';
  end if;

  select o.tenant_id
  into v_target_tenant_id
  from public.operations o
  where o.id = v_target_operation_id;

  if v_target_tenant_id is null then
    raise exception 'target operation not found';
  end if;

  if not public.can_access_operation(v_target_operation_id, v_target_tenant_id) then
    raise exception 'operation not visible for current user';
  end if;

  if p_clients is null
     or jsonb_typeof(p_clients) <> 'array'
     or jsonb_array_length(p_clients) = 0 then
    return jsonb_build_object(
      'success', 0,
      'errors', jsonb_build_array('No se recibieron clientes para importar.'),
      'campaign_prefix', null
    );
  end if;

  perform pg_advisory_xact_lock(
    (('x' || substr(md5('import-clients:' || v_target_operation_id::text), 1, 16))::bit(64))::bigint
  );

  loop
    v_campaign_prefix := public.int_to_campaign_prefix(v_prefix_index);
    exit when not exists (
      select 1
      from public.campaigns c
      where c.operation_id = v_target_operation_id
        and c.prefix = v_campaign_prefix
    );
    v_prefix_index := v_prefix_index + 1;
  end loop;

  insert into public.campaigns (
    prefix,
    display_name,
    imported_at,
    operation_id,
    tenant_id
  )
  values (
    v_campaign_prefix,
    nullif(btrim(p_campaign_name), ''),
    now(),
    v_target_operation_id,
    v_target_tenant_id
  )
  returning id
  into v_campaign_id;

  drop table if exists tmp_import_clients_stage;

  create temporary table tmp_import_clients_stage
  on commit drop
  as
  select
    raw.ordinality::integer as idx,
    nullif(btrim(raw.item->>'first_name'), '') as first_name,
    nullif(btrim(raw.item->>'last_name'), '') as last_name,
    nullif(btrim(raw.item->>'email'), '') as email,
    public.normalize_email(raw.item->>'email') as normalized_email,
    nullif(btrim(raw.item->>'phone_number'), '') as phone_number,
    public.normalize_phone(raw.item->>'phone_number') as normalized_phone,
    nullif(btrim(raw.item->>'country'), '') as country,
    nullif(btrim(raw.item->>'source'), '') as source,
    nullif(btrim(raw.item->>'funnel'), '') as funnel,
    case
      when jsonb_typeof(raw.item->'deposit_amount') = 'number'
        then (raw.item->>'deposit_amount')::numeric
      when nullif(btrim(raw.item->>'deposit_amount'), '') ~ '^-?[0-9]+([.,][0-9]+)?$'
        then replace(raw.item->>'deposit_amount', ',', '.')::numeric
      else null
    end as deposit_amount,
    case
      when jsonb_typeof(raw.item->'net_deposit') = 'number'
        then (raw.item->>'net_deposit')::numeric
      when nullif(btrim(raw.item->>'net_deposit'), '') ~ '^-?[0-9]+([.,][0-9]+)?$'
        then replace(raw.item->>'net_deposit', ',', '.')::numeric
      else null
    end as net_deposit,
    case
      when jsonb_typeof(raw.item->'user_balance') = 'number'
        then (raw.item->>'user_balance')::numeric
      when nullif(btrim(raw.item->>'user_balance'), '') ~ '^-?[0-9]+([.,][0-9]+)?$'
        then replace(raw.item->>'user_balance', ',', '.')::numeric
      else null
    end as user_balance,
    case
      when nullif(btrim(raw.item->>'investment_date'), '') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        then (raw.item->>'investment_date')::date
      else null
    end as investment_date,
    case
      when coalesce(
        nullif(btrim(raw.item->>'first_name'), ''),
        nullif(btrim(raw.item->>'last_name'), ''),
        nullif(btrim(raw.item->>'email'), ''),
        nullif(btrim(raw.item->>'phone_number'), '')
      ) is null
      then 'missing_identity'
      else null
    end::text as skip_reason
  from jsonb_array_elements(p_clients) with ordinality as raw(item, ordinality);

  with duplicated_batch_rows as (
    select idx
    from (
      select
        s.idx,
        s.normalized_email,
        s.normalized_phone,
        row_number() over (
          partition by s.normalized_email
          order by s.idx
        ) as email_rank,
        row_number() over (
          partition by s.normalized_phone
          order by s.idx
        ) as phone_rank
      from tmp_import_clients_stage s
      where s.skip_reason is null
    ) ranked
    where (
      ranked.normalized_email is not null
      and ranked.email_rank > 1
    ) or (
      ranked.normalized_phone is not null
      and ranked.phone_rank > 1
    )
  )
  update tmp_import_clients_stage s
  set skip_reason = 'batch_duplicate'
  from duplicated_batch_rows d
  where s.idx = d.idx
    and s.skip_reason is null;

  update tmp_import_clients_stage s
  set skip_reason = 'existing_duplicate'
  where s.skip_reason is null
    and exists (
      select 1
      from public.clients c
      where c.operation_id = v_target_operation_id
        and (
          (s.normalized_email is not null and c.normalized_email = s.normalized_email)
          or (s.normalized_phone is not null and c.normalized_phone = s.normalized_phone)
        )
    );

  select count(*)
  into v_invalid_count
  from tmp_import_clients_stage
  where skip_reason = 'missing_identity';

  select count(*)
  into v_batch_duplicate_count
  from tmp_import_clients_stage
  where skip_reason = 'batch_duplicate';

  select count(*)
  into v_existing_duplicate_count
  from tmp_import_clients_stage
  where skip_reason = 'existing_duplicate';

  with numbered as (
    select
      s.*,
      row_number() over (order by s.idx) as seq
    from tmp_import_clients_stage s
    where s.skip_reason is null
  ),
  inserted as (
    insert into public.clients (
      first_name,
      last_name,
      email,
      phone_number,
      country,
      source,
      funnel,
      deposit_amount,
      net_deposit,
      user_balance,
      investment_date,
      serial,
      status,
      status_color,
      attempts,
      normalized_email,
      normalized_phone,
      campaign_id,
      operation_id,
      tenant_id
    )
    select
      n.first_name,
      n.last_name,
      n.email,
      n.phone_number,
      n.country,
      n.source,
      n.funnel,
      n.deposit_amount,
      n.net_deposit,
      n.user_balance,
      n.investment_date,
      v_campaign_prefix || lpad(n.seq::text, 4, '0'),
      'new',
      'gray',
      0,
      n.normalized_email,
      n.normalized_phone,
      v_campaign_id,
      v_target_operation_id,
      v_target_tenant_id
    from numbered n
    returning id
  )
  select count(*)
  into v_inserted_count
  from inserted;

  if v_inserted_count = 0 then
    delete from public.campaigns
    where id = v_campaign_id;
  end if;

  if v_invalid_count > 0 then
    v_errors := array_append(
      v_errors,
      format(
        'Se omitieron %s filas sin nombre, email o telefono util.',
        v_invalid_count
      )
    );
  end if;

  if v_batch_duplicate_count > 0 then
    v_errors := array_append(
      v_errors,
      format(
        'Se omitieron %s filas duplicadas dentro del archivo.',
        v_batch_duplicate_count
      )
    );
  end if;

  if v_existing_duplicate_count > 0 then
    v_errors := array_append(
      v_errors,
      format(
        'Se omitieron %s filas porque ya existian en la operacion.',
        v_existing_duplicate_count
      )
    );
  end if;

  if v_inserted_count = 0 and coalesce(array_length(v_errors, 1), 0) = 0 then
    v_errors := array_append(
      v_errors,
      'No se insertaron clientes nuevos con el archivo enviado.'
    );
  end if;

  return jsonb_build_object(
    'success', v_inserted_count,
    'errors', to_jsonb(v_errors),
    'campaign_prefix', case when v_inserted_count > 0 then v_campaign_prefix else null end
  );
end;
$function$;

revoke all on function public.int_to_campaign_prefix(integer) from public;
revoke all on function public.int_to_campaign_prefix(integer) from anon;
grant execute on function public.int_to_campaign_prefix(integer) to authenticated;
grant execute on function public.int_to_campaign_prefix(integer) to service_role;

revoke all on function public.import_clients_v1(jsonb, text, uuid) from public;
revoke all on function public.import_clients_v1(jsonb, text, uuid) from anon;
grant execute on function public.import_clients_v1(jsonb, text, uuid) to authenticated;
grant execute on function public.import_clients_v1(jsonb, text, uuid) to service_role;

commit;
