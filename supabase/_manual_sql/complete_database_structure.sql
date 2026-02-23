-- =====================================================
-- ESTRUCTURA COMPLETA DE LA BASE DE DATOS
-- Proyecto: Máscara Llamadas - Sistema de Gestión de Inversiones
-- Fecha de exportación: 30 de septiembre de 2025
-- Última actualización: 2 de enero de 2026
-- =====================================================
-- 
-- Este archivo contiene TODA la estructura de la base de datos:
-- - Tablas con todas sus columnas y tipos
-- - Restricciones (PKs, FKs, Checks, Unique)
-- - Índices optimizados
-- - Funciones de seguridad y triggers
-- - Políticas RLS (Row Level Security)
-- 
-- NOTA: Las Edge Functions y Storage están deshabilitadas
-- eliminadas (audio_url, call-recordings bucket, get-audio-url function)
-- 
-- =====================================================

-- =====================================================
-- PASO 1: CREAR EXTENSIONES NECESARIAS
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =====================================================
-- PASO 2: CREAR TABLAS
-- =====================================================

-- Tabla: agents
-- Almacena información de agentes y administradores
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'agent')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla: clients
-- Almacena información de clientes con estados de contacto
-- ORDEN FINAL: id, first_name, last_name, email, phone_number, country, source, funnel, deposit_amount, net_deposit, user_balance, investment_date, serial, status_color, attempts, comments, created_at, updated_at
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name VARCHAR(255), -- nombre o firstName
  last_name VARCHAR(255), -- apellido o lastName
  email VARCHAR(255), -- correo o email
  phone_number VARCHAR(20), -- teléfono o phone
  country VARCHAR(255), -- país o country
  source VARCHAR(255), -- empresa o source
  funnel VARCHAR(255), -- funnel
  deposit_amount NUMERIC(15,2), -- deposit_amount
  net_deposit NUMERIC(15,2), -- net_deposit
  user_balance NUMERIC(15,2), -- user_balance
  investment_date DATE, -- fecha de inversión
  serial VARCHAR(50) NOT NULL UNIQUE, -- serie única por campaña (A0001, B0001, etc)
  status_color VARCHAR(20) DEFAULT 'gray' CHECK (status_color IN ('gray', 'red', 'yellow', 'green', 'blue')),
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla: calls
-- Registro de llamadas realizadas entre agentes y clientes
CREATE TABLE IF NOT EXISTS calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ DEFAULT now(),
  end_time TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'failed', 'no_answer')),
  duration INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla: agent_assignments
-- Asignación de rangos de clientes a agentes
CREATE TABLE IF NOT EXISTS agent_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  client_serial_start VARCHAR(50) NOT NULL,
  client_serial_end VARCHAR(50) NOT NULL,
  assigned_by UUID NOT NULL REFERENCES agents(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  CONSTRAINT valid_serial_range CHECK (client_serial_start <= client_serial_end)
);

-- Tabla: email_logs
-- Registro de emails enviados a clientes
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  email_account_id INTEGER,
  from_email TEXT
);

-- Tabla: client_comments
-- Historial de comentarios de clientes con autor y fecha
CREATE TABLE IF NOT EXISTS client_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id),
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Agregar foreign key constraint para email_logs -> clients
ALTER TABLE email_logs ADD CONSTRAINT email_logs_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id);

-- Tabla: agent_did_credentials
-- Credenciales de Did-glo-bal por agente. Solo almacena el número de extensión. El Access Token es global (admin).
CREATE TABLE IF NOT EXISTS agent_did_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL UNIQUE REFERENCES agents(id) ON DELETE CASCADE,
  extension_number VARCHAR(50) NOT NULL, -- Número de extensión del agente en Did-glo-bal (ej: 101, 102, 103...)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- PASO 3: CREAR ÍNDICES OPTIMIZADOS
-- =====================================================

-- Índices para tabla calls
CREATE INDEX IF NOT EXISTS idx_calls_client_id ON calls(client_id);
CREATE INDEX IF NOT EXISTS idx_calls_agent_id ON calls(agent_id);

-- Índices para tabla clients
CREATE INDEX IF NOT EXISTS idx_clients_serial ON clients(serial);
CREATE INDEX IF NOT EXISTS idx_clients_first_name ON clients(first_name);
CREATE INDEX IF NOT EXISTS idx_clients_last_name ON clients(last_name);
CREATE INDEX IF NOT EXISTS idx_clients_country ON clients(country);
CREATE INDEX IF NOT EXISTS idx_clients_source ON clients(source);
CREATE INDEX IF NOT EXISTS idx_clients_funnel ON clients(funnel);

