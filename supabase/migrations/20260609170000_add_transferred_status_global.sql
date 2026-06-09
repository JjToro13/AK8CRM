insert into public.client_status_definitions (
  tenant_id,
  code,
  label,
  short_label,
  description,
  color_token,
  sort_order,
  is_system,
  is_active
)
values (
  null,
  'TR',
  'Transferido',
  'TR',
  'Marcador automatico al transferir un cliente entre agentes',
  'amber',
  95,
  true,
  true
)
on conflict do nothing;
