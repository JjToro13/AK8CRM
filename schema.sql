


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."agent_name_map"("p_agent_ids" "uuid"[]) RETURNS TABLE("id" "uuid", "label" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    SET "row_security" TO 'off'
    AS $$
  select a.id, a.name::text as label
  from public.agents a
  where a.id = any(p_agent_ids)
    and a.is_active is true
    and public.can_access_agent(a.id, a.operation_id, a.role::text);
$$;


ALTER FUNCTION "public"."agent_name_map"("p_agent_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."assign_leads_atomic"("p_agent_id" "uuid", "p_count" integer, "p_assigned_by" "uuid", "p_campaign_prefix" "text" DEFAULT NULL::"text") RETURNS TABLE("assigned_count" integer)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare
  v_count int := 0;
  v_operation_id uuid;
begin
  if not public.is_admin_like() then
    raise exception 'Only admin-like can assign leads';
  end if;

  v_operation_id := public.current_operation_id();

  if v_operation_id is null then
    raise exception 'No active operation selected';
  end if;

  if p_count is null or p_count <= 0 then
    return query select 0;
    return;
  end if;

  if not exists (
    select 1
    from public.agents a
    where a.id = p_agent_id
      and a.is_active = true
      and a.role = 'agent'
      and a.operation_id = v_operation_id
  ) then
    raise exception 'Target agent is not active in the current operation';
  end if;

  with picked as (
    select c.id
    from public.clients c
    where c.operation_id = v_operation_id
      and c.assigned_to is null
      and (c.status = 'new' or c.status is null)
      and (
        p_campaign_prefix is null
        or c.serial like (p_campaign_prefix || '%')
      )
    order by c.created_at asc nulls last
    for update skip locked
    limit p_count
  )
  update public.clients c
     set assigned_to = p_agent_id,
         assigned_at = now(),
         assigned_by = coalesce(auth.uid(), p_assigned_by),
         status = 'assigned'
    from picked
   where c.id = picked.id;

  get diagnostics v_count = row_count;
  return query select v_count;
end;
$$;


ALTER FUNCTION "public"."assign_leads_atomic"("p_agent_id" "uuid", "p_count" integer, "p_assigned_by" "uuid", "p_campaign_prefix" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."assign_leads_atomic_v2"("p_agent_id" "uuid", "p_count" integer, "p_assigned_by" "uuid", "p_campaign_id" "uuid" DEFAULT NULL::"uuid", "p_campaign_prefix" "text" DEFAULT NULL::"text") RETURNS TABLE("assigned_count" integer)
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare
  v_count int := 0;
  v_operation_id uuid;
  v_target_campaign_id uuid;
begin
  if not public.is_admin_like() then
    raise exception 'Only admin-like can assign leads';
  end if;

  v_operation_id := public.current_operation_id();

  if v_operation_id is null then
    raise exception 'No active operation selected';
  end if;

  if p_count is null or p_count <= 0 then
    return query select 0;
    return;
  end if;

  if not exists (
    select 1
    from public.agents a
    where a.id = p_agent_id
      and a.is_active = true
      and a.role = 'agent'
      and a.operation_id = v_operation_id
  ) then
    raise exception 'Target agent is not active in the current operation';
  end if;

  if p_campaign_id is not null then
    select c.id
      into v_target_campaign_id
    from public.campaigns c
    where c.id = p_campaign_id
      and c.operation_id = v_operation_id;

    if v_target_campaign_id is null then
      raise exception 'Target campaign is not visible in the current operation';
    end if;
  elsif p_campaign_prefix is not null then
    select c.id
      into v_target_campaign_id
    from public.campaigns c
    where c.operation_id = v_operation_id
      and c.prefix = p_campaign_prefix
    limit 1;
  end if;

  with picked as (
    select c.id
    from public.clients c
    where c.operation_id = v_operation_id
      and c.assigned_to is null
      and (c.status = 'new' or c.status is null)
      and (
        v_target_campaign_id is null
        or c.campaign_id = v_target_campaign_id
      )
      and (
        p_campaign_prefix is null
        or c.serial like (p_campaign_prefix || '%')
      )
    order by c.created_at asc nulls last
    for update skip locked
    limit p_count
  )
  update public.clients c
     set assigned_to = p_agent_id,
         assigned_at = now(),
         assigned_by = coalesce(auth.uid(), p_assigned_by),
         status = 'assigned'
    from picked
   where c.id = picked.id;

  get diagnostics v_count = row_count;
  return query select v_count;
end;
$$;


ALTER FUNCTION "public"."assign_leads_atomic_v2"("p_agent_id" "uuid", "p_count" integer, "p_assigned_by" "uuid", "p_campaign_id" "uuid", "p_campaign_prefix" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_access_agent"("p_agent_id" "uuid", "p_operation_id" "uuid", "p_role" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
  select
    p_agent_id = auth.uid()
    or exists (
      select 1
      from public.agents me
      join public.operations current_op
        on current_op.id = coalesce(me.active_operation_id, me.operation_id)
      join public.operations target_op
        on target_op.id = p_operation_id
      where me.id = auth.uid()
        and me.is_active = true
        and current_op.tenant_id is not null
        and current_op.tenant_id = target_op.tenant_id
        and (
          (me.role = 'dev' and p_role in ('super_admin', 'admin', 'agent'))
          or (me.role = 'super_admin' and p_role in ('admin', 'agent'))
          or (me.role = 'admin' and p_role = 'agent')
        )
    );
$$;


ALTER FUNCTION "public"."can_access_agent"("p_agent_id" "uuid", "p_operation_id" "uuid", "p_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_access_operation"("p_operation_id" "uuid", "p_tenant_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
  select exists (
    select 1
    from public.agents me
    left join public.operations myop
      on myop.id = me.operation_id
    where me.id = auth.uid()
      and me.is_active = true
      and (
        me.role in ('dev', 'super_admin')
        or me.operation_id = p_operation_id
        or (
          myop.tenant_id is not null
          and myop.tenant_id = p_tenant_id
        )
      )
  );
$$;


ALTER FUNCTION "public"."can_access_operation"("p_operation_id" "uuid", "p_tenant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_see_all_operations"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
  select exists (
    select 1
    from public.agents a
    where a.id = auth.uid()
      and a.is_active = true
      and a.role in ('dev','super_admin')
  );
$$;


ALTER FUNCTION "public"."can_see_all_operations"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_view_phone_number"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM agents WHERE id = auth.uid() AND role='admin');
END; $$;


ALTER FUNCTION "public"."can_view_phone_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_write_agent_role"("p_target_current_role" "text", "p_new_role" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
  select exists (
    select 1
    from public.agents me
    where me.id = auth.uid()
      and me.is_active = true
      and (
        (
          me.role = 'dev'
          and p_target_current_role in ('super_admin', 'admin', 'agent')
          and p_new_role in ('super_admin', 'admin', 'agent')
        )
        or (
          me.role = 'super_admin'
          and p_target_current_role in ('admin', 'agent')
          and p_new_role in ('admin', 'agent')
        )
        or (
          me.role = 'admin'
          and p_target_current_role = 'agent'
          and p_new_role = 'agent'
        )
      )
  );
$$;


ALTER FUNCTION "public"."can_write_agent_role"("p_target_current_role" "text", "p_new_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."clear_active_operation"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if not public.can_see_all_operations() then
    raise exception 'not allowed';
  end if;

  update public.agents
  set active_operation_id = null
  where id = auth.uid();
end;
$$;


ALTER FUNCTION "public"."clear_active_operation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_operation_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select coalesce(
    (select a.active_operation_id from public.agents a where a.id = auth.uid()),
    (select a.operation_id       from public.agents a where a.id = auth.uid())
  );
$$;


ALTER FUNCTION "public"."current_operation_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_role"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
  select a.role::text
  from public.agents a
  where a.id = auth.uid()
$$;


ALTER FUNCTION "public"."current_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."effective_operation_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
  select coalesce(a.active_operation_id, a.operation_id)
  from public.agents a
  where a.id = auth.uid();
$$;


ALTER FUNCTION "public"."effective_operation_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_client_serial"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
DECLARE new_serial VARCHAR(50); counter INTEGER := 1; campaign_prefix VARCHAR(10) := 'A';
BEGIN
  IF NEW.serial IS NOT NULL THEN RETURN NEW; END IF;
  SELECT COALESCE((SELECT SUBSTRING(serial FROM '^([A-Z]+)') FROM clients WHERE serial ~ '^[A-Z]+[0-9]+$' ORDER BY created_at DESC LIMIT 1),'A') INTO campaign_prefix;
  IF (SELECT COUNT(*) FROM clients WHERE serial LIKE campaign_prefix || '%') >= 9999 THEN
    campaign_prefix := CHR(ASCII(campaign_prefix) + 1);
    IF campaign_prefix > 'Z' THEN campaign_prefix := 'A' || campaign_prefix; END IF;
  END IF;
  LOOP
    new_serial := campaign_prefix || LPAD(counter::text, 4, '0');
    IF NOT EXISTS (SELECT 1 FROM clients WHERE serial = new_serial) THEN NEW.serial := new_serial; EXIT; END IF;
    counter := counter + 1;
    IF counter > 9999 THEN campaign_prefix := CHR(ASCII(campaign_prefix) + 1); IF campaign_prefix > 'Z' THEN campaign_prefix := 'A' || campaign_prefix; END IF; counter := 1; END IF;
  END LOOP;
  RETURN NEW;
END; $_$;


ALTER FUNCTION "public"."generate_client_serial"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_agent"("p_id" "uuid") RETURNS TABLE("id" "uuid", "name" "text", "email" "text", "role" "text", "is_active" boolean, "operation_id" "uuid", "active_operation_id" "uuid", "created_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
  select
    a.id,
    a.name,
    a.email,
    a.role::text,
    a.is_active,
    a.operation_id,
    a.active_operation_id,
    a.created_at
  from public.agents a
  where a.id = p_id
    and public.can_access_agent(a.id, a.operation_id, a.role::text)
  limit 1;
$$;


ALTER FUNCTION "public"."get_agent"("p_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_agent_assigned_counts"() RETURNS TABLE("agent_id" "uuid", "assigned_count" bigint)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select c.assigned_to as agent_id,
         count(*)::bigint as assigned_count
  from public.clients c
  where c.operation_id = public.current_operation_id()
    and c.assigned_to is not null
  group by c.assigned_to;
$$;


ALTER FUNCTION "public"."get_agent_assigned_counts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_available_campaigns"() RETURNS TABLE("campaign" "text", "available" bigint)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select left(c.serial, 1) as campaign,
         count(*)::bigint as available
  from public.clients c
  where c.operation_id = public.current_operation_id()
    and c.assigned_to is null
  group by 1
  order by 2 desc;
$$;


ALTER FUNCTION "public"."get_available_campaigns"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_available_campaigns_v2"("p_operation_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("campaign_id" "uuid", "prefix" "text", "display_name" "text", "available" bigint)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    ca.id as campaign_id,
    ca.prefix,
    ca.display_name,
    count(cl.id) filter (where cl.assigned_to is null) as available
  from public.campaigns ca
  left join public.clients cl
    on cl.campaign_id = ca.id
  where (
    p_operation_id is null
    or ca.operation_id = p_operation_id
  )
  group by ca.id, ca.prefix, ca.display_name
  order by ca.prefix;
$$;


ALTER FUNCTION "public"."get_available_campaigns_v2"("p_operation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_campaign_stats"() RETURNS TABLE("prefix" "text", "total_clients" bigint, "assigned_clients" bigint, "available_clients" bigint, "min_serial" "text", "max_serial" "text")
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  select
    left(c.serial, 1) as prefix,
    count(*)::bigint as total_clients,
    count(*) filter (where c.assigned_to is not null)::bigint as assigned_clients,
    count(*) filter (where c.assigned_to is null)::bigint as available_clients,
    min(c.serial) as min_serial,
    max(c.serial) as max_serial
  from public.clients c
  where c.operation_id = public.current_operation_id()
    and c.serial is not null
  group by 1
  order by 1;
$$;


ALTER FUNCTION "public"."get_campaign_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_campaign_stats_v2"("p_operation_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("campaign_id" "uuid", "prefix" "text", "total_clients" bigint, "assigned_clients" bigint, "available_clients" bigint, "min_serial" "text", "max_serial" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    ca.id as campaign_id,
    ca.prefix,
    count(cl.id) as total_clients,
    count(cl.id) filter (where cl.assigned_to is not null) as assigned_clients,
    count(cl.id) filter (where cl.assigned_to is null) as available_clients,
    min(cl.serial)::text as min_serial,
    max(cl.serial)::text as max_serial
  from public.campaigns ca
  left join public.clients cl
    on cl.campaign_id = ca.id
  where (
    p_operation_id is null
    or ca.operation_id = p_operation_id
  )
  group by ca.id, ca.prefix
  order by ca.prefix;
$$;


ALTER FUNCTION "public"."get_campaign_stats_v2"("p_operation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_invitation_codes_stats"() RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Verificar que el usuario es admin
  IF NOT EXISTS (
    SELECT 1 FROM agents
    WHERE email = auth.jwt() ->> 'email'
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT json_build_object(
    'total_codes', COUNT(*),
    'active_codes', COUNT(*) FILTER (WHERE is_active = true),
    'expired_codes', COUNT(*) FILTER (WHERE expires_at < now()),
    'fully_used_codes', COUNT(*) FILTER (WHERE max_uses IS NOT NULL AND current_uses >= max_uses),
    'total_uses', COALESCE(SUM(current_uses), 0)
  ) INTO v_result
  FROM invitation_codes;

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."get_invitation_codes_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_recent_calls"("p_agent_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" "uuid", "client_id" "uuid", "agent_id" "uuid", "start_time" timestamp with time zone, "end_time" timestamp with time zone, "status" character varying, "duration" integer, "created_at" timestamp with time zone, "client_first_name" character varying, "client_serial" character varying, "client_status_color" character varying, "agent_name" character varying)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_operation_id uuid;
begin
  v_operation_id := public.current_operation_id();

  return query
  select
    c.id,
    c.client_id,
    c.agent_id,
    c.start_time,
    c.end_time,
    c.status,
    c.duration,
    c.created_at,
    cl.first_name as client_first_name,
    cl.serial as client_serial,
    cl.status_color as client_status_color,
    a.name as agent_name
  from public.calls c
  join public.clients cl
    on cl.id = c.client_id
  join public.agents a
    on a.id = c.agent_id
  where (p_agent_id is null or c.agent_id = p_agent_id)
    and (
      (v_operation_id is not null and cl.operation_id = v_operation_id)
      or (v_operation_id is null and public.can_see_all_operations())
    )
  order by c.created_at desc
  limit 50;
end;
$$;


ALTER FUNCTION "public"."get_recent_calls"("p_agent_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_visible_operations"("p_tenant_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" "uuid", "slug" "text", "name" "text", "tenant_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_role text;
  v_operation_id uuid;
  v_tenant_id uuid;
begin
  select a.role, a.operation_id
    into v_role, v_operation_id
  from public.agents a
  where a.id = auth.uid()
    and a.is_active = true
  limit 1;

  if v_role is null then
    return;
  end if;

  if v_role in ('dev', 'super_admin') then
    return query
    select
      o.id,
      o.slug,
      o.name,
      o.tenant_id
    from public.operations o
    where p_tenant_id is null
       or o.tenant_id = p_tenant_id
    order by o.name;
    return;
  end if;

  select o.tenant_id
    into v_tenant_id
  from public.operations o
  where o.id = v_operation_id
  limit 1;

  if v_tenant_id is null then
    return;
  end if;

  return query
  select
    o.id,
    o.slug,
    o.name,
    o.tenant_id
  from public.operations o
  where o.tenant_id = v_tenant_id
  order by o.name;
end;
$$;


ALTER FUNCTION "public"."get_visible_operations"("p_tenant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_visible_tenants"() RETURNS TABLE("id" "uuid", "slug" "text", "name" "text", "product_name" "text", "brand_preset_id" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_role text;
  v_operation_id uuid;
  v_tenant_id uuid;
begin
  select a.role, a.operation_id
    into v_role, v_operation_id
  from public.agents a
  where a.id = auth.uid()
    and a.is_active = true
  limit 1;

  if v_role is null then
    return;
  end if;

  if v_role in ('dev', 'super_admin') then
    return query
    select
      t.id,
      t.slug,
      t.name,
      ts.product_name,
      ts.brand_preset_id
    from public.tenants t
    left join public.tenant_settings ts
      on ts.tenant_id = t.id
    order by coalesce(ts.product_name, t.name), t.name;
    return;
  end if;

  select o.tenant_id
    into v_tenant_id
  from public.operations o
  where o.id = v_operation_id
  limit 1;

  if v_tenant_id is null then
    return;
  end if;

  return query
  select
    t.id,
    t.slug,
    t.name,
    ts.product_name,
    ts.brand_preset_id
  from public.tenants t
  left join public.tenant_settings ts
    on ts.tenant_id = t.id
  where t.id = v_tenant_id
  order by coalesce(ts.product_name, t.name), t.name;
end;
$$;


ALTER FUNCTION "public"."get_visible_tenants"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_active_user"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
  select coalesce(a.is_active, false)
  from public.agents a
  where a.id = auth.uid()
$$;


ALTER FUNCTION "public"."is_active_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM agents WHERE id = auth.uid() AND role='admin');
END; $$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin_like"() RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.agents a
    where a.id = auth.uid()
      and a.is_active is true
      and a.role in ('admin','dev','super_admin')
  );
$$;


ALTER FUNCTION "public"."is_admin_like"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_agent"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM agents WHERE id = auth.uid() AND role='agent');
END; $$;


ALTER FUNCTION "public"."is_agent"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_dev"() RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select coalesce(public.current_role() = 'dev', false)
$$;


ALTER FUNCTION "public"."is_dev"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_operation_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  select public.current_role() in ('admin','dev','super_admin')
$$;


ALTER FUNCTION "public"."is_operation_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_operation_agent"() RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  select public.current_role() = 'agent'
$$;


ALTER FUNCTION "public"."is_operation_agent"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_super_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  select coalesce(public.current_role() = 'super_admin', false)
$$;


ALTER FUNCTION "public"."is_super_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."list_agents"() RETURNS TABLE("id" "uuid", "email" "text", "name" "text", "role" "text", "operation_id" "uuid", "is_active" boolean, "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "active_operation_id" "uuid")
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  select
    a.id,
    a.email,
    a.name,
    a.role,
    a.operation_id,
    a.is_active,
    a.created_at,
    a.updated_at,
    a.active_operation_id
  from public.agents a
  where a.operation_id is not null
    and public.can_access_agent(a.id, a.operation_id, a.role::text)
  order by a.name;
$$;


ALTER FUNCTION "public"."list_agents"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."move_campaign_clients_by_status"("p_source_campaign_id" "uuid", "p_target_campaign_id" "uuid", "p_status_codes" "text"[] DEFAULT NULL::"text"[], "p_reason" "text" DEFAULT NULL::"text", "p_notes" "text" DEFAULT NULL::"text") RETURNS TABLE("moved_count" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
declare
  v_source_operation_id uuid;
  v_target_operation_id uuid;
  v_target_tenant_id uuid;
  v_count integer := 0;
begin
  if not (public.can_see_all_operations() or public.is_operation_admin()) then
    raise exception 'not allowed';
  end if;

  if p_source_campaign_id is null or p_target_campaign_id is null then
    raise exception 'source and target campaigns are required';
  end if;

  select c.operation_id
    into v_source_operation_id
  from public.campaigns c
  where c.id = p_source_campaign_id;

  select c.operation_id, c.tenant_id
    into v_target_operation_id, v_target_tenant_id
  from public.campaigns c
  where c.id = p_target_campaign_id;

  if v_source_operation_id is null or v_target_operation_id is null then
    raise exception 'source or target campaign not found';
  end if;

  if v_source_operation_id <> v_target_operation_id then
    raise exception 'source and target campaigns must belong to the same operation';
  end if;

  if not public.can_see_all_operations()
     and v_target_operation_id <> public.current_operation_id() then
    raise exception 'campaigns are outside current operation';
  end if;

  with candidates as (
    select c.id, c.campaign_id as from_campaign_id
    from public.clients c
    where c.campaign_id = p_source_campaign_id
      and c.operation_id = v_target_operation_id
      and (
        p_status_codes is null
        or c.status_code = any(p_status_codes)
      )
      and c.campaign_id is distinct from p_target_campaign_id
  ),
  updated as (
    update public.clients c
       set campaign_id = p_target_campaign_id,
           tenant_id = v_target_tenant_id,
           updated_at = now()
      from candidates x
     where c.id = x.id
    returning c.id, x.from_campaign_id
  ),
  logged as (
    insert into public.client_campaign_movements (
      client_id,
      from_campaign_id,
      to_campaign_id,
      reason,
      notes,
      moved_by
    )
    select
      u.id,
      u.from_campaign_id,
      p_target_campaign_id,
      coalesce(p_reason, 'status move'),
      p_notes,
      auth.uid()
    from updated u
    returning 1
  )
  select count(*)
    into v_count
  from logged;

  return query select coalesce(v_count, 0);
end;
$$;


ALTER FUNCTION "public"."move_campaign_clients_by_status"("p_source_campaign_id" "uuid", "p_target_campaign_id" "uuid", "p_status_codes" "text"[], "p_reason" "text", "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."move_clients_to_campaign"("p_client_ids" "uuid"[], "p_target_campaign_id" "uuid", "p_reason" "text" DEFAULT NULL::"text", "p_notes" "text" DEFAULT NULL::"text") RETURNS TABLE("moved_count" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
declare
  v_target_operation_id uuid;
  v_target_tenant_id uuid;
  v_count integer := 0;
begin
  if not (public.can_see_all_operations() or public.is_operation_admin()) then
    raise exception 'not allowed';
  end if;

  if p_target_campaign_id is null then
    raise exception 'target campaign is required';
  end if;

  select c.operation_id, c.tenant_id
    into v_target_operation_id, v_target_tenant_id
  from public.campaigns c
  where c.id = p_target_campaign_id;

  if v_target_operation_id is null then
    raise exception 'target campaign not found';
  end if;

  if not public.can_see_all_operations()
     and v_target_operation_id <> public.current_operation_id() then
    raise exception 'target campaign is outside current operation';
  end if;

  with candidates as (
    select c.id, c.campaign_id as from_campaign_id
    from public.clients c
    where c.id = any(coalesce(p_client_ids, '{}'::uuid[]))
      and c.operation_id = v_target_operation_id
      and c.campaign_id is distinct from p_target_campaign_id
  ),
  updated as (
    update public.clients c
       set campaign_id = p_target_campaign_id,
           tenant_id = v_target_tenant_id,
           updated_at = now()
      from candidates x
     where c.id = x.id
    returning c.id, x.from_campaign_id
  ),
  logged as (
    insert into public.client_campaign_movements (
      client_id,
      from_campaign_id,
      to_campaign_id,
      reason,
      notes,
      moved_by
    )
    select
      u.id,
      u.from_campaign_id,
      p_target_campaign_id,
      p_reason,
      p_notes,
      auth.uid()
    from updated u
    returning 1
  )
  select count(*)
    into v_count
  from logged;

  return query select coalesce(v_count, 0);
end;
$$;


ALTER FUNCTION "public"."move_clients_to_campaign"("p_client_ids" "uuid"[], "p_target_campaign_id" "uuid", "p_reason" "text", "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."my_agent"() RETURNS TABLE("id" "uuid", "role" "text", "is_active" boolean, "operation_id" "uuid", "active_operation_id" "uuid", "name" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
  select
    a.id,
    a.role::text,
    a.is_active,
    a.operation_id,
    a.active_operation_id,
    a.name
  from public.agents a
  where a.id = auth.uid()
  limit 1;
$$;


ALTER FUNCTION "public"."my_agent"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."normalize_email"("p_email" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'public'
    AS $$
  select nullif(lower(trim(p_email)), '');
$$;


ALTER FUNCTION "public"."normalize_email"("p_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."normalize_phone"("p_phone" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'public'
    AS $$
  select nullif(regexp_replace(coalesce(p_phone,''), '[^0-9]+', '', 'g'), '');
$$;


ALTER FUNCTION "public"."normalize_phone"("p_phone" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."operation_code"("p_operation_id" "uuid") RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
  select o.slug::text
  from public.operations o
  where o.id = p_operation_id
  limit 1;
$$;


ALTER FUNCTION "public"."operation_code"("p_operation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."operation_slug"("p_operation_id" "uuid") RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
  select o.slug::text
  from public.operations o
  where o.id = p_operation_id
  limit 1;
$$;


ALTER FUNCTION "public"."operation_slug"("p_operation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_active_operation"("p_operation_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  r text;
begin
  select role
    into r
  from public.agents
  where id = auth.uid()
    and is_active = true;

  if r not in ('dev', 'super_admin') then
    raise exception 'not allowed';
  end if;

  if p_operation_id is null then
    raise exception 'operation id is required';
  end if;

  if not public.can_access_operation(
    p_operation_id,
    (select o.tenant_id from public.operations o where o.id = p_operation_id)
  ) then
    raise exception 'operation not visible for current user';
  end if;

  update public.agents
  set active_operation_id = p_operation_id,
      updated_at = now()
  where id = auth.uid();
end;
$$;


ALTER FUNCTION "public"."set_active_operation"("p_operation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_comment_operation"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  select c.operation_id
    into new.operation_id
  from public.clients c
  where c.id = new.client_id;

  return new;
end;
$$;


ALTER FUNCTION "public"."set_comment_operation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_campaign_tenant_scope"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare
  v_tenant_id uuid;
begin
  if new.operation_id is null then
    return new;
  end if;

  select o.tenant_id
    into v_tenant_id
  from public.operations o
  where o.id = new.operation_id;

  if v_tenant_id is null then
    raise exception 'campaign operation has no tenant';
  end if;

  if new.tenant_id is null then
    new.tenant_id := v_tenant_id;
  elsif new.tenant_id <> v_tenant_id then
    raise exception 'campaign tenant does not match operation tenant';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."sync_campaign_tenant_scope"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_client_campaign_scope"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare
  v_campaign_id uuid;
  v_campaign_operation_id uuid;
  v_campaign_tenant_id uuid;
begin
  if new.campaign_id is not null then
    select c.id, c.operation_id, c.tenant_id
      into v_campaign_id, v_campaign_operation_id, v_campaign_tenant_id
    from public.campaigns c
    where c.id = new.campaign_id;

    if v_campaign_id is null then
      raise exception 'campaign_id does not exist';
    end if;

    if new.operation_id is null then
      new.operation_id := v_campaign_operation_id;
    elsif new.operation_id <> v_campaign_operation_id then
      raise exception 'client campaign does not match operation';
    end if;

    if new.tenant_id is null then
      new.tenant_id := v_campaign_tenant_id;
    elsif new.tenant_id <> v_campaign_tenant_id then
      raise exception 'client campaign does not match tenant';
    end if;
  end if;

  if new.operation_id is not null and new.tenant_id is null then
    select o.tenant_id
      into new.tenant_id
    from public.operations o
    where o.id = new.operation_id;
  end if;

  if new.campaign_id is null
     and new.operation_id is not null
     and new.serial is not null then
    select c.id, c.tenant_id
      into v_campaign_id, v_campaign_tenant_id
    from public.campaigns c
    where c.operation_id = new.operation_id
      and new.serial like (c.prefix || '%')
    order by length(c.prefix) desc, c.created_at asc, c.id
    limit 1;

    if v_campaign_id is not null then
      new.campaign_id := v_campaign_id;
      if new.tenant_id is null then
        new.tenant_id := v_campaign_tenant_id;
      end if;
    end if;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."sync_client_campaign_scope"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_scheduled_call_context"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare
  v_client_tenant_id uuid;
  v_client_operation_id uuid;
  v_client_campaign_id uuid;
  v_agent_operation_id uuid;
  v_agent_is_active boolean;
  v_campaign_tenant_id uuid;
  v_campaign_operation_id uuid;
begin
  select
    c.tenant_id,
    c.operation_id,
    c.campaign_id
  into
    v_client_tenant_id,
    v_client_operation_id,
    v_client_campaign_id
  from public.clients c
  where c.id = new.client_id;

  if v_client_operation_id is null then
    raise exception 'client not found or missing operation context';
  end if;

  select
    a.operation_id,
    a.is_active
  into
    v_agent_operation_id,
    v_agent_is_active
  from public.agents a
  where a.id = new.agent_id;

  if v_agent_operation_id is null then
    raise exception 'agent not found';
  end if;

  if coalesce(v_agent_is_active, false) = false then
    raise exception 'agent is not active';
  end if;

  if v_agent_operation_id <> v_client_operation_id then
    raise exception 'agent and client must belong to the same operation';
  end if;

  if new.campaign_id is null then
    new.campaign_id := v_client_campaign_id;
  end if;

  if new.campaign_id is not null then
    select
      ca.tenant_id,
      ca.operation_id
    into
      v_campaign_tenant_id,
      v_campaign_operation_id
    from public.campaigns ca
    where ca.id = new.campaign_id;

    if v_campaign_operation_id is null then
      raise exception 'campaign not found';
    end if;

    if v_campaign_operation_id <> v_client_operation_id
       or v_campaign_tenant_id <> v_client_tenant_id then
      raise exception 'campaign context does not match client context';
    end if;
  end if;

  new.tenant_id := v_client_tenant_id;
  new.operation_id := v_client_operation_id;
  new.updated_at := now();

  if tg_op = 'INSERT' then
    new.created_by := coalesce(new.created_by, auth.uid());
    new.created_at := coalesce(new.created_at, now());
  end if;

  if new.status = 'attended' and new.attended_at is null then
    new.attended_at := now();
  elsif new.status <> 'attended' then
    new.attended_at := null;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."sync_scheduled_call_context"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_agent"("p_id" "uuid", "p_name" "text", "p_role" "text", "p_is_active" boolean) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
declare
  v_target_role text;
  v_target_operation_id uuid;
  v_next_role text;
begin
  select a.role::text, a.operation_id
    into v_target_role, v_target_operation_id
  from public.agents a
  where a.id = p_id;

  if v_target_role is null then
    raise exception 'Agent not found';
  end if;

  if not public.can_access_agent(p_id, v_target_operation_id, v_target_role) then
    raise exception 'Not allowed';
  end if;

  v_next_role := coalesce(nullif(trim(p_role), ''), v_target_role);

  if not public.can_write_agent_role(v_target_role, v_next_role) then
    raise exception 'Role change not allowed';
  end if;

  update public.agents
  set
    name = coalesce(nullif(trim(p_name), ''), name),
    role = v_next_role::text,
    is_active = coalesce(p_is_active, is_active),
    updated_at = now()
  where id = p_id;
end;
$$;


ALTER FUNCTION "public"."update_agent"("p_id" "uuid", "p_name" "text", "p_role" "text", "p_is_active" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_agent_assignments_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;


ALTER FUNCTION "public"."update_agent_assignments_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_agent_did_credentials_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;


ALTER FUNCTION "public"."update_agent_did_credentials_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_client_last_comment"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  update public.clients
  set
    last_comment = new.comment,
    last_comment_at = new.created_at,
    last_comment_agent = new.agent_id,
    comment_count = comment_count + 1
  where id = new.client_id;

  return new;
end;
$$;


ALTER FUNCTION "public"."update_client_last_comment"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_invitation_codes_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_invitation_codes_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_agent"("p_id" "uuid", "p_name" "text", "p_role" "text", "p_is_active" boolean) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
begin
  perform public.update_agent(
    p_id,
    p_name,
    p_role,
    p_is_active
  );
end;
$$;


ALTER FUNCTION "public"."upsert_agent"("p_id" "uuid", "p_name" "text", "p_role" "text", "p_is_active" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_invitation_code"("p_code" character varying) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_code_record invitation_codes%ROWTYPE;
  v_result JSON;
BEGIN
  -- Buscar el código de invitación
  SELECT * INTO v_code_record
  FROM invitation_codes
  WHERE code = p_code
  AND is_active = true
  AND (expires_at IS NULL OR expires_at > now())
  FOR UPDATE;

  -- Si no existe el código o está inactivo/expirado
  IF NOT FOUND THEN
    RETURN json_build_object(
      'valid', false,
      'message', 'Código de invitación inválido o expirado'
    );
  END IF;

  -- Verificar si ha alcanzado el máximo de usos
  IF v_code_record.max_uses IS NOT NULL AND v_code_record.current_uses >= v_code_record.max_uses THEN
    RETURN json_build_object(
      'valid', false,
      'message', 'Este código de invitación ha alcanzado su límite de usos'
    );
  END IF;

  -- Incrementar el contador de usos
  UPDATE invitation_codes
  SET current_uses = current_uses + 1,
      updated_at = now()
  WHERE id = v_code_record.id;

  -- Retornar resultado exitoso
  RETURN json_build_object(
    'valid', true,
    'message', 'Código de invitación válido',
    'code_id', v_code_record.id
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'valid', false,
      'message', 'Error al validar el código: ' || SQLERRM
    );
END;
$$;


ALTER FUNCTION "public"."validate_invitation_code"("p_code" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."whoami"() RETURNS json
    LANGUAGE "sql" STABLE
    AS $$
  select json_build_object(
    'role', auth.role(),
    'uid', auth.uid()
  );
$$;


ALTER FUNCTION "public"."whoami"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."admin_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "title" "text" NOT NULL,
    "details" "text" NOT NULL,
    "page" "text",
    "url" "text",
    "user_agent" "text",
    "tz" "text",
    "auth_user_id" "uuid",
    "operation_id" "uuid"
);


ALTER TABLE "public"."admin_reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agent_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "agent_id" "uuid" NOT NULL,
    "client_serial_start" character varying(50) NOT NULL,
    "client_serial_end" character varying(50) NOT NULL,
    "assigned_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT true,
    "operation_id" "uuid",
    CONSTRAINT "valid_serial_range" CHECK ((("client_serial_start")::"text" <= ("client_serial_end")::"text"))
);


ALTER TABLE "public"."agent_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agent_did_credentials" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "agent_id" "uuid" NOT NULL,
    "extension_number" character varying(50) NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."agent_did_credentials" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."agents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "email" character varying(255) NOT NULL,
    "role" character varying(20) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "preferred_email_account_id" integer,
    "operation_id" "uuid",
    "is_active" boolean DEFAULT true NOT NULL,
    "active_operation_id" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "agents_role_check" CHECK ((("role")::"text" = ANY ((ARRAY['dev'::character varying, 'super_admin'::character varying, 'admin'::character varying, 'agent'::character varying])::"text"[])))
);


ALTER TABLE "public"."agents" OWNER TO "postgres";


COMMENT ON COLUMN "public"."agents"."preferred_email_account_id" IS 'ID de la cuenta de email preferida del agente (1=Soporte, 2=Ventas, 3=Dirección, etc.)';



CREATE TABLE IF NOT EXISTS "public"."app_settings" (
    "key" "text" NOT NULL,
    "value" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."app_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."calls" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "agent_id" "uuid" NOT NULL,
    "start_time" timestamp with time zone DEFAULT "now"(),
    "end_time" timestamp with time zone,
    "status" character varying(20) DEFAULT 'in_progress'::character varying,
    "duration" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "operation_id" "uuid",
    CONSTRAINT "calls_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['in_progress'::character varying, 'completed'::character varying, 'failed'::character varying, 'no_answer'::character varying])::"text"[])))
);


ALTER TABLE "public"."calls" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."campaigns" (
    "prefix" "text" NOT NULL,
    "display_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_locked" boolean DEFAULT false NOT NULL,
    "locked_at" timestamp with time zone,
    "locked_by" "uuid",
    "imported_at" timestamp with time zone,
    "operation_id" "uuid" NOT NULL,
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid"
);


ALTER TABLE "public"."campaigns" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."client_campaign_movements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "from_campaign_id" "uuid",
    "to_campaign_id" "uuid" NOT NULL,
    "reason" "text",
    "notes" "text",
    "moved_by" "uuid",
    "moved_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."client_campaign_movements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."client_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "agent_id" "uuid" NOT NULL,
    "comment" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "operation_id" "uuid" NOT NULL
);


ALTER TABLE "public"."client_comments" OWNER TO "postgres";


COMMENT ON TABLE "public"."client_comments" IS 'Historial de comentarios de clientes con autor y fecha';



COMMENT ON COLUMN "public"."client_comments"."client_id" IS 'Cliente al que pertenece el comentario';



COMMENT ON COLUMN "public"."client_comments"."agent_id" IS 'Agente que escribió el comentario';



COMMENT ON COLUMN "public"."client_comments"."comment" IS 'Texto del comentario';



COMMENT ON COLUMN "public"."client_comments"."created_at" IS 'Fecha y hora de creación del comentario';



CREATE TABLE IF NOT EXISTS "public"."clients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "first_name" character varying(255),
    "last_name" character varying(255),
    "email" character varying(255),
    "phone_number" character varying(20),
    "country" character varying(255),
    "source" character varying(255),
    "funnel" character varying(255),
    "deposit_amount" numeric(15,2),
    "net_deposit" numeric(15,2),
    "user_balance" numeric(15,2),
    "investment_date" "date",
    "serial" character varying(50) NOT NULL,
    "status_color" character varying(20) DEFAULT 'gray'::character varying,
    "attempts" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "normalized_email" "text",
    "normalized_phone" "text",
    "status" "text" DEFAULT 'new'::"text",
    "assigned_to" "uuid",
    "assigned_at" timestamp with time zone,
    "assigned_by" "uuid",
    "operation_id" "uuid" NOT NULL,
    "status_code" "text" DEFAULT 'SC'::"text",
    "campaign_id" "uuid",
    "last_comment" "text",
    "last_comment_at" timestamp with time zone,
    "last_comment_agent" "uuid",
    "comment_count" integer DEFAULT 0,
    "tenant_id" "uuid",
    CONSTRAINT "clients_status_code_check" CHECK (("status_code" = ANY (ARRAY[('SC'::character varying)::"text", ('NA'::character varying)::"text", ('NI'::character varying)::"text", ('CB'::character varying)::"text", ('WN'::character varying)::"text", ('HU'::character varying)::"text", ('CP'::character varying)::"text"]))),
    CONSTRAINT "clients_status_color_check" CHECK ((("status_color")::"text" = ANY ((ARRAY['gray'::character varying, 'red'::character varying, 'yellow'::character varying, 'green'::character varying, 'blue'::character varying])::"text"[])))
);


ALTER TABLE "public"."clients" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "agent_id" "uuid" NOT NULL,
    "subject" "text" NOT NULL,
    "message" "text" NOT NULL,
    "sent_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "email_account_id" integer,
    "from_email" "text",
    "operation_id" "uuid"
);


ALTER TABLE "public"."email_logs" OWNER TO "postgres";


COMMENT ON COLUMN "public"."email_logs"."email_account_id" IS 'ID de la cuenta de email utilizada (1=Soporte, 2=Ventas, 3=Dirección)';



COMMENT ON COLUMN "public"."email_logs"."from_email" IS 'Email desde el que se envió el mensaje';



CREATE TABLE IF NOT EXISTS "public"."invitation_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" character varying(50) NOT NULL,
    "description" "text",
    "max_uses" integer DEFAULT 1,
    "current_uses" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "expires_at" timestamp with time zone,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "operation_id" "uuid"
);


ALTER TABLE "public"."invitation_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."operations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "tenant_id" "uuid"
);


ALTER TABLE "public"."operations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scheduled_calls" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "operation_id" "uuid" NOT NULL,
    "campaign_id" "uuid",
    "client_id" "uuid" NOT NULL,
    "agent_id" "uuid" NOT NULL,
    "title" "text",
    "notes" "text",
    "outcome_notes" "text",
    "status" "text" DEFAULT 'scheduled'::"text" NOT NULL,
    "scheduled_for" timestamp with time zone NOT NULL,
    "attended_at" timestamp with time zone,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "scheduled_timezone" "text" DEFAULT 'America/Bogota'::"text" NOT NULL,
    CONSTRAINT "scheduled_calls_scheduled_timezone_not_blank" CHECK (("btrim"("scheduled_timezone") <> ''::"text")),
    CONSTRAINT "scheduled_calls_status_check" CHECK (("status" = ANY (ARRAY['scheduled'::"text", 'attended'::"text", 'postponed'::"text", 'missed'::"text"])))
);


ALTER TABLE "public"."scheduled_calls" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tenant_settings" (
    "tenant_id" "uuid" NOT NULL,
    "product_name" "text",
    "platform_label" "text",
    "brand_preset_id" "text" DEFAULT 'call-master'::"text" NOT NULL,
    "enabled_modules" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "extra" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tenant_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."tenant_settings" IS 'Configuracion comercial y visual por tenant.';



CREATE TABLE IF NOT EXISTS "public"."tenants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "name" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tenants" OWNER TO "postgres";


COMMENT ON TABLE "public"."tenants" IS 'Empresa o tenant principal del CRM SaaS.';



CREATE TABLE IF NOT EXISTS "public"."user_operation_context" (
    "user_id" "uuid" NOT NULL,
    "active_operation_id" "uuid" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_operation_context" OWNER TO "postgres";


ALTER TABLE ONLY "public"."admin_reports"
    ADD CONSTRAINT "admin_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agent_assignments"
    ADD CONSTRAINT "agent_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agent_did_credentials"
    ADD CONSTRAINT "agent_did_credentials_agent_id_key" UNIQUE ("agent_id");



ALTER TABLE ONLY "public"."agent_did_credentials"
    ADD CONSTRAINT "agent_did_credentials_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."agents"
    ADD CONSTRAINT "agents_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."agents"
    ADD CONSTRAINT "agents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."app_settings"
    ADD CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."calls"
    ADD CONSTRAINT "calls_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."campaigns"
    ADD CONSTRAINT "campaigns_pkey" PRIMARY KEY ("prefix");



ALTER TABLE ONLY "public"."client_campaign_movements"
    ADD CONSTRAINT "client_campaign_movements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_comments"
    ADD CONSTRAINT "client_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_serial_key" UNIQUE ("serial");



ALTER TABLE ONLY "public"."email_logs"
    ADD CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invitation_codes"
    ADD CONSTRAINT "invitation_codes_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."invitation_codes"
    ADD CONSTRAINT "invitation_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."operations"
    ADD CONSTRAINT "operations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."operations"
    ADD CONSTRAINT "operations_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."scheduled_calls"
    ADD CONSTRAINT "scheduled_calls_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenant_settings"
    ADD CONSTRAINT "tenant_settings_pkey" PRIMARY KEY ("tenant_id");



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."user_operation_context"
    ADD CONSTRAINT "user_operation_context_pkey" PRIMARY KEY ("user_id");



CREATE UNIQUE INDEX "clients_normalized_email_uniq" ON "public"."clients" USING "btree" ("normalized_email") WHERE (("normalized_email" IS NOT NULL) AND ("normalized_email" <> ''::"text"));



CREATE UNIQUE INDEX "clients_normalized_phone_uniq" ON "public"."clients" USING "btree" ("normalized_phone") WHERE (("normalized_phone" IS NOT NULL) AND ("normalized_phone" <> ''::"text"));



CREATE INDEX "idx_agent_assignments_agent_id" ON "public"."agent_assignments" USING "btree" ("agent_id");



CREATE INDEX "idx_agent_assignments_assigned_by" ON "public"."agent_assignments" USING "btree" ("assigned_by");



CREATE INDEX "idx_agent_did_credentials_active" ON "public"."agent_did_credentials" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_agent_did_credentials_agent_id" ON "public"."agent_did_credentials" USING "btree" ("agent_id");



CREATE INDEX "idx_agents_active_operation_id" ON "public"."agents" USING "btree" ("active_operation_id");



CREATE INDEX "idx_agents_operation_id" ON "public"."agents" USING "btree" ("operation_id");



CREATE INDEX "idx_calls_agent_id" ON "public"."calls" USING "btree" ("agent_id");



CREATE INDEX "idx_calls_client_id" ON "public"."calls" USING "btree" ("client_id");



CREATE UNIQUE INDEX "idx_campaigns_id" ON "public"."campaigns" USING "btree" ("id");



CREATE INDEX "idx_campaigns_operation_id" ON "public"."campaigns" USING "btree" ("operation_id");



CREATE INDEX "idx_campaigns_operation_prefix" ON "public"."campaigns" USING "btree" ("operation_id", "prefix");



CREATE UNIQUE INDEX "idx_campaigns_operation_prefix_unique" ON "public"."campaigns" USING "btree" ("operation_id", "prefix");



CREATE INDEX "idx_campaigns_tenant_operation" ON "public"."campaigns" USING "btree" ("tenant_id", "operation_id");



CREATE INDEX "idx_client_campaign_movements_client" ON "public"."client_campaign_movements" USING "btree" ("client_id", "moved_at" DESC);



CREATE INDEX "idx_client_campaign_movements_from_campaign" ON "public"."client_campaign_movements" USING "btree" ("from_campaign_id", "moved_at" DESC);



CREATE INDEX "idx_client_campaign_movements_to_campaign" ON "public"."client_campaign_movements" USING "btree" ("to_campaign_id", "moved_at" DESC);



CREATE INDEX "idx_client_comments_client_date" ON "public"."client_comments" USING "btree" ("client_id", "created_at" DESC);



CREATE INDEX "idx_client_comments_client_id" ON "public"."client_comments" USING "btree" ("client_id");



CREATE INDEX "idx_client_comments_created_at" ON "public"."client_comments" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_clients_assigned_to" ON "public"."clients" USING "btree" ("assigned_to");



CREATE INDEX "idx_clients_campaign_id" ON "public"."clients" USING "btree" ("campaign_id");



CREATE INDEX "idx_clients_country" ON "public"."clients" USING "btree" ("country");



CREATE INDEX "idx_clients_first_name" ON "public"."clients" USING "btree" ("first_name");



CREATE INDEX "idx_clients_funnel" ON "public"."clients" USING "btree" ("funnel");



CREATE INDEX "idx_clients_last_comment_at" ON "public"."clients" USING "btree" ("last_comment_at" DESC);



CREATE INDEX "idx_clients_last_name" ON "public"."clients" USING "btree" ("last_name");



CREATE INDEX "idx_clients_operation_campaign" ON "public"."clients" USING "btree" ("operation_id", "campaign_id");



CREATE INDEX "idx_clients_operation_created" ON "public"."clients" USING "btree" ("operation_id", "created_at" DESC);



CREATE INDEX "idx_clients_operation_serial" ON "public"."clients" USING "btree" ("operation_id", "serial");



CREATE INDEX "idx_clients_serial" ON "public"."clients" USING "btree" ("serial");



CREATE INDEX "idx_clients_source" ON "public"."clients" USING "btree" ("source");



CREATE INDEX "idx_clients_status" ON "public"."clients" USING "btree" ("status");



CREATE INDEX "idx_clients_status_code" ON "public"."clients" USING "btree" ("status_code");



CREATE INDEX "idx_clients_tenant_campaign" ON "public"."clients" USING "btree" ("tenant_id", "campaign_id");



CREATE INDEX "idx_clients_tenant_id" ON "public"."clients" USING "btree" ("tenant_id");



CREATE INDEX "idx_email_logs_agent_id" ON "public"."email_logs" USING "btree" ("agent_id");



CREATE INDEX "idx_email_logs_client_id" ON "public"."email_logs" USING "btree" ("client_id");



CREATE INDEX "idx_invitation_codes_active" ON "public"."invitation_codes" USING "btree" ("is_active");



CREATE INDEX "idx_invitation_codes_code" ON "public"."invitation_codes" USING "btree" ("code");



CREATE INDEX "idx_invitation_codes_created_by" ON "public"."invitation_codes" USING "btree" ("created_by");



CREATE INDEX "idx_invitation_codes_expires" ON "public"."invitation_codes" USING "btree" ("expires_at");



CREATE INDEX "idx_operations_tenant_id" ON "public"."operations" USING "btree" ("tenant_id");



CREATE INDEX "idx_scheduled_calls_agent_scheduled_for" ON "public"."scheduled_calls" USING "btree" ("agent_id", "scheduled_for");



CREATE INDEX "idx_scheduled_calls_campaign_id" ON "public"."scheduled_calls" USING "btree" ("campaign_id");



CREATE INDEX "idx_scheduled_calls_client_id" ON "public"."scheduled_calls" USING "btree" ("client_id");



CREATE INDEX "idx_scheduled_calls_operation_scheduled_for" ON "public"."scheduled_calls" USING "btree" ("operation_id", "scheduled_for");



CREATE INDEX "idx_scheduled_calls_status" ON "public"."scheduled_calls" USING "btree" ("status");



CREATE INDEX "idx_tenants_slug" ON "public"."tenants" USING "btree" ("slug");



CREATE OR REPLACE TRIGGER "generate_client_serial_trigger" BEFORE INSERT ON "public"."clients" FOR EACH ROW WHEN (("new"."serial" IS NULL)) EXECUTE FUNCTION "public"."generate_client_serial"();



CREATE OR REPLACE TRIGGER "set_comment_operation_trigger" BEFORE INSERT ON "public"."client_comments" FOR EACH ROW EXECUTE FUNCTION "public"."set_comment_operation"();



CREATE OR REPLACE TRIGGER "trg_agents_updated_at" BEFORE UPDATE ON "public"."agents" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_app_settings_updated_at" BEFORE UPDATE ON "public"."app_settings" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_campaigns_sync_tenant_scope" BEFORE INSERT OR UPDATE OF "operation_id", "tenant_id" ON "public"."campaigns" FOR EACH ROW EXECUTE FUNCTION "public"."sync_campaign_tenant_scope"();



CREATE OR REPLACE TRIGGER "trg_campaigns_updated_at" BEFORE UPDATE ON "public"."campaigns" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_clients_sync_campaign_scope" BEFORE INSERT OR UPDATE OF "serial", "operation_id", "tenant_id", "campaign_id" ON "public"."clients" FOR EACH ROW EXECUTE FUNCTION "public"."sync_client_campaign_scope"();



CREATE OR REPLACE TRIGGER "trg_sync_scheduled_call_context" BEFORE INSERT OR UPDATE ON "public"."scheduled_calls" FOR EACH ROW EXECUTE FUNCTION "public"."sync_scheduled_call_context"();



CREATE OR REPLACE TRIGGER "trg_tenant_settings_updated_at" BEFORE UPDATE ON "public"."tenant_settings" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_tenants_updated_at" BEFORE UPDATE ON "public"."tenants" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_update_client_last_comment" AFTER INSERT ON "public"."client_comments" FOR EACH ROW EXECUTE FUNCTION "public"."update_client_last_comment"();



CREATE OR REPLACE TRIGGER "trigger_update_agent_assignments_updated_at" BEFORE UPDATE ON "public"."agent_assignments" FOR EACH ROW EXECUTE FUNCTION "public"."update_agent_assignments_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_invitation_codes_updated_at" BEFORE UPDATE ON "public"."invitation_codes" FOR EACH ROW EXECUTE FUNCTION "public"."update_invitation_codes_updated_at"();



CREATE OR REPLACE TRIGGER "update_agent_did_credentials_updated_at" BEFORE UPDATE ON "public"."agent_did_credentials" FOR EACH ROW EXECUTE FUNCTION "public"."update_agent_did_credentials_updated_at"();



CREATE OR REPLACE TRIGGER "update_clients_updated_at" BEFORE UPDATE ON "public"."clients" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."admin_reports"
    ADD CONSTRAINT "admin_reports_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."admin_reports"
    ADD CONSTRAINT "admin_reports_operation_id_fkey" FOREIGN KEY ("operation_id") REFERENCES "public"."operations"("id");



ALTER TABLE ONLY "public"."agent_assignments"
    ADD CONSTRAINT "agent_assignments_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_assignments"
    ADD CONSTRAINT "agent_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "public"."agents"("id");



ALTER TABLE ONLY "public"."agent_assignments"
    ADD CONSTRAINT "agent_assignments_operation_id_fkey" FOREIGN KEY ("operation_id") REFERENCES "public"."operations"("id");



ALTER TABLE ONLY "public"."agent_did_credentials"
    ADD CONSTRAINT "agent_did_credentials_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agents"
    ADD CONSTRAINT "agents_operation_id_fkey" FOREIGN KEY ("operation_id") REFERENCES "public"."operations"("id");



ALTER TABLE ONLY "public"."calls"
    ADD CONSTRAINT "calls_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."calls"
    ADD CONSTRAINT "calls_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."calls"
    ADD CONSTRAINT "calls_operation_id_fkey" FOREIGN KEY ("operation_id") REFERENCES "public"."operations"("id");



ALTER TABLE ONLY "public"."campaigns"
    ADD CONSTRAINT "campaigns_operation_id_fkey" FOREIGN KEY ("operation_id") REFERENCES "public"."operations"("id");



ALTER TABLE ONLY "public"."campaigns"
    ADD CONSTRAINT "campaigns_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."client_campaign_movements"
    ADD CONSTRAINT "client_campaign_movements_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_campaign_movements"
    ADD CONSTRAINT "client_campaign_movements_from_campaign_id_fkey" FOREIGN KEY ("from_campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."client_campaign_movements"
    ADD CONSTRAINT "client_campaign_movements_moved_by_fkey" FOREIGN KEY ("moved_by") REFERENCES "public"."agents"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."client_campaign_movements"
    ADD CONSTRAINT "client_campaign_movements_to_campaign_id_fkey" FOREIGN KEY ("to_campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."client_comments"
    ADD CONSTRAINT "client_comments_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id");



ALTER TABLE ONLY "public"."client_comments"
    ADD CONSTRAINT "client_comments_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_comments"
    ADD CONSTRAINT "client_comments_operation_id_fkey" FOREIGN KEY ("operation_id") REFERENCES "public"."operations"("id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_last_comment_agent_fkey" FOREIGN KEY ("last_comment_agent") REFERENCES "public"."agents"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_operation_id_fkey" FOREIGN KEY ("operation_id") REFERENCES "public"."operations"("id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."email_logs"
    ADD CONSTRAINT "email_logs_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_logs"
    ADD CONSTRAINT "email_logs_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_logs"
    ADD CONSTRAINT "email_logs_operation_id_fkey" FOREIGN KEY ("operation_id") REFERENCES "public"."operations"("id");



ALTER TABLE ONLY "public"."invitation_codes"
    ADD CONSTRAINT "invitation_codes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."agents"("id");



ALTER TABLE ONLY "public"."invitation_codes"
    ADD CONSTRAINT "invitation_codes_operation_id_fkey" FOREIGN KEY ("operation_id") REFERENCES "public"."operations"("id");



ALTER TABLE ONLY "public"."operations"
    ADD CONSTRAINT "operations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."scheduled_calls"
    ADD CONSTRAINT "scheduled_calls_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."scheduled_calls"
    ADD CONSTRAINT "scheduled_calls_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."scheduled_calls"
    ADD CONSTRAINT "scheduled_calls_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scheduled_calls"
    ADD CONSTRAINT "scheduled_calls_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."agents"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."scheduled_calls"
    ADD CONSTRAINT "scheduled_calls_operation_id_fkey" FOREIGN KEY ("operation_id") REFERENCES "public"."operations"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."scheduled_calls"
    ADD CONSTRAINT "scheduled_calls_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."tenant_settings"
    ADD CONSTRAINT "tenant_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_operation_context"
    ADD CONSTRAINT "user_operation_context_active_operation_id_fkey" FOREIGN KEY ("active_operation_id") REFERENCES "public"."operations"("id");



ALTER TABLE ONLY "public"."user_operation_context"
    ADD CONSTRAINT "user_operation_context_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."agents"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can delete credentials" ON "public"."agent_did_credentials" FOR DELETE TO "authenticated" USING (((( SELECT "agents"."role"
   FROM "public"."agents"
  WHERE ("agents"."id" = ( SELECT "auth"."uid"() AS "uid"))))::"text" = 'admin'::"text"));



CREATE POLICY "Admins can insert credentials" ON "public"."agent_did_credentials" FOR INSERT TO "authenticated" WITH CHECK (((( SELECT "agents"."role"
   FROM "public"."agents"
  WHERE ("agents"."id" = ( SELECT "auth"."uid"() AS "uid"))))::"text" = 'admin'::"text"));



CREATE POLICY "Admins can update credentials" ON "public"."agent_did_credentials" FOR UPDATE TO "authenticated" USING (((( SELECT "agents"."role"
   FROM "public"."agents"
  WHERE ("agents"."id" = ( SELECT "auth"."uid"() AS "uid"))))::"text" = 'admin'::"text"));



CREATE POLICY "Admins can view all credentials" ON "public"."agent_did_credentials" FOR SELECT TO "authenticated" USING (((( SELECT "agents"."role"
   FROM "public"."agents"
  WHERE ("agents"."id" = ( SELECT "auth"."uid"() AS "uid"))))::"text" = 'admin'::"text"));



CREATE POLICY "Agents can update own comments" ON "public"."client_comments" FOR UPDATE USING (("agent_id" = "auth"."uid"())) WITH CHECK (("agent_id" = "auth"."uid"()));



CREATE POLICY "Agents insert comments in operation" ON "public"."client_comments" FOR INSERT WITH CHECK (("agent_id" = "auth"."uid"()));



CREATE POLICY "Operations scoped read" ON "public"."operations" FOR SELECT TO "authenticated" USING ("public"."can_access_operation"("id", "tenant_id"));



CREATE POLICY "Tenant settings scoped read" ON "public"."tenant_settings" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."agents" "me"
     LEFT JOIN "public"."operations" "op" ON (("op"."id" = "me"."operation_id")))
  WHERE (("me"."id" = "auth"."uid"()) AND ("me"."is_active" = true) AND ((("me"."role")::"text" = ANY ((ARRAY['dev'::character varying, 'super_admin'::character varying])::"text"[])) OR ("op"."tenant_id" = "tenant_settings"."tenant_id"))))));



CREATE POLICY "Tenants scoped read" ON "public"."tenants" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."agents" "me"
     LEFT JOIN "public"."operations" "op" ON (("op"."id" = "me"."operation_id")))
  WHERE (("me"."id" = "auth"."uid"()) AND ("me"."is_active" = true) AND ((("me"."role")::"text" = ANY ((ARRAY['dev'::character varying, 'super_admin'::character varying])::"text"[])) OR ("op"."tenant_id" = "tenants"."id"))))));



ALTER TABLE "public"."admin_reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."agent_assignments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "agent_assignments select scoped" ON "public"."agent_assignments" FOR SELECT TO "authenticated" USING (("public"."can_see_all_operations"() OR (("operation_id" = "public"."effective_operation_id"()) AND ("public"."is_operation_admin"() OR "public"."is_operation_agent"()))));



CREATE POLICY "agent_assignments write admin scoped" ON "public"."agent_assignments" TO "authenticated" USING (("public"."can_see_all_operations"() OR ("public"."is_operation_admin"() AND ("operation_id" = "public"."effective_operation_id"())))) WITH CHECK (("public"."can_see_all_operations"() OR ("public"."is_operation_admin"() AND ("operation_id" = "public"."effective_operation_id"()))));



ALTER TABLE "public"."agent_did_credentials" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."agents" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "agents delete blocked" ON "public"."agents" FOR DELETE TO "authenticated" USING (false);



CREATE POLICY "agents insert blocked" ON "public"."agents" FOR INSERT TO "authenticated" WITH CHECK (false);



CREATE POLICY "agents select scoped" ON "public"."agents" FOR SELECT TO "authenticated" USING ("public"."can_access_agent"("id", "operation_id", ("role")::"text"));



CREATE POLICY "agents update blocked" ON "public"."agents" FOR UPDATE TO "authenticated" USING (false) WITH CHECK (false);



ALTER TABLE "public"."app_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "app_settings_select_public" ON "public"."app_settings" FOR SELECT USING (true);



ALTER TABLE "public"."calls" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "calls insert scoped" ON "public"."calls" FOR INSERT TO "authenticated" WITH CHECK ((("operation_id" = "public"."effective_operation_id"()) AND ("public"."can_see_all_operations"() OR "public"."is_operation_admin"() OR ("public"."is_operation_agent"() AND ("agent_id" = "auth"."uid"())))));



CREATE POLICY "calls select scoped" ON "public"."calls" FOR SELECT TO "authenticated" USING (("public"."can_see_all_operations"() OR (("operation_id" = "public"."effective_operation_id"()) AND ("public"."is_operation_admin"() OR ("public"."is_operation_agent"() AND ("agent_id" = "auth"."uid"()))))));



CREATE POLICY "calls update scoped" ON "public"."calls" FOR UPDATE TO "authenticated" USING (("public"."can_see_all_operations"() OR (("operation_id" = "public"."effective_operation_id"()) AND ("public"."is_operation_admin"() OR ("public"."is_operation_agent"() AND ("agent_id" = "auth"."uid"())))))) WITH CHECK (("public"."can_see_all_operations"() OR (("operation_id" = "public"."effective_operation_id"()) AND ("public"."is_operation_admin"() OR ("public"."is_operation_agent"() AND ("agent_id" = "auth"."uid"()))))));



ALTER TABLE "public"."campaigns" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "campaigns select scoped" ON "public"."campaigns" FOR SELECT TO "authenticated" USING (("public"."can_see_all_operations"() OR (("public"."current_operation_id"() IS NOT NULL) AND ("operation_id" = "public"."current_operation_id"()) AND ("public"."is_operation_admin"() OR "public"."is_operation_agent"()))));



CREATE POLICY "campaigns write admin scoped" ON "public"."campaigns" TO "authenticated" USING (("public"."can_see_all_operations"() OR (("public"."current_operation_id"() IS NOT NULL) AND ("operation_id" = "public"."current_operation_id"()) AND "public"."is_operation_admin"()))) WITH CHECK (("public"."can_see_all_operations"() OR (("public"."current_operation_id"() IS NOT NULL) AND ("operation_id" = "public"."current_operation_id"()) AND "public"."is_operation_admin"())));



ALTER TABLE "public"."client_campaign_movements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "client_campaign_movements admin scoped delete" ON "public"."client_campaign_movements" FOR DELETE TO "authenticated" USING (false);



CREATE POLICY "client_campaign_movements admin scoped insert" ON "public"."client_campaign_movements" FOR INSERT TO "authenticated" WITH CHECK (("public"."can_see_all_operations"() OR (EXISTS ( SELECT 1
   FROM "public"."clients" "c"
  WHERE (("c"."id" = "client_campaign_movements"."client_id") AND ("c"."operation_id" = "public"."current_operation_id"()) AND "public"."is_operation_admin"())))));



CREATE POLICY "client_campaign_movements admin scoped select" ON "public"."client_campaign_movements" FOR SELECT TO "authenticated" USING (("public"."can_see_all_operations"() OR (EXISTS ( SELECT 1
   FROM "public"."clients" "c"
  WHERE (("c"."id" = "client_campaign_movements"."client_id") AND ("c"."operation_id" = "public"."current_operation_id"()) AND "public"."is_operation_admin"())))));



CREATE POLICY "client_campaign_movements admin scoped update" ON "public"."client_campaign_movements" FOR UPDATE TO "authenticated" USING (false) WITH CHECK (false);



ALTER TABLE "public"."client_comments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "client_comments insert agent scoped" ON "public"."client_comments" FOR INSERT TO "authenticated" WITH CHECK ((("operation_id" = "public"."effective_operation_id"()) AND ("agent_id" = "auth"."uid"()) AND ("public"."can_see_all_operations"() OR "public"."is_operation_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."clients" "c"
  WHERE (("c"."id" = "client_comments"."client_id") AND ("c"."operation_id" = "public"."effective_operation_id"()) AND (("c"."assigned_to" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."agent_assignments" "aa"
          WHERE (("aa"."agent_id" = "auth"."uid"()) AND ("aa"."is_active" = true) AND ("aa"."operation_id" = "public"."effective_operation_id"()) AND (("c"."serial")::"text" >= ("aa"."client_serial_start")::"text") AND (("c"."serial")::"text" <= ("aa"."client_serial_end")::"text")))))))))));



CREATE POLICY "client_comments select scoped" ON "public"."client_comments" FOR SELECT TO "authenticated" USING (("public"."can_see_all_operations"() OR (("operation_id" = "public"."effective_operation_id"()) AND ("public"."is_operation_admin"() OR ("public"."is_operation_agent"() AND (EXISTS ( SELECT 1
   FROM "public"."clients" "c"
  WHERE (("c"."id" = "client_comments"."client_id") AND ("c"."operation_id" = "public"."effective_operation_id"()) AND (("c"."assigned_to" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."agent_assignments" "aa"
          WHERE (("aa"."agent_id" = "auth"."uid"()) AND ("aa"."is_active" = true) AND ("aa"."operation_id" = "public"."effective_operation_id"()) AND (("c"."serial")::"text" >= ("aa"."client_serial_start")::"text") AND (("c"."serial")::"text" <= ("aa"."client_serial_end")::"text")))))))))))));



CREATE POLICY "client_comments update own scoped" ON "public"."client_comments" FOR UPDATE TO "authenticated" USING ((("operation_id" = "public"."effective_operation_id"()) AND ("agent_id" = "auth"."uid"()))) WITH CHECK ((("operation_id" = "public"."effective_operation_id"()) AND ("agent_id" = "auth"."uid"())));



CREATE POLICY "client_comments_insert_admin_like" ON "public"."client_comments" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_admin_like"() AND ("agent_id" = "auth"."uid"())));



CREATE POLICY "client_comments_insert_assigned_agent" ON "public"."client_comments" FOR INSERT TO "authenticated" WITH CHECK ((("agent_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."clients" "c"
  WHERE (("c"."id" = "client_comments"."client_id") AND ("c"."assigned_to" = "auth"."uid"()))))));



CREATE POLICY "client_comments_select_admin_like" ON "public"."client_comments" FOR SELECT TO "authenticated" USING ("public"."is_admin_like"());



CREATE POLICY "client_comments_select_assigned_agent" ON "public"."client_comments" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."clients" "c"
  WHERE (("c"."id" = "client_comments"."client_id") AND ("c"."assigned_to" = "auth"."uid"())))));



ALTER TABLE "public"."clients" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "clients delete admin scoped" ON "public"."clients" FOR DELETE TO "authenticated" USING (("public"."can_see_all_operations"() OR ("public"."is_operation_admin"() AND ("public"."current_operation_id"() IS NOT NULL) AND ("operation_id" = "public"."current_operation_id"()))));



CREATE POLICY "clients insert admin scoped" ON "public"."clients" FOR INSERT TO "authenticated" WITH CHECK (("public"."can_see_all_operations"() OR ("public"."is_operation_admin"() AND ("public"."current_operation_id"() IS NOT NULL) AND ("operation_id" = "public"."current_operation_id"()))));



CREATE POLICY "clients select scoped" ON "public"."clients" FOR SELECT TO "authenticated" USING (("public"."can_see_all_operations"() OR (("public"."current_operation_id"() IS NOT NULL) AND ("operation_id" = "public"."current_operation_id"()) AND ("public"."is_operation_admin"() OR ("public"."is_operation_agent"() AND (("assigned_to" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."agent_assignments" "aa"
  WHERE (("aa"."agent_id" = "auth"."uid"()) AND ("aa"."is_active" = true) AND ("aa"."operation_id" = "public"."current_operation_id"()) AND (("clients"."serial")::"text" >= ("aa"."client_serial_start")::"text") AND (("clients"."serial")::"text" <= ("aa"."client_serial_end")::"text"))))))))));



CREATE POLICY "clients update scoped" ON "public"."clients" FOR UPDATE TO "authenticated" USING (("public"."can_see_all_operations"() OR (("public"."current_operation_id"() IS NOT NULL) AND ("operation_id" = "public"."current_operation_id"()) AND ("public"."is_operation_admin"() OR ("public"."is_operation_agent"() AND (("assigned_to" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."agent_assignments" "aa"
  WHERE (("aa"."agent_id" = "auth"."uid"()) AND ("aa"."is_active" = true) AND ("aa"."operation_id" = "public"."current_operation_id"()) AND (("clients"."serial")::"text" >= ("aa"."client_serial_start")::"text") AND (("clients"."serial")::"text" <= ("aa"."client_serial_end")::"text")))))))))) WITH CHECK (("public"."can_see_all_operations"() OR (("public"."current_operation_id"() IS NOT NULL) AND ("operation_id" = "public"."current_operation_id"()) AND ("public"."is_operation_admin"() OR ("public"."is_operation_agent"() AND (("assigned_to" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."agent_assignments" "aa"
  WHERE (("aa"."agent_id" = "auth"."uid"()) AND ("aa"."is_active" = true) AND ("aa"."operation_id" = "public"."current_operation_id"()) AND (("clients"."serial")::"text" >= ("aa"."client_serial_start")::"text") AND (("clients"."serial")::"text" <= ("aa"."client_serial_end")::"text"))))))))));



