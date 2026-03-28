do $$
begin
  insert into public.tenant_settings (
    tenant_id,
    product_name,
    platform_label,
    brand_preset_id
  )
  select
    t.id,
    case
      when lower(t.slug) = 'default' then 'AK8 CRM'
      when lower(t.slug) like '%light%' then 'Light CRM'
      when lower(t.slug) like '%shade%' then 'Shade CRM'
      else t.name
    end,
    'AK8 CRM',
    case
      when lower(t.slug) = 'default' then 'call-master'
      when lower(t.slug) like '%light%' then 'atlas-finance'
      when lower(t.slug) like '%shade%' then 'cobalt-ops'
      else 'call-master'
    end
  from public.tenants t
  where lower(t.slug) = 'default'
    or lower(t.slug) like '%light%'
    or lower(t.slug) like '%shade%'
  on conflict (tenant_id) do nothing;

  update public.tenant_settings ts
  set
    product_name = case
      when lower(t.slug) = 'default' then 'AK8 CRM'
      when lower(t.slug) like '%light%' then 'Light CRM'
      when lower(t.slug) like '%shade%' then 'Shade CRM'
      else ts.product_name
    end,
    platform_label = 'AK8 CRM',
    brand_preset_id = case
      when lower(t.slug) = 'default' then 'call-master'
      when lower(t.slug) like '%light%' then 'atlas-finance'
      when lower(t.slug) like '%shade%' then 'cobalt-ops'
      else ts.brand_preset_id
    end,
    updated_at = now()
  from public.tenants t
  where ts.tenant_id = t.id
    and (
      lower(t.slug) = 'default'
      or lower(t.slug) like '%light%'
      or lower(t.slug) like '%shade%'
      or lower(coalesce(ts.product_name, '')) like '%light%'
      or lower(coalesce(ts.product_name, '')) like '%shade%'
      or lower(coalesce(ts.platform_label, '')) like '%light%'
      or lower(coalesce(ts.platform_label, '')) like '%shade%'
    );
end $$;
