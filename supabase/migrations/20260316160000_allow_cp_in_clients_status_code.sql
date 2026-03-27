begin;

alter table "public"."clients"
  add column if not exists "status_code" character varying(20);

update "public"."clients"
set "status_code" = case
  when upper(coalesce("status_code", '')) in ('SC', 'NA', 'NI', 'CB', 'WN', 'HU', 'CP') then upper("status_code")
  when lower(coalesce("status_color", '')) = 'gray' then 'SC'
  when lower(coalesce("status_color", '')) = 'red' then 'NA'
  when lower(coalesce("status_color", '')) = 'yellow' then 'NI'
  when lower(coalesce("status_color", '')) in ('green', 'blue') then 'CB'
  else 'SC'
end
where "status_code" is null
   or upper("status_code") not in ('SC', 'NA', 'NI', 'CB', 'WN', 'HU', 'CP');

alter table "public"."clients"
  alter column "status_code" set default 'SC';

alter table "public"."clients"
  drop constraint if exists "clients_status_code_check";

alter table "public"."clients"
  add constraint "clients_status_code_check"
  check (
    (("status_code")::text = any ((
      array[
        'SC'::character varying,
        'NA'::character varying,
        'NI'::character varying,
        'CB'::character varying,
        'WN'::character varying,
        'HU'::character varying,
        'CP'::character varying
      ]
    )::text[]))
  ) not valid;

alter table "public"."clients"
  validate constraint "clients_status_code_check";

commit;