ALTER TABLE "public"."email_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "email_logs insert scoped" ON "public"."email_logs" FOR INSERT TO "authenticated" WITH CHECK ((("operation_id" = "public"."effective_operation_id"()) AND ("public"."can_see_all_operations"() OR "public"."is_operation_admin"() OR ("public"."is_operation_agent"() AND ("agent_id" = "auth"."uid"())))));



CREATE POLICY "email_logs select scoped" ON "public"."email_logs" FOR SELECT TO "authenticated" USING (("public"."can_see_all_operations"() OR (("operation_id" = "public"."effective_operation_id"()) AND ("public"."is_operation_admin"() OR ("public"."is_operation_agent"() AND ("agent_id" = "auth"."uid"()))))));



ALTER TABLE "public"."invitation_codes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "invitation_codes blocked" ON "public"."invitation_codes" TO "authenticated" USING (false) WITH CHECK (false);



ALTER TABLE "public"."operations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."scheduled_calls" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "scheduled_calls select scoped" ON "public"."scheduled_calls" FOR SELECT TO "authenticated" USING (("public"."can_see_all_operations"() OR (("public"."current_operation_id"() IS NOT NULL) AND ("operation_id" = "public"."current_operation_id"()) AND ("public"."is_operation_admin"() OR ("public"."is_operation_agent"() AND ("agent_id" = "auth"."uid"()))))));



