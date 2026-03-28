begin;

update public.clients
set
  status_code = case upper(coalesce(status_code, ''))
    when 'SC' then 'NU'
    when 'NA' then 'NC'
    when 'NI' then 'NI'
    when 'CB' then 'SG'
    when 'WN' then 'NE'
    when 'HU' then 'LD'
    when 'CP' then 'SG'
    when 'NU' then 'NU'
    when 'LD' then 'LD'
    when 'DP' then 'DP'
    when 'SG' then 'SG'
    when 'NC' then 'NC'
    when 'NX' then 'NX'
    when 'NE' then 'NE'
    when 'RA' then 'RA'
    when 'FS' then 'FS'
    else case lower(coalesce(status_color, ''))
      when 'gray' then 'NU'
      when 'red' then 'NC'
      when 'yellow' then 'NI'
      when 'green' then 'DP'
      when 'blue' then 'SG'
      else 'NU'
    end
  end,
  status_color = case upper(coalesce(status_code, ''))
    when 'SC' then 'gray'
    when 'NA' then 'red'
    when 'NI' then 'yellow'
    when 'CB' then 'blue'
    when 'WN' then 'red'
    when 'HU' then 'blue'
    when 'CP' then 'blue'
    when 'NU' then 'gray'
    when 'LD' then 'blue'
    when 'DP' then 'green'
    when 'SG' then 'blue'
    when 'NC' then 'red'
    when 'NX' then 'red'
    when 'NE' then 'red'
    when 'RA' then 'yellow'
    when 'FS' then 'yellow'
    else 'gray'
  end
where status_code is null
   or upper(coalesce(status_code, '')) not in (
     'NU', 'LD', 'DP', 'SG', 'NC', 'NI', 'NX', 'NE', 'RA', 'FS'
   )
   or upper(coalesce(status_code, '')) in ('SC', 'NA', 'CB', 'WN', 'HU', 'CP');

alter table public.clients
  alter column status_code set default 'NU';

alter table public.clients
  drop constraint if exists clients_status_code_check;

alter table public.clients
  add constraint clients_status_code_check
  check (
    (status_code)::text = any (
      (
        array[
          'NU'::character varying,
          'LD'::character varying,
          'DP'::character varying,
          'SG'::character varying,
          'NC'::character varying,
          'NI'::character varying,
          'NX'::character varying,
          'NE'::character varying,
          'RA'::character varying,
          'FS'::character varying
        ]
      )::text[]
    )
  ) not valid;

alter table public.clients
  validate constraint clients_status_code_check;

commit;
