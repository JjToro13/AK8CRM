


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


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."assign_leads_atomic"("p_agent_id" "uuid", "p_count" integer, "p_assigned_by" "uuid", "p_campaign_prefix" "text" DEFAULT NULL::"text") RETURNS TABLE("assigned_count" integer)
    LANGUAGE "plpgsql"
    AS $$
declare
  v_count int := 0;
begin
  if not is_admin() then
    raise exception 'Only admins can assign leads';
  end if;

  if p_count is null or p_count <= 0 then
    return query select 0;
    return;
  end if;

  with picked as (
    select id
    from public.clients
    where assigned_to is null
      and (status = 'new' or status is null)
      and (p_campaign_prefix is null or serial like (p_campaign_prefix || '%'))
    order by created_at asc nulls last
    for update skip locked
    limit p_count
  )
  update public.clients c
     set assigned_to = p_agent_id,
         assigned_at = now(),
         assigned_by = p_assigned_by,
         status = 'assigned'
    from picked
   where c.id = picked.id;

  get diagnostics v_count = row_count;
  return query select v_count;
end;
$$;


ALTER FUNCTION "public"."assign_leads_atomic"("p_agent_id" "uuid", "p_count" integer, "p_assigned_by" "uuid", "p_campaign_prefix" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_view_phone_number"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM agents WHERE id = auth.uid() AND role='admin');
END; $$;


ALTER FUNCTION "public"."can_view_phone_number"() OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."get_agent_assigned_counts"() RETURNS TABLE("agent_id" "uuid", "assigned_count" bigint)
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  select assigned_to as agent_id, count(*) as assigned_count
  from public.clients
  where assigned_to is not null
  group by assigned_to
$$;


ALTER FUNCTION "public"."get_agent_assigned_counts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_available_campaigns"() RETURNS TABLE("campaign" "text", "available" bigint)
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  select left(serial, 1) as campaign,
         count(*) as available
  from public.clients
  where assigned_to is null
  group by left(serial, 1)
  order by campaign
$$;


ALTER FUNCTION "public"."get_available_campaigns"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_campaign_stats"() RETURNS TABLE("prefix" "text", "total_clients" bigint, "assigned_clients" bigint, "available_clients" bigint, "min_serial" "text", "max_serial" "text")
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  select
    left(serial, 1) as prefix,
    count(*) as total_clients,
    count(*) filter (where assigned_to is not null) as assigned_clients,
    count(*) filter (where assigned_to is null) as available_clients,
    min(serial) as min_serial,
    max(serial) as max_serial
  from public.clients
  group by 1
  order by 1;
$$;


ALTER FUNCTION "public"."get_campaign_stats"() OWNER TO "postgres";


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
BEGIN
  RETURN QUERY
  SELECT 
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
  FROM calls c
  JOIN clients cl ON c.client_id = cl.id
  JOIN agents a ON c.agent_id = a.id
  WHERE (p_agent_id IS NULL OR c.agent_id = p_agent_id)
  ORDER BY c.created_at DESC
  LIMIT 50;
END;
$$;


ALTER FUNCTION "public"."get_recent_calls"("p_agent_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM agents WHERE id = auth.uid() AND role='admin');
END; $$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_agent"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM agents WHERE id = auth.uid() AND role='agent');
END; $$;


ALTER FUNCTION "public"."is_agent"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."normalize_email"("p_email" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select nullif(lower(trim(p_email)), '');
$$;


ALTER FUNCTION "public"."normalize_email"("p_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."normalize_phone"("p_phone" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select nullif(regexp_replace(coalesce(p_phone,''), '[^0-9]+', '', 'g'), '');
$$;


ALTER FUNCTION "public"."normalize_phone"("p_phone" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


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
    "auth_user_id" "uuid"
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
    CONSTRAINT "agents_role_check" CHECK ((("role")::"text" = ANY ((ARRAY['admin'::character varying, 'agent'::character varying])::"text"[])))
);


ALTER TABLE "public"."agents" OWNER TO "postgres";


COMMENT ON COLUMN "public"."agents"."preferred_email_account_id" IS 'ID de la cuenta de email preferida del agente (1=Soporte, 2=Ventas, 3=Dirección, etc.)';



CREATE TABLE IF NOT EXISTS "public"."calls" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "agent_id" "uuid" NOT NULL,
    "start_time" timestamp with time zone DEFAULT "now"(),
    "end_time" timestamp with time zone,
    "status" character varying(20) DEFAULT 'in_progress'::character varying,
    "duration" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
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
    "imported_at" timestamp with time zone
);


ALTER TABLE "public"."campaigns" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."client_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "agent_id" "uuid" NOT NULL,
    "comment" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
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
    "from_email" "text"
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
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."invitation_codes" OWNER TO "postgres";


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



ALTER TABLE ONLY "public"."calls"
    ADD CONSTRAINT "calls_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."campaigns"
    ADD CONSTRAINT "campaigns_pkey" PRIMARY KEY ("prefix");



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



CREATE UNIQUE INDEX "clients_normalized_email_uniq" ON "public"."clients" USING "btree" ("normalized_email") WHERE (("normalized_email" IS NOT NULL) AND ("normalized_email" <> ''::"text"));



CREATE UNIQUE INDEX "clients_normalized_phone_uniq" ON "public"."clients" USING "btree" ("normalized_phone") WHERE (("normalized_phone" IS NOT NULL) AND ("normalized_phone" <> ''::"text"));



CREATE INDEX "idx_agent_assignments_agent_id" ON "public"."agent_assignments" USING "btree" ("agent_id");



CREATE INDEX "idx_agent_assignments_assigned_by" ON "public"."agent_assignments" USING "btree" ("assigned_by");



CREATE INDEX "idx_agent_did_credentials_active" ON "public"."agent_did_credentials" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_agent_did_credentials_agent_id" ON "public"."agent_did_credentials" USING "btree" ("agent_id");



CREATE INDEX "idx_calls_agent_id" ON "public"."calls" USING "btree" ("agent_id");



CREATE INDEX "idx_calls_client_id" ON "public"."calls" USING "btree" ("client_id");



CREATE INDEX "idx_client_comments_client_id" ON "public"."client_comments" USING "btree" ("client_id");



CREATE INDEX "idx_client_comments_created_at" ON "public"."client_comments" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_clients_assigned_to" ON "public"."clients" USING "btree" ("assigned_to");



CREATE INDEX "idx_clients_country" ON "public"."clients" USING "btree" ("country");



CREATE INDEX "idx_clients_first_name" ON "public"."clients" USING "btree" ("first_name");



CREATE INDEX "idx_clients_funnel" ON "public"."clients" USING "btree" ("funnel");



CREATE INDEX "idx_clients_last_name" ON "public"."clients" USING "btree" ("last_name");



CREATE INDEX "idx_clients_serial" ON "public"."clients" USING "btree" ("serial");



CREATE INDEX "idx_clients_source" ON "public"."clients" USING "btree" ("source");



CREATE INDEX "idx_clients_status" ON "public"."clients" USING "btree" ("status");



CREATE INDEX "idx_email_logs_agent_id" ON "public"."email_logs" USING "btree" ("agent_id");



CREATE INDEX "idx_email_logs_client_id" ON "public"."email_logs" USING "btree" ("client_id");



CREATE INDEX "idx_invitation_codes_active" ON "public"."invitation_codes" USING "btree" ("is_active");



CREATE INDEX "idx_invitation_codes_code" ON "public"."invitation_codes" USING "btree" ("code");



CREATE INDEX "idx_invitation_codes_created_by" ON "public"."invitation_codes" USING "btree" ("created_by");



CREATE INDEX "idx_invitation_codes_expires" ON "public"."invitation_codes" USING "btree" ("expires_at");



CREATE OR REPLACE TRIGGER "generate_client_serial_trigger" BEFORE INSERT ON "public"."clients" FOR EACH ROW WHEN (("new"."serial" IS NULL)) EXECUTE FUNCTION "public"."generate_client_serial"();



CREATE OR REPLACE TRIGGER "trg_campaigns_updated_at" BEFORE UPDATE ON "public"."campaigns" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_agent_assignments_updated_at" BEFORE UPDATE ON "public"."agent_assignments" FOR EACH ROW EXECUTE FUNCTION "public"."update_agent_assignments_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_invitation_codes_updated_at" BEFORE UPDATE ON "public"."invitation_codes" FOR EACH ROW EXECUTE FUNCTION "public"."update_invitation_codes_updated_at"();



CREATE OR REPLACE TRIGGER "update_agent_did_credentials_updated_at" BEFORE UPDATE ON "public"."agent_did_credentials" FOR EACH ROW EXECUTE FUNCTION "public"."update_agent_did_credentials_updated_at"();



CREATE OR REPLACE TRIGGER "update_clients_updated_at" BEFORE UPDATE ON "public"."clients" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."admin_reports"
    ADD CONSTRAINT "admin_reports_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."agent_assignments"
    ADD CONSTRAINT "agent_assignments_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."agent_assignments"
    ADD CONSTRAINT "agent_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "public"."agents"("id");



ALTER TABLE ONLY "public"."agent_did_credentials"
    ADD CONSTRAINT "agent_did_credentials_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."calls"
    ADD CONSTRAINT "calls_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."calls"
    ADD CONSTRAINT "calls_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_comments"
    ADD CONSTRAINT "client_comments_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id");



ALTER TABLE ONLY "public"."client_comments"
    ADD CONSTRAINT "client_comments_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_logs"
    ADD CONSTRAINT "email_logs_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_logs"
    ADD CONSTRAINT "email_logs_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invitation_codes"
    ADD CONSTRAINT "invitation_codes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."agents"("id");



CREATE POLICY "Admins can delete clients" ON "public"."clients" FOR DELETE USING ("public"."is_admin"());



CREATE POLICY "Admins can delete credentials" ON "public"."agent_did_credentials" FOR DELETE TO "authenticated" USING (((( SELECT "agents"."role"
   FROM "public"."agents"
  WHERE ("agents"."id" = ( SELECT "auth"."uid"() AS "uid"))))::"text" = 'admin'::"text"));



CREATE POLICY "Admins can insert agents" ON "public"."agents" FOR INSERT WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can insert clients" ON "public"."clients" FOR INSERT WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can insert credentials" ON "public"."agent_did_credentials" FOR INSERT TO "authenticated" WITH CHECK (((( SELECT "agents"."role"
   FROM "public"."agents"
  WHERE ("agents"."id" = ( SELECT "auth"."uid"() AS "uid"))))::"text" = 'admin'::"text"));



CREATE POLICY "Admins can manage assignments" ON "public"."agent_assignments" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can update agents" ON "public"."agents" FOR UPDATE USING ("public"."is_admin"());



CREATE POLICY "Admins can update clients" ON "public"."clients" FOR UPDATE USING ("public"."is_admin"());



CREATE POLICY "Admins can update credentials" ON "public"."agent_did_credentials" FOR UPDATE TO "authenticated" USING (((( SELECT "agents"."role"
   FROM "public"."agents"
  WHERE ("agents"."id" = ( SELECT "auth"."uid"() AS "uid"))))::"text" = 'admin'::"text"));



CREATE POLICY "Admins can view all comments" ON "public"."client_comments" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."agents"
  WHERE (("agents"."id" = "auth"."uid"()) AND (("agents"."role")::"text" = 'admin'::"text")))));