-- Índices para tabla agent_assignments
CREATE INDEX IF NOT EXISTS idx_agent_assignments_agent_id ON agent_assignments(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_assignments_assigned_by ON agent_assignments(assigned_by);

-- Índices para tabla agent_did_credentials
CREATE INDEX IF NOT EXISTS idx_agent_did_credentials_agent_id ON agent_did_credentials(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_did_credentials_active ON agent_did_credentials(is_active) WHERE is_active = true;

-- Índices para tabla client_comments
CREATE INDEX IF NOT EXISTS idx_client_comments_client_id ON client_comments(client_id);
CREATE INDEX IF NOT EXISTS idx_client_comments_created_at ON client_comments(created_at DESC);

-- =====================================================
-- PASO 4: CREAR FUNCIONES DE SEGURIDAD Y UTILIDAD
-- =====================================================

-- Función: is_admin
-- Verifica si el usuario actual es administrador
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM agents 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
END;
$$;

-- Función: is_agent
-- Verifica si el usuario actual es agente
CREATE OR REPLACE FUNCTION is_agent()
RETURNS BOOLEAN 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM agents 
    WHERE id = auth.uid() 
    AND role = 'agent'
  );
END;
$$;

-- Función: can_view_phone_number
-- Verifica si el usuario puede ver números de teléfono
CREATE OR REPLACE FUNCTION can_view_phone_number()
RETURNS BOOLEAN 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM agents 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
END;
$$;

-- Función: generate_client_serial
-- Genera automáticamente el serial del cliente al insertar (formato de campaña)
-- NOTA: Esta función solo se usa para inserciones individuales. 
-- Las importaciones masivas usan la lógica de la Edge Function import-clients
CREATE OR REPLACE FUNCTION generate_client_serial()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  new_serial VARCHAR(50);
  counter INTEGER := 1;
  campaign_prefix VARCHAR(10) := 'A';
BEGIN
  -- Si ya tiene serial, no hacer nada
  IF NEW.serial IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- Obtener el último prefijo de campaña usado
  SELECT COALESCE(
    (SELECT SUBSTRING(serial FROM '^([A-Z]+)') 
     FROM clients 
     WHERE serial ~ '^[A-Z]+[0-9]+$' 
     ORDER BY created_at DESC 
     LIMIT 1), 
    'A'
  ) INTO campaign_prefix;
  
  -- Verificar si la campaña actual está llena (9999 clientes)
  IF (SELECT COUNT(*) FROM clients WHERE serial LIKE campaign_prefix || '%') >= 9999 THEN
    -- Generar nuevo prefijo de campaña
    campaign_prefix := CHR(ASCII(campaign_prefix) + 1);
    IF campaign_prefix > 'Z' THEN
      campaign_prefix := 'A' || campaign_prefix;
    END IF;
  END IF;
  
  -- Generar serial con el prefijo de campaña
  LOOP
    new_serial := campaign_prefix || LPAD(counter::text, 4, '0');
    
    IF NOT EXISTS (SELECT 1 FROM clients WHERE serial = new_serial) THEN
      NEW.serial := new_serial;
      EXIT;
    END IF;
    
    counter := counter + 1;
    
    -- Si llegamos a 9999, cambiar de campaña
    IF counter > 9999 THEN
      campaign_prefix := CHR(ASCII(campaign_prefix) + 1);
      IF campaign_prefix > 'Z' THEN
        campaign_prefix := 'A' || campaign_prefix;
      END IF;
      counter := 1;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Función: update_updated_at_column
-- Actualiza automáticamente el campo updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Función: update_agent_assignments_updated_at
-- Actualiza el campo updated_at para agent_assignments
CREATE OR REPLACE FUNCTION update_agent_assignments_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Función: update_agent_did_credentials_updated_at
-- Actualiza el campo updated_at para agent_did_credentials
CREATE OR REPLACE FUNCTION update_agent_did_credentials_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Función: get_recent_calls
-- Obtiene llamadas recientes con información de cliente y agente (bypass RLS)
CREATE OR REPLACE FUNCTION get_recent_calls(p_agent_id UUID DEFAULT NULL)
RETURNS TABLE(
  id UUID,
  client_id UUID,
  agent_id UUID,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  status VARCHAR,
  duration INTEGER,
  created_at TIMESTAMPTZ,
  client_first_name VARCHAR,
  client_serial VARCHAR,
  client_status_color VARCHAR,
  agent_name VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

-- =====================================================
-- PASO 5: CREAR TRIGGERS
-- =====================================================

-- Trigger: Generar serial automáticamente para clientes
DROP TRIGGER IF EXISTS generate_client_serial_trigger ON clients;
CREATE TRIGGER generate_client_serial_trigger
  BEFORE INSERT ON clients
  FOR EACH ROW
  WHEN (NEW.serial IS NULL)
  EXECUTE FUNCTION generate_client_serial();

-- Trigger: Actualizar updated_at en clientes
DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Actualizar updated_at en agent_assignments
DROP TRIGGER IF EXISTS trigger_update_agent_assignments_updated_at ON agent_assignments;
CREATE TRIGGER trigger_update_agent_assignments_updated_at
  BEFORE UPDATE ON agent_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_assignments_updated_at();

-- Trigger: Actualizar updated_at en agent_did_credentials
DROP TRIGGER IF EXISTS update_agent_did_credentials_updated_at ON agent_did_credentials;
CREATE TRIGGER update_agent_did_credentials_updated_at
  BEFORE UPDATE ON agent_did_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_did_credentials_updated_at();

-- =====================================================
-- PASO 6: HABILITAR ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_did_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_comments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PASO 7: CREAR POLÍTICAS RLS - TABLA AGENTS
-- =====================================================

-- Permitir a usuarios autenticados ver agentes
DROP POLICY IF EXISTS "Authenticated users can view agents" ON agents;
CREATE POLICY "Authenticated users can view agents"
ON agents FOR SELECT
TO authenticated
USING (true);

-- Solo admins pueden insertar agentes
DROP POLICY IF EXISTS "Admins can insert agents" ON agents;
CREATE POLICY "Admins can insert agents"
ON agents FOR INSERT
TO public
WITH CHECK (is_admin());

-- Solo admins pueden actualizar agentes
DROP POLICY IF EXISTS "Admins can update agents" ON agents;
CREATE POLICY "Admins can update agents"
ON agents FOR UPDATE
TO public
USING (is_admin());

-- =====================================================
-- PASO 8: CREAR POLÍTICAS RLS - TABLA CLIENTS
-- =====================================================

-- Usuarios autenticados pueden ver clientes
DROP POLICY IF EXISTS "Users can view client data" ON clients;
CREATE POLICY "Users can view client data"
ON clients FOR SELECT
TO authenticated
USING (is_admin() OR is_agent());

-- Solo admins pueden insertar clientes
DROP POLICY IF EXISTS "Admins can insert clients" ON clients;
CREATE POLICY "Admins can insert clients"
ON clients FOR INSERT
TO public
WITH CHECK (is_admin());

-- Admins pueden actualizar clientes
DROP POLICY IF EXISTS "Admins can update clients" ON clients;
CREATE POLICY "Admins can update clients"
ON clients FOR UPDATE
TO public
USING (is_admin());

-- Usuarios autenticados pueden actualizar datos de clientes
DROP POLICY IF EXISTS "Users can update client data" ON clients;
CREATE POLICY "Users can update client data"
ON clients FOR UPDATE
TO authenticated
USING (is_admin() OR is_agent());

-- Solo admins pueden eliminar clientes
DROP POLICY IF EXISTS "Admins can delete clients" ON clients;
CREATE POLICY "Admins can delete clients"
ON clients FOR DELETE
TO public
USING (is_admin());

-- =====================================================
-- PASO 9: CREAR POLÍTICAS RLS - TABLA CALLS
-- =====================================================

-- Agentes pueden ver sus llamadas, admins todas
DROP POLICY IF EXISTS "Agents can view their calls" ON calls;
CREATE POLICY "Agents can view their calls"
ON calls FOR SELECT
TO public
USING (agent_id = (SELECT auth.uid()) OR is_admin());

-- Agentes pueden insertar sus llamadas
DROP POLICY IF EXISTS "Agents can insert calls" ON calls;
CREATE POLICY "Agents can insert calls"
ON calls FOR INSERT
TO public
WITH CHECK (is_agent() AND agent_id = (SELECT auth.uid()));

-- Agentes pueden actualizar sus llamadas, admins todas
DROP POLICY IF EXISTS "Agents can update their calls" ON calls;
CREATE POLICY "Agents can update their calls"
ON calls FOR UPDATE
TO public
USING (agent_id = (SELECT auth.uid()) OR is_admin());

-- =====================================================
-- PASO 10: CREAR POLÍTICAS RLS - TABLA AGENT_ASSIGNMENTS
-- =====================================================

-- Usuarios autenticados pueden ver asignaciones
DROP POLICY IF EXISTS "Allow authenticated users to view assignments" ON agent_assignments;
CREATE POLICY "Allow authenticated users to view assignments"
ON agent_assignments FOR SELECT
TO authenticated
USING (true);

-- Solo admins pueden gestionar asignaciones
DROP POLICY IF EXISTS "Admins can manage assignments" ON agent_assignments;
CREATE POLICY "Admins can manage assignments"
ON agent_assignments FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- =====================================================
-- PASO 11: CREAR POLÍTICAS RLS - TABLA EMAIL_LOGS
-- =====================================================

-- Usuarios pueden ver logs de emails (admins todos, agentes solo los suyos)
DROP POLICY IF EXISTS "Users can view email logs" ON email_logs;
CREATE POLICY "Users can view email logs"
ON email_logs FOR SELECT
TO authenticated
USING (is_admin() OR (is_agent() AND agent_id = (SELECT auth.uid())));

-- Usuarios pueden insertar logs de emails
DROP POLICY IF EXISTS "Users can insert email logs" ON email_logs;
CREATE POLICY "Users can insert email logs"
ON email_logs FOR INSERT
TO authenticated
WITH CHECK ((is_admin() OR is_agent()) AND agent_id = (SELECT auth.uid()));

-- =====================================================
-- PASO 12: CREAR POLÍTICAS RLS - TABLA AGENT_DID_CREDENTIALS
-- =====================================================

-- Solo admins pueden ver credenciales
DROP POLICY IF EXISTS "Admins can view all credentials" ON agent_did_credentials;
CREATE POLICY "Admins can view all credentials"
ON agent_did_credentials FOR SELECT
TO authenticated
USING ((SELECT role FROM agents WHERE id = (SELECT auth.uid())) = 'admin');

-- Solo admins pueden insertar credenciales
DROP POLICY IF EXISTS "Admins can insert credentials" ON agent_did_credentials;
CREATE POLICY "Admins can insert credentials"
ON agent_did_credentials FOR INSERT
TO authenticated
WITH CHECK ((SELECT role FROM agents WHERE id = (SELECT auth.uid())) = 'admin');

-- Solo admins pueden actualizar credenciales
DROP POLICY IF EXISTS "Admins can update credentials" ON agent_did_credentials;
CREATE POLICY "Admins can update credentials"
ON agent_did_credentials FOR UPDATE
TO authenticated
USING ((SELECT role FROM agents WHERE id = (SELECT auth.uid())) = 'admin');

-- Solo admins pueden eliminar credenciales
DROP POLICY IF EXISTS "Admins can delete credentials" ON agent_did_credentials;
CREATE POLICY "Admins can delete credentials"
ON agent_did_credentials FOR DELETE
TO authenticated
USING ((SELECT role FROM agents WHERE id = (SELECT auth.uid())) = 'admin');

-- =====================================================
-- PASO 13: CREAR POLÍTICAS RLS - TABLA CLIENT_COMMENTS
-- =====================================================

-- Admins pueden ver todos los comentarios
DROP POLICY IF EXISTS "Admins can view all comments" ON client_comments;
CREATE POLICY "Admins can view all comments"
ON client_comments FOR SELECT
TO authenticated
USING ((SELECT role FROM agents WHERE id = (SELECT auth.uid())) = 'admin');

-- Agentes pueden ver comentarios de sus clientes asignados
DROP POLICY IF EXISTS "Agents can view their clients comments" ON client_comments;
CREATE POLICY "Agents can view their clients comments"
ON client_comments FOR SELECT
TO authenticated
USING (
  (SELECT role FROM agents WHERE id = (SELECT auth.uid())) = 'agent'
  AND
  EXISTS (
    SELECT 1 FROM agent_assignments aa
    JOIN clients c ON client_comments.client_id = c.id
    WHERE aa.agent_id = (SELECT auth.uid())
    AND aa.is_active = true
    AND c.serial >= aa.client_serial_start
    AND c.serial <= aa.client_serial_end
  )
);

-- Todos los autenticados pueden insertar comentarios (en sus propios clientes)
DROP POLICY IF EXISTS "Authenticated users can insert comments" ON client_comments;
CREATE POLICY "Authenticated users can insert comments"
ON client_comments FOR INSERT
TO authenticated
WITH CHECK (agent_id = (SELECT auth.uid()));

-- Los usuarios pueden editar sus propios comentarios
DROP POLICY IF EXISTS "Users can update their own comments" ON client_comments;
CREATE POLICY "Users can update their own comments"
ON client_comments FOR UPDATE
TO authenticated
USING (agent_id = (SELECT auth.uid()))
WITH CHECK (agent_id = (SELECT auth.uid()));

-- =====================================================
-- PASO 14: CREAR TABLA INVITATION_CODES Y FUNCIONES
-- =====================================================

-- TABLA: invitation_codes
-- Descripción: Sistema de códigos de invitación para registro restringido
-- Fecha de agregado: Enero 2025
-- =====================================================

CREATE TABLE IF NOT EXISTS invitation_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  max_uses INTEGER DEFAULT 1, -- NULL = usos ilimitados
  current_uses INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES agents(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_invitation_codes_code ON invitation_codes(code);
CREATE INDEX IF NOT EXISTS idx_invitation_codes_active ON invitation_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_invitation_codes_expires ON invitation_codes(expires_at);

-- Comentarios de la tabla
COMMENT ON TABLE invitation_codes IS 'Almacena códigos de invitación para controlar el registro de nuevos usuarios';
COMMENT ON COLUMN invitation_codes.code IS 'Código único de invitación';
COMMENT ON COLUMN invitation_codes.max_uses IS 'Máximo de usos permitidos (NULL = ilimitado)';
COMMENT ON COLUMN invitation_codes.current_uses IS 'Contador de usos actuales';
COMMENT ON COLUMN invitation_codes.is_active IS 'Indica si el código está activo';
COMMENT ON COLUMN invitation_codes.expires_at IS 'Fecha de expiración (NULL = sin expiración)';

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_invitation_codes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_invitation_codes_updated_at
  BEFORE UPDATE ON invitation_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_invitation_codes_updated_at();

-- =====================================================
-- POLÍTICAS RLS PARA invitation_codes
-- =====================================================

ALTER TABLE invitation_codes ENABLE ROW LEVEL SECURITY;

-- Política: Los admins pueden ver todos los códigos
CREATE POLICY "Admins pueden ver todos los códigos de invitación"
  ON invitation_codes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agents
      WHERE agents.email = (SELECT auth.jwt() ->> 'email')
      AND agents.role = 'admin'
    )
  );

-- Política: Los admins pueden insertar códigos
CREATE POLICY "Admins pueden crear códigos de invitación"
  ON invitation_codes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM agents
      WHERE agents.email = (SELECT auth.jwt() ->> 'email')
      AND agents.role = 'admin'
    )
  );

