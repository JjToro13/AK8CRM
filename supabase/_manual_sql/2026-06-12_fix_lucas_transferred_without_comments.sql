-- Corrige clientes marcados como TR por el bug de primera asignacion
-- en la campaña LUCAS, pero solo cuando no tienen gestion iniciada.
--
-- Criterio de correccion:
-- - campaña display_name = 'LUCAS'
-- - status_code = 'TR'
-- - sin comentarios
-- - sin last_comment_at
--
-- Este script:
-- 1. falla si encuentra 0 o mas de 1 campaña llamada LUCAS
-- 2. muestra el universo que cambiaria
-- 3. aplica el cambio a status_code = 'NU' / status_color = 'gray'

begin;

do $$
declare
  v_matches integer;
begin
  select count(*)
    into v_matches
  from public.campaigns
  where upper(coalesce(display_name, '')) = 'LUCAS';

  if v_matches = 0 then
    raise exception 'No se encontro ninguna campaña con display_name = LUCAS';
  end if;

  if v_matches > 1 then
    raise exception 'Se encontraron % campañas con display_name = LUCAS. Usa campaign_id explicito antes de continuar.', v_matches;
  end if;
end $$;

-- Preview del universo afectado
with target_campaign as (
  select id, prefix, display_name, operation_id
  from public.campaigns
  where upper(coalesce(display_name, '')) = 'LUCAS'
)
select
  tc.id as campaign_id,
  tc.prefix,
  tc.display_name,
  tc.operation_id,
  count(*) as clients_to_reset
from public.clients c
join target_campaign tc
  on tc.id = c.campaign_id
where c.status_code = 'TR'
  and coalesce(c.comment_count, 0) = 0
  and c.last_comment_at is null
group by tc.id, tc.prefix, tc.display_name, tc.operation_id;

-- Muestra una muestra de registros
with target_campaign as (
  select id
  from public.campaigns
  where upper(coalesce(display_name, '')) = 'LUCAS'
)
select
  c.id,
  c.serial,
  c.first_name,
  c.last_name,
  c.assigned_to,
  c.status_code,
  c.status_color,
  c.comment_count,
  c.last_comment_at,
  c.created_at
from public.clients c
join target_campaign tc
  on tc.id = c.campaign_id
where c.status_code = 'TR'
  and coalesce(c.comment_count, 0) = 0
  and c.last_comment_at is null
order by c.created_at desc
limit 50;

-- Aplicacion del cambio
with target_campaign as (
  select id
  from public.campaigns
  where upper(coalesce(display_name, '')) = 'LUCAS'
),
updated as (
  update public.clients c
     set status_code = 'NU',
         status_color = 'gray',
         updated_at = now()
    from target_campaign tc
   where c.campaign_id = tc.id
     and c.status_code = 'TR'
     and coalesce(c.comment_count, 0) = 0
     and c.last_comment_at is null
  returning c.id, c.serial
)
select count(*) as updated_clients
from updated;

commit;