CREATE POLICY "Admins can view all credentials" ON "public"."agent_did_credentials" FOR SELECT TO "authenticated" USING (((( SELECT "agents"."role"
   FROM "public"."agents"
  WHERE ("agents"."id" = ( SELECT "auth"."uid"() AS "uid"))))::"text" = 'admin'::"text"));



CREATE POLICY "Admins pueden actualizar códigos de invitación" ON "public"."invitation_codes" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."agents"
  WHERE ((("agents"."email")::"text" = ( SELECT ("auth"."jwt"() ->> 'email'::"text"))) AND (("agents"."role")::"text" = 'admin'::"text")))));



CREATE POLICY "Admins pueden crear códigos de invitación" ON "public"."invitation_codes" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."agents"
  WHERE ((("agents"."email")::"text" = ( SELECT ("auth"."jwt"() ->> 'email'::"text"))) AND (("agents"."role")::"text" = 'admin'::"text")))));



CREATE POLICY "Admins pueden eliminar códigos de invitación" ON "public"."invitation_codes" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."agents"
  WHERE ((("agents"."email")::"text" = ( SELECT ("auth"."jwt"() ->> 'email'::"text"))) AND (("agents"."role")::"text" = 'admin'::"text")))));



CREATE POLICY "Admins pueden ver todos los códigos de invitación" ON "public"."invitation_codes" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."agents"
  WHERE ((("agents"."email")::"text" = ( SELECT ("auth"."jwt"() ->> 'email'::"text"))) AND (("agents"."role")::"text" = 'admin'::"text")))));



