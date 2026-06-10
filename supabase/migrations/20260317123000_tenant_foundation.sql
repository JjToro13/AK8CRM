create table if not exists public.tenants (
    id uuid primary key default gen_random_uuid(),
    slug text not null unique,
    name text not null,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.tenants owner to postgres;

create table if not exists public.tenant_settings (
    tenant_id uuid primary key references public.tenants(id) on delete cascade,
    product_name text,
    platform_label text,
    brand_preset_id text not null default 'call-master',
    enabled_modules jsonb not null default '[]'::jsonb,
    extra jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.tenant_settings owner to postgres;

create index if not exists idx_tenants_slug on public.tenants using btree (slug);

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'trg_tenants_updated_at'
  ) then
    create trigger trg_tenants_updated_at
    before update on public.tenants
    for each row
    execute function public.set_updated_at();
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgname = 'trg_tenant_settings_updated_at'
  ) then
    create trigger trg_tenant_settings_updated_at
    before update on public.tenant_settings
    for each row
    execute function public.set_updated_at();
  end if;
end $$;

alter table public.tenants enable row level security;
alter table public.tenant_settings enable row level security;

comment on table public.tenants is 'Empresa o tenant principal del CRM SaaS.';
comment on table public.tenant_settings is 'Configuracion comercial y visual por tenant.';

insert into public.tenants (slug, name)
values ('default', 'Default Tenant')
on conflict (slug) do nothing;

insert into public.tenant_settings (tenant_id, product_name, platform_label, brand_preset_id)
select t.id, 'Call Master', 'Mascara CRM', 'call-master'
from public.tenants t
where t.slug = 'default'
on conflict (tenant_id) do nothing;

do $$
declare
  v_default_tenant_id uuid;
begin
  select id
    into v_default_tenant_id
  from public.tenants
  where slug = 'default'
  limit 1;

  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'operations'
  ) then
    alter table public.operations
      add column if not exists tenant_id uuid;

    update public.operations
    set tenant_id = v_default_tenant_id
    where tenant_id is null;

    if not exists (
      select 1
      from pg_constraint
      where conname = 'operations_tenant_id_fkey'
    ) then
      alter table public.operations
        add constraint operations_tenant_id_fkey
        foreign key (tenant_id)
        references public.tenants(id)
        on delete restrict;
    end if;

    create index if not exists idx_operations_tenant_id
      on public.operations using btree (tenant_id);
  end if;
end $$;
