import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

type CreateAgentBody = {
  name?: unknown;
  username?: unknown;
  role?: unknown;
  password?: unknown;
  is_active?: unknown;
  operation_id?: unknown;
};

type ManagedRole = "owner" | "manager" | "loader" | "agent";
type CreatorRole = "dev" | "owner";

type MyAgentRow = {
  id: string;
  role: string | null;
  is_active: boolean | null;
  operation_id: string | null;
  active_operation_id: string | null;
};

type OperationRow = {
  id: string;
  tenant_id: string | null;
};

type TenantRow = {
  id: string;
  slug: string | null;
};

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

function normalizeUsername(value: unknown) {
  return asString(value)
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9_]/g, "");
}

function isManagedRole(value: string): value is ManagedRole {
  return (
    value === "owner" ||
    value === "manager" ||
    value === "loader" ||
    value === "agent"
  );
}

function isCreatorRole(value: string | null): value is CreatorRole {
  return value === "dev" || value === "owner";
}

function canCreateRole(creatorRole: CreatorRole, targetRole: ManagedRole) {
  if (creatorRole === "dev") {
    return ["owner", "manager", "loader", "agent"].includes(targetRole);
  }

  if (creatorRole === "owner") {
    return ["manager", "loader", "agent"].includes(targetRole);
  }

  return false;
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
        { error: "No tienes permisos para crear usuarios" },
        403,
        headers,
      );
    }

    const body = (await req.json()) as CreateAgentBody;

    const name = asString(body.name);
    const username = normalizeUsername(body.username);
    const role = asString(body.role);
    const password = asString(body.password);
    const isActive = body.is_active !== false;
    const operationId = asString(body.operation_id);

    if (!name) {
      return jsonResponse({ error: "El nombre es obligatorio" }, 400, headers);
    }

    if (username.length < 3) {
      return jsonResponse(
        { error: "El username debe tener minimo 3 caracteres" },
        400,
        headers,
      );
    }

    if (!isManagedRole(role)) {
      return jsonResponse({ error: "Rol invalido" }, 400, headers);
    }

    if (!canCreateRole(me.role, role)) {
      return jsonResponse(
        { error: "No puedes crear usuarios con ese rol" },
        403,
        headers,
      );
    }

    if (!operationId) {
      return jsonResponse(
        { error: "Debes indicar una operacion valida" },
        400,
        headers,
      );
    }

    if (password.length < 6) {
      return jsonResponse(
        { error: "La contrasena temporal debe tener minimo 6 caracteres" },
        400,
        headers,
      );
    }

    const { data: operationData, error: operationError } = await authedClient
      .from("operations")
      .select("id, tenant_id")
      .eq("id", operationId)
      .maybeSingle();

    if (operationError) {
      return jsonResponse(
        {
          error: "No se pudo validar la operacion",
          details: operationError.message,
        },
        400,
        headers,
      );
    }

    const operation = operationData as OperationRow | null;
    if (!operation?.id || !operation.tenant_id) {
      return jsonResponse(
        {
          error: "La operacion no existe o no es visible para el usuario actual",
        },
        403,
        headers,
      );
    }

    const { data: tenantData, error: tenantError } = await adminClient
      .from("tenants")
      .select("id, slug")
      .eq("id", operation.tenant_id)
      .maybeSingle();

    if (tenantError) {
      return jsonResponse(
        {
          error: "No se pudo resolver el tenant de la operacion",
          details: tenantError.message,
        },
        400,
        headers,
      );
    }

    const tenant = tenantData as TenantRow | null;
    const tenantSlug = asString(tenant?.slug);

    if (!tenantSlug) {
      return jsonResponse(
        { error: "El tenant asociado a la operacion no tiene slug valido" },
        400,
        headers,
      );
    }

    const email = `${username}.${role}@${tenantSlug}.ak8crm.com`;

    const { data: existingAgent, error: existingAgentError } = await adminClient
      .from("agents")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingAgentError) {
      return jsonResponse(
        {
          error: "No se pudo verificar si el usuario ya existe",
          details: existingAgentError.message,
        },
        400,
        headers,
      );
    }

    if (existingAgent?.id) {
      return jsonResponse(
        { error: "Ya existe un usuario con ese correo" },
        409,
        headers,
      );
    }

    const { data: createdUserData, error: createUserError } =
      await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          name,
        },
        app_metadata: {
          role,
        },
      });

    if (createUserError || !createdUserData.user) {
      return jsonResponse(
        {
          error: "No se pudo crear el usuario en Auth",
          details: createUserError?.message ?? "createUser failed",
        },
        400,
        headers,
      );
    }

    const createdUser = createdUserData.user;

    const { error: insertAgentError } = await adminClient.from("agents").insert({
      id: createdUser.id,
      name,
      email,
      role,
      operation_id: operationId,
      is_active: isActive,
      active_operation_id: role === "owner" ? operationId : null,
    });

    if (insertAgentError) {
      await adminClient.auth.admin.deleteUser(createdUser.id).catch(() => null);

      return jsonResponse(
        {
          error: "No se pudo registrar el usuario en agents",
          details: insertAgentError.message,
        },
        400,
        headers,
      );
    }

    return jsonResponse(
      {
        success: true,
        user_id: createdUser.id,
        email,
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
