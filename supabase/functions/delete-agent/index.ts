import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

type DeleteAgentBody = {
  id?: unknown;
  scheduled_calls_action?: unknown;
  migrate_to_agent_id?: unknown;
};

type MyAgentRow = {
  id: string;
  role: string | null;
  is_active: boolean | null;
};

type CreatorRole = "dev" | "owner";

function jsonResponse(
  payload: unknown,
  status: number,
  headers: Record<string, string>,
) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
  });
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asScheduledCallsAction(value: unknown) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (
    normalized === "block" ||
    normalized === "delete" ||
    normalized === "migrate"
  ) {
    return normalized;
  }
  return "block";
}

function isCreatorRole(value: string | null): value is CreatorRole {
  return value === "dev" || value === "owner";
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Metodo no permitido" }, 405, headers);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const authHeader = req.headers.get("Authorization") ?? "";

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return jsonResponse(
        { error: "Faltan variables de entorno de Supabase" },
        500,
        headers,
      );
    }

    if (!authHeader.startsWith("Bearer ")) {
      return jsonResponse(
        { error: "Missing Authorization header" },
        401,
        headers,
      );
    }

    const accessToken = authHeader.replace(/^Bearer\s+/i, "").trim();

    if (!accessToken) {
      return jsonResponse(
        { error: "Missing access token" },
        401,
        headers,
      );
    }

    const userClient = createClient(supabaseUrl, anonKey);
    const authedClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: authData, error: authError } = await userClient.auth.getUser(
      accessToken,
    );

    if (authError || !authData.user) {
      return jsonResponse(
        {
          error: "Unauthorized",
          details: authError?.message ?? "Invalid JWT",
        },
        401,
        headers,
      );
    }

    const { data: meData, error: meError } = await authedClient.rpc("my_agent");
    if (meError) {
      return jsonResponse(
        {
          error: "No se pudo validar el perfil actual",
          details: meError.message,
        },
        403,
        headers,
      );
    }

    const me = (Array.isArray(meData) ? meData[0] : meData) as MyAgentRow | null;
    if (!me || !me.is_active || !isCreatorRole(me.role)) {
      return jsonResponse(
        { error: "No tienes permisos para eliminar usuarios" },
        403,
        headers,
      );
    }

    const body = (await req.json()) as DeleteAgentBody;
    const targetId = asString(body.id);
    const scheduledCallsAction = asScheduledCallsAction(
      body.scheduled_calls_action,
    );
    const migrateToAgentId = asString(body.migrate_to_agent_id) || null;

    if (!targetId) {
      return jsonResponse(
        { error: "Debes indicar un usuario valido" },
        400,
        headers,
      );
    }

    const { error: deleteRowError } = await authedClient.rpc("delete_agent", {
      p_id: targetId,
      p_scheduled_calls_action: scheduledCallsAction,
      p_migrate_to_agent_id: migrateToAgentId,
    });

    if (deleteRowError) {
      return jsonResponse(
        {
          error: "No se pudo eliminar el usuario",
          details: deleteRowError.message,
        },
        400,
        headers,
      );
    }

    const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(
      targetId,
    );

    if (deleteAuthError) {
      return jsonResponse(
        {
          error: "El usuario se elimino de agents, pero no de Auth",
          details: deleteAuthError.message,
        },
        502,
        headers,
      );
    }

    return jsonResponse(
      {
        success: true,
        user_id: targetId,
      },
      200,
      headers,
    );
  } catch (error) {
    return jsonResponse(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : String(error),
      },
      500,
      headers,
    );
  }
});
