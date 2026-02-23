// supabase.ts - Configuración y funciones para interactuar con Supabase. Incluye autenticación, manejo de clientes, agentes, llamadas, asignaciones y comentarios. Respetando RLS y permisos de usuario.

import { createClient } from "@supabase/supabase-js";

// Configuración de Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Faltan las variables de entorno de Supabase");
}

// Crear cliente de Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Tipos de datos para TypeScript
export interface Client {
  id: string;
  // Columnas principales (orden requerido)
  first_name?: string; // nombre o firstName
  last_name?: string; // apellido o lastName
  email?: string; // correo o email
  phone_number?: string; // teléfono o phone
  country?: string; // país o country
  source?: string; // empresa o source
  funnel?: string; // funnel
  deposit_amount?: number; // deposit_amount
  net_deposit?: number; // net_deposit
  user_balance?: number; // user_balance

  // Columnas del sistema (no se suben desde Excel)
  name?: string; // Mantenido para compatibilidad
  serial: string;
  trading_company?: string; // Mantenido para compatibilidad
  investment_date?: string; // Mantenido para compatibilidad
  status_color: "gray" | "red" | "yellow" | "green" | "blue";
  attempts: number;
  created_at: string;
  updated_at?: string;
}

// Interfaz para comentarios de clientes (nueva tabla)
export interface ClientComment {
  id: string;
  client_id: string;
  agent_id: string;
  comment: string;
  created_at: string;
  agent?: {
    name: string;
  };
}

export interface Agent {
  id: string;
  name: string;
  email: string;
  role: "admin" | "agent";
  created_at: string;
}

export interface Call {
  id: string;
  client_id: string;
  agent_id: string;
  start_time: string;
  end_time?: string;
  status: "in_progress" | "completed" | "failed" | "no_answer";
  duration?: number;
  created_at: string;
  client?: Client;
  agent?: Agent;
}

export interface AgentAssignment {
  id: string;
  agent_id: string;
  client_serial_start: string;
  client_serial_end: string;
  assigned_by: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  agent?: Agent;
  assigned_by_agent?: Agent;
}

export interface AgentDidCredentials {
  id: string;
  agent_id: string;
  extension_number: string; // Número de extensión (101, 102, 103...)
  is_active: boolean;
  created_at: string;
  updated_at: string;
  agent?: Agent;
}

// Tabla comments eliminada - se usa clients.comments en su lugar

// Funciones de utilidad para autenticación
export const auth = {
  // Obtener usuario actual
  getCurrentUser: async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  },

  // Iniciar sesión
  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  // Cerrar sesión
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  // Verificar si el usuario es admin
  isAdmin: async () => {
    const user = await auth.getCurrentUser();
    if (!user) return false;

    const { data: agent, error } = await supabase
      .from("agents")
      .select("role")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Error verificando admin:", error);
      return false;
    }

    return agent?.role === "admin";
  },
};

// Funciones para manejar agentes
export const agents = {
  // Obtener todos los agentes (solo para admins)
  getAll: async () => {
    const { data, error } = await supabase
      .from("agents")
      .select("*")
      .order("created_at", { ascending: false });

    return { data, error };
  },

  // Obtener agente por ID
  getById: async (id: string) => {
    const { data, error } = await supabase
      .from("agents")
      .select("*")
      .eq("id", id)
      .single();

    return { data, error };
  },
};

