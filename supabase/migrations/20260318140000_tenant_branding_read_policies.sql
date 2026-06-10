grant select on public.tenants to authenticated;
grant select on public.tenant_settings to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'tenants'
      and policyname = 'Tenants scoped read'
  ) then
    create policy "Tenants scoped read"
    on public.tenants
    for select
    to authenticated
    using (
      exists (
        select 1
        from public.agents me
        left join public.operations op
          on op.id = me.operation_id
        where me.id = auth.uid()
          and me.is_active = true
          and (
            me.role in ('dev', 'super_admin')
            or op.tenant_id = public.tenants.id
          )
      )
    );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'tenant_settings'
      and policyname = 'Tenant settings scoped read'
  ) then
    create policy "Tenant settings scoped read"
    on public.tenant_settings
    for select
    to authenticated
    using (
      exists (
        select 1
        from public.agents me
        left join public.operations op
          on op.id = me.operation_id
        where me.id = auth.uid()
          and me.is_active = true
          and (
            me.role in ('dev', 'super_admin')
            or op.tenant_id = public.tenant_settings.tenant_id
          )
      )
    );
  end if;
end $$;
