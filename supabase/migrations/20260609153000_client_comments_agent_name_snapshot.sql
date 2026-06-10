begin;

alter table public.client_comments
  add column if not exists agent_name_snapshot text;

update public.client_comments cc
set agent_name_snapshot = a.name
from public.agents a
where a.id = cc.agent_id
  and (cc.agent_name_snapshot is null or btrim(cc.agent_name_snapshot) = '');

create or replace function public.set_client_comment_agent_name_snapshot()
returns trigger
language plpgsql
security definer
set search_path to 'public'
set row_security to 'off'
as $function$
begin
  if new.agent_id is null then
    return new;
  end if;

  if tg_op = 'INSERT'
     or new.agent_id is distinct from old.agent_id
     or new.agent_name_snapshot is null
     or btrim(new.agent_name_snapshot) = '' then
    select a.name
      into new.agent_name_snapshot
    from public.agents a
    where a.id = new.agent_id;
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_client_comments_agent_name_snapshot on public.client_comments;

create trigger trg_client_comments_agent_name_snapshot
before insert or update of agent_id, agent_name_snapshot
on public.client_comments
for each row
execute function public.set_client_comment_agent_name_snapshot();

comment on column public.client_comments.agent_name_snapshot is
  'Nombre visible del agente al momento de crear el comentario para preservar trazabilidad historica.';

revoke all on function public.set_client_comment_agent_name_snapshot() from public;
revoke all on function public.set_client_comment_agent_name_snapshot() from anon;
grant execute on function public.set_client_comment_agent_name_snapshot() to authenticated;
grant execute on function public.set_client_comment_agent_name_snapshot() to service_role;

commit;
