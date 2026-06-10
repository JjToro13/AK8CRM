insert into public.app_settings ("key", value)
values (
  'maintenance',
  jsonb_build_object(
    'enabled', false,
    'message', ''
  )
)
on conflict ("key") do update
set
  value = excluded.value,
  updated_at = now();
