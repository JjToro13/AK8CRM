begin;

drop index if exists public.clients_normalized_email_uniq;
drop index if exists public.clients_normalized_phone_uniq;

create unique index if not exists clients_operation_normalized_email_uniq
  on public.clients (operation_id, normalized_email)
  where operation_id is not null
    and normalized_email is not null
    and normalized_email <> '';

create unique index if not exists clients_operation_normalized_phone_uniq
  on public.clients (operation_id, normalized_phone)
  where operation_id is not null
    and normalized_phone is not null
    and normalized_phone <> '';

commit;