CREATE POLICY "Agents can insert calls" ON "public"."calls" FOR INSERT WITH CHECK (("public"."is_agent"() AND ("agent_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Agents can insert comments only for assigned clients" ON "public"."client_comments" FOR INSERT TO "authenticated" WITH CHECK ((("agent_id" = "auth"."uid"()) AND ("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."clients" "c"
  WHERE (("c"."id" = "client_comments"."client_id") AND ("c"."assigned_to" = "auth"."uid"())))))));



CREATE POLICY "Agents can update their calls" ON "public"."calls" FOR UPDATE USING ((("agent_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_admin"()));



CREATE POLICY "Agents can view assigned clients (compat)" ON "public"."clients" FOR SELECT TO "authenticated" USING (("public"."is_admin"() OR ("public"."is_agent"() AND (("assigned_to" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."agent_assignments" "aa"
  WHERE (("aa"."agent_id" = "auth"."uid"()) AND ("aa"."is_active" = true) AND (("clients"."serial")::"text" >= ("aa"."client_serial_start")::"text") AND (("clients"."serial")::"text" <= ("aa"."client_serial_end")::"text"))))))));



CREATE POLICY "Agents can view comments for assigned clients (compat)" ON "public"."client_comments" FOR SELECT TO "authenticated" USING (("public"."is_admin"() OR ("public"."is_agent"() AND (EXISTS ( SELECT 1
   FROM "public"."clients" "c"
  WHERE (("c"."id" = "client_comments"."client_id") AND (("c"."assigned_to" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."agent_assignments" "aa"
          WHERE (("aa"."agent_id" = "auth"."uid"()) AND ("aa"."is_active" = true) AND (("c"."serial")::"text" >= ("aa"."client_serial_start")::"text") AND (("c"."serial")::"text" <= ("aa"."client_serial_end")::"text")))))))))));



