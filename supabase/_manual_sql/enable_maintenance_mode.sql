insert into public.app_settings ("key", value)
values (
  'maintenance',
  jsonb_build_object(
    'enabled', true,
    'message', 'Actualizacion interna en curso. Intenta nuevamente en unos minutos.'
  )
)
on conflict ("key") do update
set
  value = excluded.value,
  updated_at = now();