-- Política: Los admins pueden actualizar códigos
CREATE POLICY "Admins pueden actualizar códigos de invitación"
  ON invitation_codes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM agents
      WHERE agents.email = (SELECT auth.jwt() ->> 'email')
      AND agents.role = 'admin'
    )
  );

-- Política: Los admins pueden eliminar códigos
CREATE POLICY "Admins pueden eliminar códigos de invitación"
  ON invitation_codes
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM agents
      WHERE agents.email = (SELECT auth.jwt() ->> 'email')
      AND agents.role = 'admin'
    )
  );

-- =====================================================
-- FUNCIONES PARA INVITATION_CODES
-- =====================================================

-- FUNCIÓN: validate_invitation_code
-- Descripción: Valida un código de invitación y actualiza su uso
-- Parámetros: p_code (código a validar)
-- Retorna: JSON con estado de validación
-- Esta función NO requiere autenticación (para permitir registro público)
-- =====================================================

CREATE OR REPLACE FUNCTION validate_invitation_code(p_code VARCHAR)
RETURNS JSON AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCIÓN: get_invitation_codes_stats
-- Descripción: Obtiene estadísticas de códigos de invitación (solo admins)
-- Retorna: JSON con estadísticas de uso
-- =====================================================

CREATE OR REPLACE FUNCTION get_invitation_codes_stats()
RETURNS JSON AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- DATOS INICIALES: Código de invitación por defecto
-- =====================================================

INSERT INTO invitation_codes (code, description, max_uses, is_active)
VALUES (
  'CALLMASK2024',
  'Código de invitación inicial para el equipo',
  NULL, -- NULL = usos ilimitados
  true
)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- FIN DE LA ESTRUCTURA COMPLETA
-- =====================================================

-- Verificación de la estructura
SELECT 'Estructura de base de datos creada exitosamente' AS status;

-- Mostrar resumen de tablas creadas
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
