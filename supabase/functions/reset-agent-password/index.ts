import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type ResetPasswordBody = {
  id?: unknown;
  password?: unknown;
};

type UpdaterRole = "dev" | "owner" | "manager";

type MyAgentRow = {
  id: string;
  role: string | null;
  is_active: boolean | null;
};

type TargetAgentRow = {
  id: string;
  role: string | null;
  email: string | null;
};

function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

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

function isUpdaterRole(value: string | null): value is UpdaterRole {
  return value === "dev" || value === "owner" || value === "manager";
}

function canResetPasswordForTarget(
  viewerRole: UpdaterRole,
  targetRole: string | null,
  isSelf: boolean,
) {
  if (!targetRole) return false;

  switch (viewerRole) {
    case "dev":
      return ["dev", "owner", "manager", "loader", "agent"].includes(targetRole);
    case "owner":
      return ["owner", "manager", "loader", "agent"].includes(targetRole);
    case "manager":
      return !isSelf && ["loader", "agent"].includes(targetRole);
    default:
      return false;
  }
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
      return jsonResponse({ error: "Missing access token" }, 401, headers);
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
    if (!me || !me.is_active || !isUpdaterRole(me.role)) {
      return jsonResponse(
        { error: "No tienes permisos para actualizar contrasenas" },
        403,
        headers,
      );
    }

    const body = (await req.json()) as ResetPasswordBody;
    const targetId = asString(body.id);
    const password = asString(body.password);

    if (!targetId) {
      return jsonResponse(
        { error: "Debes indicar un usuario valido" },
        400,
        headers,
      );
    }

    if (password.length < 6) {
      return jsonResponse(
        { error: "La nueva contrasena debe tener minimo 6 caracteres" },
        400,
        headers,
      );
    }

    const { data: targetData, error: targetError } = await authedClient.rpc(
      "get_agent",
      { p_id: targetId },
    );

    if (targetError) {
      return jsonResponse(
        {
          error: "No se pudo validar el usuario destino",
          details: targetError.message,
        },
        403,
        headers,
      );
    }

    const target = (Array.isArray(targetData) ? targetData[0] : targetData) as
      | TargetAgentRow
      | null;

    if (!target?.id) {
      return jsonResponse(
        { error: "El usuario destino no existe o no esta visible para ti" },
        404,
        headers,
      );
    }

    const isSelf = target.id === me.id;
    if (!canResetPasswordForTarget(me.role, target.role, isSelf)) {
      return jsonResponse(
        { error: "No tienes permisos para actualizar la contrasena de este usuario" },
        403,
        headers,
      );
    }

    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      target.id,
      { password },
    );

    if (updateError) {
      return jsonResponse(
        {
          error: "No se pudo actualizar la contrasena en Auth",
          details: updateError.message,
        },
        400,
        headers,
      );
    }

    return jsonResponse(
      {
        success: true,
        user_id: target.id,
        email: target.email,
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