CREATE POLICY "scheduled_calls write scoped" ON "public"."scheduled_calls" TO "authenticated" USING (("public"."can_see_all_operations"() OR (("public"."current_operation_id"() IS NOT NULL) AND ("operation_id" = "public"."current_operation_id"()) AND ("public"."is_operation_admin"() OR ("public"."is_operation_agent"() AND ("agent_id" = "auth"."uid"())))))) WITH CHECK (("public"."can_see_all_operations"() OR (("public"."current_operation_id"() IS NOT NULL) AND ("operation_id" = "public"."current_operation_id"()) AND ("public"."is_operation_admin"() OR ("public"."is_operation_agent"() AND ("agent_id" = "auth"."uid"()))))));



ALTER TABLE "public"."tenant_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tenants" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "uoc self select" ON "public"."user_operation_context" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "uoc self update" ON "public"."user_operation_context" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "uoc self upsert" ON "public"."user_operation_context" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."user_operation_context" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



REVOKE ALL ON FUNCTION "public"."agent_name_map"("p_agent_ids" "uuid"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."agent_name_map"("p_agent_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."agent_name_map"("p_agent_ids" "uuid"[]) TO "service_role";



REVOKE ALL ON FUNCTION "public"."assign_leads_atomic"("p_agent_id" "uuid", "p_count" integer, "p_assigned_by" "uuid", "p_campaign_prefix" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."assign_leads_atomic"("p_agent_id" "uuid", "p_count" integer, "p_assigned_by" "uuid", "p_campaign_prefix" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."assign_leads_atomic"("p_agent_id" "uuid", "p_count" integer, "p_assigned_by" "uuid", "p_campaign_prefix" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."assign_leads_atomic_v2"("p_agent_id" "uuid", "p_count" integer, "p_assigned_by" "uuid", "p_campaign_id" "uuid", "p_campaign_prefix" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."assign_leads_atomic_v2"("p_agent_id" "uuid", "p_count" integer, "p_assigned_by" "uuid", "p_campaign_id" "uuid", "p_campaign_prefix" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."assign_leads_atomic_v2"("p_agent_id" "uuid", "p_count" integer, "p_assigned_by" "uuid", "p_campaign_id" "uuid", "p_campaign_prefix" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."can_access_agent"("p_agent_id" "uuid", "p_operation_id" "uuid", "p_role" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."can_access_agent"("p_agent_id" "uuid", "p_operation_id" "uuid", "p_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_access_agent"("p_agent_id" "uuid", "p_operation_id" "uuid", "p_role" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."can_access_operation"("p_operation_id" "uuid", "p_tenant_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."can_access_operation"("p_operation_id" "uuid", "p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_access_operation"("p_operation_id" "uuid", "p_tenant_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_see_all_operations"() TO "anon";
GRANT ALL ON FUNCTION "public"."can_see_all_operations"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_see_all_operations"() TO "service_role";



GRANT ALL ON FUNCTION "public"."can_view_phone_number"() TO "anon";
GRANT ALL ON FUNCTION "public"."can_view_phone_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_view_phone_number"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."can_write_agent_role"("p_target_current_role" "text", "p_new_role" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."can_write_agent_role"("p_target_current_role" "text", "p_new_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_write_agent_role"("p_target_current_role" "text", "p_new_role" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."clear_active_operation"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."clear_active_operation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."clear_active_operation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."current_operation_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_operation_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_operation_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."current_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."effective_operation_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."effective_operation_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."effective_operation_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_client_serial"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_client_serial"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_client_serial"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_agent"("p_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_agent"("p_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_agent"("p_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_agent_assigned_counts"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_agent_assigned_counts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_agent_assigned_counts"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_available_campaigns"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_available_campaigns"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_available_campaigns"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_available_campaigns_v2"("p_operation_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_available_campaigns_v2"("p_operation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_available_campaigns_v2"("p_operation_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_campaign_stats"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_campaign_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_campaign_stats"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_campaign_stats_v2"("p_operation_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_campaign_stats_v2"("p_operation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_campaign_stats_v2"("p_operation_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_invitation_codes_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_invitation_codes_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_invitation_codes_stats"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_recent_calls"("p_agent_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_recent_calls"("p_agent_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_recent_calls"("p_agent_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_visible_operations"("p_tenant_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_visible_operations"("p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_visible_operations"("p_tenant_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_visible_tenants"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_visible_tenants"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_visible_tenants"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_active_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_active_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_active_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin_like"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin_like"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin_like"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_agent"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_agent"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_agent"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_dev"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_dev"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_dev"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_operation_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_operation_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_operation_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_operation_agent"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_operation_agent"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_operation_agent"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_super_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_super_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_super_admin"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."list_agents"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."list_agents"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."list_agents"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."move_campaign_clients_by_status"("p_source_campaign_id" "uuid", "p_target_campaign_id" "uuid", "p_status_codes" "text"[], "p_reason" "text", "p_notes" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."move_campaign_clients_by_status"("p_source_campaign_id" "uuid", "p_target_campaign_id" "uuid", "p_status_codes" "text"[], "p_reason" "text", "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."move_campaign_clients_by_status"("p_source_campaign_id" "uuid", "p_target_campaign_id" "uuid", "p_status_codes" "text"[], "p_reason" "text", "p_notes" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."move_clients_to_campaign"("p_client_ids" "uuid"[], "p_target_campaign_id" "uuid", "p_reason" "text", "p_notes" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."move_clients_to_campaign"("p_client_ids" "uuid"[], "p_target_campaign_id" "uuid", "p_reason" "text", "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."move_clients_to_campaign"("p_client_ids" "uuid"[], "p_target_campaign_id" "uuid", "p_reason" "text", "p_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."my_agent"() TO "anon";
GRANT ALL ON FUNCTION "public"."my_agent"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."my_agent"() TO "service_role";



GRANT ALL ON FUNCTION "public"."normalize_email"("p_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."normalize_email"("p_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."normalize_email"("p_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."normalize_phone"("p_phone" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."normalize_phone"("p_phone" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."normalize_phone"("p_phone" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."operation_code"("p_operation_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."operation_code"("p_operation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."operation_code"("p_operation_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."operation_slug"("p_operation_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."operation_slug"("p_operation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."operation_slug"("p_operation_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_active_operation"("p_operation_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_active_operation"("p_operation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_active_operation"("p_operation_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_comment_operation"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_comment_operation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_comment_operation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_campaign_tenant_scope"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_campaign_tenant_scope"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_campaign_tenant_scope"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_client_campaign_scope"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_client_campaign_scope"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_client_campaign_scope"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_scheduled_call_context"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_scheduled_call_context"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_scheduled_call_context"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_agent"("p_id" "uuid", "p_name" "text", "p_role" "text", "p_is_active" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_agent"("p_id" "uuid", "p_name" "text", "p_role" "text", "p_is_active" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_agent"("p_id" "uuid", "p_name" "text", "p_role" "text", "p_is_active" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_agent_assignments_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_agent_assignments_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_agent_assignments_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_agent_did_credentials_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_agent_did_credentials_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_agent_did_credentials_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_client_last_comment"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_client_last_comment"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_client_last_comment"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_invitation_codes_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_invitation_codes_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_invitation_codes_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."upsert_agent"("p_id" "uuid", "p_name" "text", "p_role" "text", "p_is_active" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."upsert_agent"("p_id" "uuid", "p_name" "text", "p_role" "text", "p_is_active" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_agent"("p_id" "uuid", "p_name" "text", "p_role" "text", "p_is_active" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_invitation_code"("p_code" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."validate_invitation_code"("p_code" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_invitation_code"("p_code" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."whoami"() TO "anon";
GRANT ALL ON FUNCTION "public"."whoami"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."whoami"() TO "service_role";



GRANT ALL ON TABLE "public"."admin_reports" TO "service_role";



GRANT ALL ON TABLE "public"."agent_assignments" TO "anon";
GRANT ALL ON TABLE "public"."agent_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."agent_did_credentials" TO "anon";
GRANT ALL ON TABLE "public"."agent_did_credentials" TO "authenticated";
GRANT ALL ON TABLE "public"."agent_did_credentials" TO "service_role";



GRANT ALL ON TABLE "public"."agents" TO "anon";
GRANT ALL ON TABLE "public"."agents" TO "authenticated";
GRANT ALL ON TABLE "public"."agents" TO "service_role";



GRANT ALL ON TABLE "public"."app_settings" TO "anon";
GRANT ALL ON TABLE "public"."app_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."app_settings" TO "service_role";



GRANT ALL ON TABLE "public"."calls" TO "anon";
GRANT ALL ON TABLE "public"."calls" TO "authenticated";
GRANT ALL ON TABLE "public"."calls" TO "service_role";



GRANT ALL ON TABLE "public"."campaigns" TO "anon";
GRANT ALL ON TABLE "public"."campaigns" TO "authenticated";
GRANT ALL ON TABLE "public"."campaigns" TO "service_role";



GRANT ALL ON TABLE "public"."client_campaign_movements" TO "anon";
GRANT ALL ON TABLE "public"."client_campaign_movements" TO "authenticated";
GRANT ALL ON TABLE "public"."client_campaign_movements" TO "service_role";



GRANT ALL ON TABLE "public"."client_comments" TO "anon";
GRANT ALL ON TABLE "public"."client_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."client_comments" TO "service_role";



GRANT ALL ON TABLE "public"."clients" TO "anon";
GRANT ALL ON TABLE "public"."clients" TO "authenticated";
GRANT ALL ON TABLE "public"."clients" TO "service_role";



GRANT ALL ON TABLE "public"."email_logs" TO "anon";
GRANT ALL ON TABLE "public"."email_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."email_logs" TO "service_role";



GRANT ALL ON TABLE "public"."invitation_codes" TO "anon";
GRANT ALL ON TABLE "public"."invitation_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."invitation_codes" TO "service_role";



GRANT ALL ON TABLE "public"."operations" TO "anon";
GRANT ALL ON TABLE "public"."operations" TO "authenticated";
GRANT ALL ON TABLE "public"."operations" TO "service_role";



GRANT ALL ON TABLE "public"."scheduled_calls" TO "anon";
GRANT ALL ON TABLE "public"."scheduled_calls" TO "authenticated";
GRANT ALL ON TABLE "public"."scheduled_calls" TO "service_role";



GRANT ALL ON TABLE "public"."tenant_settings" TO "anon";
GRANT ALL ON TABLE "public"."tenant_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."tenant_settings" TO "service_role";



GRANT ALL ON TABLE "public"."tenants" TO "anon";
GRANT ALL ON TABLE "public"."tenants" TO "authenticated";
GRANT ALL ON TABLE "public"."tenants" TO "service_role";



GRANT ALL ON TABLE "public"."user_operation_context" TO "anon";
GRANT ALL ON TABLE "public"."user_operation_context" TO "authenticated";
GRANT ALL ON TABLE "public"."user_operation_context" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