// Funciones para manejar clientes
export const clients = {
  // Buscar clientes por nombre o serial (respeta permisos RLS)
  search: async (query: string, agentId?: string) => {
    // Si es un agente, buscar SOLO en sus clientes asignados (assigned_to)
    if (agentId) {
      const q = query.trim();
      if (!q) return { data: [], error: null };

      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("assigned_to", agentId)
        .or(
          `first_name.ilike.%${q}%,last_name.ilike.%${q}%,serial.ilike.%${q}%`,
        )
        .order("created_at", { ascending: false })
        .limit(50);

      return { data: data ?? [], error };
    }

    // Si es admin, buscar en todos los clientes
    const q = query.trim();
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,serial.ilike.%${q}%`)
      .order("created_at", { ascending: false })
      .limit(50);

    return { data: data ?? [], error };
  },

  // Obtener todos los clientes (solo para admins)
  getAll: async () => {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false });

    return { data, error };
  },

  // Obtener cliente por ID (respeta permisos RLS)
  getById: async (id: string) => {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("id", id)
      .single();

    return { data, error };
  },

  // Crear cliente (solo para admins)
  create: async (
    clientData: Omit<Client, "id" | "created_at" | "updated_at">,
  ) => {
    const { data, error } = await supabase
      .from("clients")
      .insert(clientData)
      .select()
      .single();

    return { data, error };
  },

  // Actualizar cliente (solo para admins)
  update: async (id: string, updates: Partial<Client>) => {
    const { data, error } = await supabase
      .from("clients")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    return { data, error };
  },

  // Eliminar cliente (solo para admins)
  delete: async (id: string) => {
    const { error } = await supabase.from("clients").delete().eq("id", id);

    return { error };
  },
};

// Funciones para manejar llamadas
export const calls = {
  // Iniciar llamada
  start: async (clientId: string, agentId: string) => {
    const { data, error } = await supabase.functions.invoke("start-call", {
      body: {
        client_id: clientId,
        agent_id: agentId,
      },
    });

    return { data, error };
  },

  // Obtener llamadas recientes del agente
  getRecent: async (agentId?: string) => {
    try {
      const { data, error } = await supabase.rpc("get_recent_calls", {
        p_agent_id: agentId || null,
      });

      if (error) {
        console.error("Error en get_recent_calls RPC:", error);
        return { data: null, error };
      }

      // Mapear la respuesta de la función RPC a la estructura esperada por el frontend
      const mappedData =
        data?.map((call: any) => ({
          ...call,
          client: {
            id: call.client_id,
            first_name: call.client_first_name,
            serial: call.client_serial,
            status_color: call.client_status_color,
          },
          agent: {
            id: call.agent_id,
            name: call.agent_name,
          },
        })) || [];

      return { data: mappedData, error: null };
    } catch (error) {
      console.error("Error en getRecent:", error);
      return { data: null, error };
    }
  },

  // Obtener llamada por ID
  getById: async (id: string) => {
    const { data, error } = await supabase
      .from("calls")
      .select(
        `
        *,
        client:clients(*),
        agent:agents(*)
      `,
      )
      .eq("id", id)
      .single();

    return { data, error };
  },
};

// Funciones para manejar asignaciones de agentes
export const agentAssignments = {
  // Obtener todas las asignaciones (solo para admins)
  getAll: async () => {
    try {
      console.log("agentAssignments.getAll: Iniciando consulta...");

      // Primero obtener las asignaciones sin joins
      const { data: assignments, error: assignmentsError } = await supabase
        .from("agent_assignments")
        .select("*")
        .order("created_at", { ascending: false });

      if (assignmentsError) {
        console.error("Error obteniendo asignaciones:", assignmentsError);
        console.error(
          "Detalles del error:",
          JSON.stringify(assignmentsError, null, 2),
        );
        return { data: null, error: assignmentsError };
      }

      console.log("Asignaciones obtenidas:", assignments?.length);

      if (!assignments || assignments.length === 0) {
        return { data: [], error: null };
      }

      // Obtener información de agentes por separado
      const agentIds = [
        ...new Set(
          assignments
            .map((a) => a.agent_id)
            .concat(assignments.map((a) => a.assigned_by)),
        ),
      ];

      const { data: agents, error: agentsError } = await supabase
        .from("agents")
        .select("*")
        .in("id", agentIds);

      if (agentsError) {
        console.error("Error obteniendo agentes:", agentsError);
        return { data: assignments, error: null }; // Devolver asignaciones sin joins si falla
      }

      // Combinar datos
      const enrichedAssignments = assignments.map((assignment) => ({
        ...assignment,
        agent: agents?.find((agent) => agent.id === assignment.agent_id),
        assigned_by_agent: agents?.find(
          (agent) => agent.id === assignment.assigned_by,
        ),
      }));

      console.log(
        "getAll exitoso, asignaciones enriquecidas:",
        enrichedAssignments.length,
      );
      return { data: enrichedAssignments, error: null };
    } catch (err) {
      console.error("Error en getAll:", err);
      return { data: null, error: err };
    }
  },

  // Obtener asignaciones de un agente específico
  getByAgentId: async (agentId: string) => {
    const { data, error } = await supabase
      .from("agent_assignments")
      .select(
        `
        *,
        agent:agents(*),
        assigned_by_agent:agents!assigned_by(*)
      `,
      )
      .eq("agent_id", agentId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    return { data, error };
  },

  // Crear nueva asignación
  create: async (
    assignmentData: Omit<AgentAssignment, "id" | "created_at" | "updated_at">,
  ) => {
    console.log(
      "agentAssignments.create: Creando asignación...",
      assignmentData,
    );

    const { data, error } = await supabase
      .from("agent_assignments")
      .insert(assignmentData)
      .select("*")
      .single();

    if (error) {
      console.error("Error en create:", error);
      console.error("Detalles del error:", JSON.stringify(error, null, 2));
    } else {
      console.log("Asignación creada exitosamente:", data);
    }

    return { data, error };
  },

  // Actualizar asignación
  update: async (id: string, updates: Partial<AgentAssignment>) => {
    const { data, error } = await supabase
      .from("agent_assignments")
      .update(updates)
      .eq("id", id)
      .select(
        `
        *,
        agent:agents(*),
        assigned_by_agent:agents!assigned_by(*)
      `,
      )
      .single();

    return { data, error };
  },

  // Eliminar asignación completamente
  deactivate: async (id: string) => {
    const { data, error } = await supabase
      .from("agent_assignments")
      .delete()
      .eq("id", id)
      .select()
      .single();

    return { data, error };
  },

  // Obtener clientes asignados a un agente (expandiendo rangos a clientes individuales)
  getAssignedClients: async (agentId: string) => {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("assigned_to", agentId)
      .order("created_at", { ascending: false });

    return { data: data ?? [], error };
  },

  // Asignar clientes a un agente de forma atómica usando función RPC
  assignLeadsAtomic: async (params: {
    agent_id: string;
    count: number;
    assigned_by: string;
    campaign_prefix?: string | null;
  }) => {
    const { data, error } = await supabase.rpc("assign_leads_atomic", {
      p_agent_id: params.agent_id,
      p_count: params.count,
      p_assigned_by: params.assigned_by,
      p_campaign_prefix: params.campaign_prefix ?? null,
    });

    return { data, error };
  },

  // Obtener clientes asignados individuales para mostrar en la tabla de gestión
  getAssignedClientsForManagement: async (agentId: string) => {
    try {
      const { data: assignments, error: assignmentsError } = await supabase
        .from("agent_assignments")
        .select(
          "id, client_serial_start, client_serial_end, created_at, assigned_by",
        )
        .eq("agent_id", agentId)
        .eq("is_active", true);

      if (assignmentsError) {
        console.error("Error obteniendo asignaciones:", assignmentsError);
        return { data: null, error: assignmentsError };
      }

      if (!assignments || assignments.length === 0) {
        console.log("No hay asignaciones para el agente:", agentId);
        return { data: [], error: null };
      }

      const { data: allClients, error: clientsError } = await supabase
        .from("clients")
        .select("*");

      if (clientsError) {
        console.error("Error obteniendo clientes:", clientsError);
        return { data: null, error: clientsError };
      }

      // Expandir rangos a clientes individuales con información de asignación
      const assignedClients = [];

      for (const assignment of assignments) {
        const clientsInRange =
          allClients?.filter((client) => {
            const clientSerial = client.serial;
            const startSerial = assignment.client_serial_start;
            const endSerial = assignment.client_serial_end;

            return clientSerial >= startSerial && clientSerial <= endSerial;
          }) || [];

        // Agregar información de asignación a cada cliente
        for (const client of clientsInRange) {
          assignedClients.push({
            ...client,
            assignment_id: assignment.id,
            assigned_at: assignment.created_at,
            assigned_by: assignment.assigned_by,
          });
        }
      }

      console.log(
        "Clientes individuales asignados encontrados:",
        assignedClients.length,
      );
      return { data: assignedClients, error: null };
    } catch (error) {
      console.error("Error en getAssignedClientsForManagement:", error);
      return { data: null, error: error };
    }
  },
};

// Funciones para manejar emails
export const emails = {
  // Enviar email a un cliente (versión legacy - sin selección de cuenta)
  send: async (
    clientId: string,
    subject: string,
    message: string,
    agentId?: string,
  ) => {
    try {
      const { data, error } = await supabase.functions.invoke("send-email", {
        body: {
          client_id: clientId,
          subject,
          message,
          agent_id: agentId,
        },
      });

      if (error) {
        console.error("Error enviando email:", error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error("Error en send email:", error);
      return { data: null, error };
    }
  },

  // Enviar email con selección de cuenta (multi-cuenta)
  sendWithAccount: async (
    clientId: string,
    subject: string,
    message: string,
    agentId?: string,
    emailAccountId?: number,
  ) => {
    try {
      const { data, error } = await supabase.functions.invoke("send-email", {
        body: {
          client_id: clientId,
          subject,
          message,
          agent_id: agentId,
          email_account_id: emailAccountId,
        },
      });

      if (error) {
        console.error("Error enviando email:", error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error("Error en send email:", error);
      return { data: null, error };
    }
  },

  // Obtener historial de emails enviados
  getHistory: async (clientId?: string) => {
    try {
      let query = supabase
        .from("email_logs")
        .select(
          `
          *,
          client:clients(name, serial),
          agent:agents(name)
        `,
        )
        .order("sent_at", { ascending: false });

      if (clientId) {
        query = query.eq("client_id", clientId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error obteniendo historial de emails:", error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error("Error en getHistory:", error);
      return { data: null, error };
    }
  },
};

// Funciones para manejar comentarios de clientes
export const clientComments = {
  // Obtener todos los comentarios de un cliente
  getByClient: async (clientId: string) => {
    try {
      const { data, error } = await supabase
        .from("client_comments")
        .select(
          `
          *,
          agent:agents(id, name)
        `,
        )
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error obteniendo comentarios:", error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error("Error en getByClient:", error);
      return { data: null, error };
    }
  },

  // Añadir un nuevo comentario
  add: async (clientId: string, agentId: string, comment: string) => {
    try {
      const { data, error } = await supabase
        .from("client_comments")
        .insert({
          client_id: clientId,
          agent_id: agentId,
          comment: comment.trim(),
        })
        .select(
          `
          *,
          agent:agents(id, name)
        `,
        )
        .single();

      if (error) {
        console.error("Error añadiendo comentario:", error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error("Error en add:", error);
      return { data: null, error };
    }
  },

  // Actualizar un comentario existente
  update: async (commentId: string, newComment: string) => {
    try {
      const { data, error } = await supabase
        .from("client_comments")
        .update({
          comment: newComment.trim(),
        })
        .eq("id", commentId)
        .select(
          `
          *,
          agent:agents(id, name)
        `,
        )
        .single();

      if (error) {
        console.error("Error actualizando comentario:", error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error("Error en update:", error);
      return { data: null, error };
    }
  },
};

// Funciones para manejar credenciales de Did-glo-bal
export const didCredentials = {
  // Obtener todas las credenciales de agentes
  getAll: async () => {
    try {
      const { data, error } = await supabase
        .from("agent_did_credentials")
        .select(
          `
          *,
          agent:agents(id, name, email, role)
        `,
        )
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error obteniendo credenciales:", error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error("Error en getAll credentials:", error);
      return { data: null, error };
    }
  },

  // Obtener credenciales de un agente específico
  getByAgentId: async (agentId: string) => {
    try {
      const { data, error } = await supabase
        .from("agent_did_credentials")
        .select(
          `
          *,
          agent:agents(id, name, email, role)
        `,
        )
        .eq("agent_id", agentId)
        .eq("is_active", true)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 = no rows returned
        console.error("Error obteniendo credenciales del agente:", error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error("Error en getByAgentId:", error);
      return { data: null, error };
    }
  },

  // Crear o actualizar credenciales de un agente
  upsert: async (credentials: {
    agent_id: string;
    extension_number: string;
  }) => {
    try {
      const { data, error } = await supabase
        .from("agent_did_credentials")
        .upsert(
          {
            ...credentials,
            is_active: true,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "agent_id",
          },
        )
        .select()
        .single();

      if (error) {
        console.error("Error guardando credenciales:", error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error("Error en upsert credentials:", error);
      return { data: null, error };
    }
  },

  // Eliminar credenciales de un agente
  delete: async (agentId: string) => {
    try {
      const { error } = await supabase
        .from("agent_did_credentials")
        .delete()
        .eq("agent_id", agentId);

      if (error) {
        console.error("Error eliminando credenciales:", error);
        return { error };
      }

      return { error: null };
    } catch (error) {
      console.error("Error en delete credentials:", error);
      return { error };
    }
  },

  // Desactivar credenciales de un agente
  deactivate: async (agentId: string) => {
    try {
      const { error } = await supabase
        .from("agent_did_credentials")
        .update({ is_active: false })
        .eq("agent_id", agentId);

      if (error) {
        console.error("Error desactivando credenciales:", error);
        return { error };
      }

      return { error: null };
    } catch (error) {
      console.error("Error en deactivate credentials:", error);
      return { error };
    }
  },

  // Probar conexión con Did-glo-bal usando credenciales
  testConnection: async (extensionNumber: string) => {
    try {
      // Validar que la extensión sea un número válido
      const extensionNum = parseInt(extensionNumber);
      if (isNaN(extensionNum) || extensionNum < 100 || extensionNum > 999) {
        return {
          success: false,
          error: "El número de extensión debe ser un número entre 100 y 999",
        };
      }

      // Simular prueba de conexión (en realidad no podemos probar sin hacer una llamada real)
      return { success: true, error: null };
    } catch (error) {
      console.error("Error probando conexión:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido",
      };
    }
  },
};

// Funciones de comentarios eliminadas - se usa clients.comments en su lugar
