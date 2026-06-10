begin;

create unique index if not exists idx_campaigns_id
  on public.campaigns (id);

create unique index if not exists idx_campaigns_operation_prefix_unique
  on public.campaigns (operation_id, prefix);

do $$
begin
  if exists (
    select 1
    from pg_constraint c
    join pg_attribute a
      on a.attrelid = c.conrelid
     and a.attnum = any(c.conkey)
    where c.conrelid = 'public.campaigns'::regclass
      and c.contype = 'p'
      and c.conname = 'campaigns_pkey'
      and a.attname = 'prefix'
  ) then
    alter table public.campaigns
      drop constraint campaigns_pkey;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_attribute a
      on a.attrelid = c.conrelid
     and a.attnum = any(c.conkey)
    where c.conrelid = 'public.campaigns'::regclass
      and c.contype = 'p'
      and a.attname = 'id'
  ) then
    alter table public.campaigns
      add constraint campaigns_pkey primary key using index idx_campaigns_id;
  end if;
end $$;

commit;