CREATE POLICY "Agents can view their calls" ON "public"."calls" FOR SELECT USING ((("agent_id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."is_admin"()));



CREATE POLICY "Agents can view their clients comments" ON "public"."client_comments" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."agents"
  WHERE (("agents"."id" = "auth"."uid"()) AND (("agents"."role")::"text" = 'agent'::"text")))) AND (EXISTS ( SELECT 1
   FROM ("public"."agent_assignments" "aa"
     JOIN "public"."clients" "c" ON (("client_comments"."client_id" = "c"."id")))
  WHERE (("aa"."agent_id" = "auth"."uid"()) AND ("aa"."is_active" = true) AND (("c"."serial")::"text" >= ("aa"."client_serial_start")::"text") AND (("c"."serial")::"text" <= ("aa"."client_serial_end")::"text"))))));



CREATE POLICY "Allow authenticated users to view assignments" ON "public"."agent_assignments" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can insert comments" ON "public"."client_comments" FOR INSERT TO "authenticated" WITH CHECK (("agent_id" = "auth"."uid"()));



CREATE POLICY "Authenticated users can view agents" ON "public"."agents" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Campaigns admin manage" ON "public"."campaigns" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "Campaigns readable" ON "public"."campaigns" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can insert email logs" ON "public"."email_logs" FOR INSERT TO "authenticated" WITH CHECK ((("public"."is_admin"() OR "public"."is_agent"()) AND ("agent_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "Users can update client data" ON "public"."clients" FOR UPDATE TO "authenticated" USING (("public"."is_admin"() OR "public"."is_agent"()));



CREATE POLICY "Users can update their own comments" ON "public"."client_comments" FOR UPDATE TO "authenticated" USING (("agent_id" = "auth"."uid"())) WITH CHECK (("agent_id" = "auth"."uid"()));



CREATE POLICY "Users can view client data" ON "public"."clients" FOR SELECT TO "authenticated" USING (("public"."is_admin"() OR "public"."is_agent"()));



CREATE POLICY "Users can view email logs" ON "public"."email_logs" FOR SELECT TO "authenticated" USING (("public"."is_admin"() OR ("public"."is_agent"() AND ("agent_id" = ( SELECT "auth"."uid"() AS "uid")))));



ALTER TABLE "public"."admin_reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."agent_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."agent_did_credentials" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."agents" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "anon can insert reports" ON "public"."admin_reports" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "authenticated can insert reports" ON "public"."admin_reports" FOR INSERT TO "authenticated" WITH CHECK (true);



ALTER TABLE "public"."calls" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."campaigns" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."client_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."clients" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invitation_codes" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."assign_leads_atomic"("p_agent_id" "uuid", "p_count" integer, "p_assigned_by" "uuid", "p_campaign_prefix" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."assign_leads_atomic"("p_agent_id" "uuid", "p_count" integer, "p_assigned_by" "uuid", "p_campaign_prefix" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."assign_leads_atomic"("p_agent_id" "uuid", "p_count" integer, "p_assigned_by" "uuid", "p_campaign_prefix" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_view_phone_number"() TO "anon";
GRANT ALL ON FUNCTION "public"."can_view_phone_number"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_view_phone_number"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_client_serial"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_client_serial"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_client_serial"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_agent_assigned_counts"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_agent_assigned_counts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_agent_assigned_counts"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_available_campaigns"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_available_campaigns"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_available_campaigns"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_campaign_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_campaign_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_campaign_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_invitation_codes_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_invitation_codes_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_invitation_codes_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_recent_calls"("p_agent_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_recent_calls"("p_agent_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_recent_calls"("p_agent_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_agent"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_agent"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_agent"() TO "service_role";



GRANT ALL ON FUNCTION "public"."normalize_email"("p_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."normalize_email"("p_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."normalize_email"("p_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."normalize_phone"("p_phone" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."normalize_phone"("p_phone" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."normalize_phone"("p_phone" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "postgres";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "anon";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."show_limit"() TO "postgres";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "anon";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_agent_assignments_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_agent_assignments_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_agent_assignments_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_agent_did_credentials_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_agent_did_credentials_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_agent_did_credentials_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_invitation_codes_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_invitation_codes_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_invitation_codes_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_invitation_code"("p_code" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."validate_invitation_code"("p_code" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_invitation_code"("p_code" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."whoami"() TO "anon";
GRANT ALL ON FUNCTION "public"."whoami"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."whoami"() TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "service_role";


















GRANT ALL ON TABLE "public"."admin_reports" TO "anon";
GRANT ALL ON TABLE "public"."admin_reports" TO "authenticated";
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



GRANT ALL ON TABLE "public"."calls" TO "anon";
GRANT ALL ON TABLE "public"."calls" TO "authenticated";
GRANT ALL ON TABLE "public"."calls" TO "service_role";



GRANT ALL ON TABLE "public"."campaigns" TO "anon";
GRANT ALL ON TABLE "public"."campaigns" TO "authenticated";
GRANT ALL ON TABLE "public"."campaigns" TO "service_role";



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































drop extension if exists "pg_net";

alter table "public"."agents" drop constraint "agents_role_check";

alter table "public"."calls" drop constraint "calls_status_check";

alter table "public"."clients" drop constraint "clients_status_color_check";

alter table "public"."agents" add constraint "agents_role_check" CHECK (((role)::text = ANY ((ARRAY['admin'::character varying, 'agent'::character varying])::text[]))) not valid;

alter table "public"."agents" validate constraint "agents_role_check";

alter table "public"."calls" add constraint "calls_status_check" CHECK (((status)::text = ANY ((ARRAY['in_progress'::character varying, 'completed'::character varying, 'failed'::character varying, 'no_answer'::character varying])::text[]))) not valid;

alter table "public"."calls" validate constraint "calls_status_check";

alter table "public"."clients" add constraint "clients_status_color_check" CHECK (((status_color)::text = ANY ((ARRAY['gray'::character varying, 'red'::character varying, 'yellow'::character varying, 'green'::character varying, 'blue'::character varying])::text[]))) not valid;

alter table "public"."clients" validate constraint "clients_status_color_check";


