alter table public.scheduled_calls
  add column if not exists scheduled_timezone text;

update public.scheduled_calls
set scheduled_timezone = 'America/Bogota'
where scheduled_timezone is null
   or btrim(scheduled_timezone) = '';

alter table public.scheduled_calls
  alter column scheduled_timezone set default 'America/Bogota';

alter table public.scheduled_calls
  alter column scheduled_timezone set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'scheduled_calls_scheduled_timezone_not_blank'
      and conrelid = 'public.scheduled_calls'::regclass
  ) then
    alter table public.scheduled_calls
      add constraint scheduled_calls_scheduled_timezone_not_blank
      check (btrim(scheduled_timezone) <> '');
  end if;
end
$$;
