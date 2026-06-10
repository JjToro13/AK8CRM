import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Operation2faBody = {
  action?: unknown;
  operation_id?: unknown;
  setup_id?: unknown;
  code?: unknown;
};

type SecuritySettingsRow = {
  operation_id: string;
  totp_enabled: boolean | null;
  totp_secret_ciphertext: string | null;
  totp_secret_iv: string | null;
  totp_issuer: string | null;
  totp_label: string | null;
  totp_rotated_at: string | null;
  pending_setup_id: string | null;
  pending_totp_secret_ciphertext: string | null;
  pending_totp_secret_iv: string | null;
  pending_setup_expires_at: string | null;
};

const TOTP_PERIOD_SECONDS = 30;
const TOTP_DIGITS = 6;
const TOTP_WINDOW = 1;
const VERIFICATION_TTL_HOURS = 12;
const SETUP_TTL_MINUTES = 15;
const MAX_FAILED_ATTEMPTS = 5;
const FAILED_ATTEMPT_WINDOW_MINUTES = 10;
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://ak8crm.com",
];

function corsHeaders(origin?: string | null) {
  const envOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const allowedOrigins = new Set([...DEFAULT_ALLOWED_ORIGINS, ...envOrigins]);
  const resolvedOrigin =
    origin && allowedOrigins.has(origin)
      ? origin
      : DEFAULT_ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": resolvedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
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

function normalizeCode(value: unknown) {
  return asString(value).replace(/\s+/g, "");
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function base32Encode(bytes: Uint8Array) {
  let bits = 0;
  let value = 0;
  let output = "";

  bytes.forEach((byte) => {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  });

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

function base32Decode(value: string) {
  const normalized = value.toUpperCase().replace(/=+$/g, "").replace(/\s+/g, "");
  let bits = 0;
  let buffer = 0;
  const bytes: number[] = [];

  for (const char of normalized) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index < 0) {
      throw new Error("Invalid base32 secret");
    }

    buffer = (buffer << 5) | index;
    bits += 5;

    if (bits >= 8) {
      bytes.push((buffer >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return new Uint8Array(bytes);
}

async function deriveEncryptionKey(secret: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(secret),
  );

  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

async function encryptSecret(secret: string, keyMaterial: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveEncryptionKey(keyMaterial);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(secret),
  );

  return {
    ciphertext: bytesToBase64(new Uint8Array(encrypted)),
    iv: bytesToBase64(iv),
  };
}

async function decryptSecret(
  ciphertext: string,
  iv: string,
  keyMaterial: string,
) {
  const key = await deriveEncryptionKey(keyMaterial);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(iv) },
    key,
    base64ToBytes(ciphertext),
  );

  return new TextDecoder().decode(decrypted);
}

async function hotp(secret: string, counter: number) {
  const key = await crypto.subtle.importKey(
    "raw",
    base32Decode(secret),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const counterBytes = new ArrayBuffer(8);
  const view = new DataView(counterBytes);
  view.setUint32(4, counter, false);

  const hmac = new Uint8Array(await crypto.subtle.sign("HMAC", key, counterBytes));
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  const token = binary % 10 ** TOTP_DIGITS;

  return String(token).padStart(TOTP_DIGITS, "0");
}

async function verifyTotp(secret: string, code: string) {
  if (!/^\d{6}$/.test(code)) return false;

  const counter = Math.floor(Date.now() / 1000 / TOTP_PERIOD_SECONDS);
  for (let skew = -TOTP_WINDOW; skew <= TOTP_WINDOW; skew += 1) {
    if ((await hotp(secret, counter + skew)) === code) {
      return true;
    }
  }

  return false;
}

function createSecret() {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  return base32Encode(bytes);
}

function buildOtpAuthUri(params: {
  issuer: string;
  label: string;
  secret: string;
}) {
  return `otpauth://totp/${encodeURIComponent(`${params.issuer}:${params.label}`)}?secret=${params.secret}&issuer=${encodeURIComponent(params.issuer)}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD_SECONDS}`;
}

async function sha256Hex(value: string) {
  const hash = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
  );
  return Array.from(hash)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60_000);
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
    const encryptionKey = Deno.env.get("OPERATION_2FA_SECRET_KEY") ?? "";
    const authHeader = req.headers.get("Authorization") ?? "";

    if (!supabaseUrl || !anonKey || !serviceRoleKey || !encryptionKey) {
      return jsonResponse(
        { error: "Faltan variables de entorno para Operation 2FA" },
        500,
        headers,
      );
    }

    if (!authHeader.startsWith("Bearer ")) {
      return jsonResponse({ error: "Missing Authorization header" }, 401, headers);
    }

    const accessToken = authHeader.replace(/^Bearer\s+/i, "").trim();
    const userClient = createClient(supabaseUrl, anonKey);
    const authedClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

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

    const body = (await req.json()) as Operation2faBody;
    const action = asString(body.action);
    const operationId = asString(body.operation_id);
    const code = normalizeCode(body.code);
    const setupId = asString(body.setup_id);

    if (!operationId) {
      return jsonResponse({ error: "operation_id es requerido" }, 400, headers);
    }

    if (action === "get_settings") {
      const { data, error } = await authedClient.rpc(
        "get_operation_security_settings",
        { p_operation_id: operationId },
      );

      if (error) {
        return jsonResponse({ error: error.message }, 403, headers);
      }

      return jsonResponse({ data: Array.isArray(data) ? data[0] : data }, 200, headers);
    }

    if (action === "start_enrollment") {
      const { data: allowed, error: allowedError } = await authedClient.rpc(
        "can_manage_operation",
        { p_operation_id: operationId },
      );

      if (allowedError || allowed !== true) {
        return jsonResponse(
          { error: "No tienes permisos para configurar 2FA" },
          403,
          headers,
        );
      }

      const { data: operation, error: operationError } = await serviceClient
        .from("operations")
        .select("name, slug")
        .eq("id", operationId)
        .maybeSingle();

      if (operationError || !operation) {
        return jsonResponse({ error: "Operacion no encontrada" }, 404, headers);
      }

      const issuer = "AK8 CRM";
      const label = operation.name ?? operation.slug ?? "Operacion";
      const secret = createSecret();
      const encrypted = await encryptSecret(secret, encryptionKey);
      const nextSetupId = crypto.randomUUID();
      const expiresAt = addMinutes(new Date(), SETUP_TTL_MINUTES).toISOString();

      const { error: upsertError } = await serviceClient
        .from("operation_security_settings")
        .upsert(
          {
            operation_id: operationId,
            totp_issuer: issuer,
            totp_label: label,
            pending_setup_id: nextSetupId,
            pending_totp_secret_ciphertext: encrypted.ciphertext,
            pending_totp_secret_iv: encrypted.iv,
            pending_setup_expires_at: expiresAt,
          },
          { onConflict: "operation_id" },
        );

      if (upsertError) {
        return jsonResponse(
          { error: "No se pudo preparar el autenticador", details: upsertError.message },
          400,
          headers,
        );
      }

      return jsonResponse(
        {
          data: {
            setup_id: nextSetupId,
            secret,
            otpauth_uri: buildOtpAuthUri({ issuer, label, secret }),
            expires_at: expiresAt,
          },
        },
        200,
        headers,
      );
    }

    if (action === "confirm_enrollment") {
      const { data: allowed } = await authedClient.rpc("can_manage_operation", {
        p_operation_id: operationId,
      });

      if (allowed !== true) {
        return jsonResponse(
          { error: "No tienes permisos para confirmar 2FA" },
          403,
          headers,
        );
      }

      if (!setupId || !code) {
        return jsonResponse(
          { error: "setup_id y code son requeridos" },
          400,
          headers,
        );
      }

      const { data: settings, error: settingsError } = await serviceClient
        .from("operation_security_settings")
        .select("*")
        .eq("operation_id", operationId)
        .maybeSingle();

      const row = settings as SecuritySettingsRow | null;

      if (settingsError || !row?.pending_setup_id) {
        return jsonResponse({ error: "No hay configuracion pendiente" }, 400, headers);
      }

      if (
        row.pending_setup_id !== setupId ||
        !row.pending_setup_expires_at ||
        new Date(row.pending_setup_expires_at).getTime() < Date.now() ||
        !row.pending_totp_secret_ciphertext ||
        !row.pending_totp_secret_iv
      ) {
        return jsonResponse({ error: "Configuracion pendiente invalida" }, 400, headers);
      }

      const secret = await decryptSecret(
        row.pending_totp_secret_ciphertext,
        row.pending_totp_secret_iv,
        encryptionKey,
      );
      const valid = await verifyTotp(secret, code);

      if (!valid) {
        return jsonResponse({ error: "Codigo invalido" }, 400, headers);
      }

      const rotatedAt = new Date().toISOString();
      const { error: updateError } = await serviceClient
        .from("operation_security_settings")
        .update({
          totp_enabled: true,
          totp_secret_ciphertext: row.pending_totp_secret_ciphertext,
          totp_secret_iv: row.pending_totp_secret_iv,
          totp_rotated_at: rotatedAt,
          pending_setup_id: null,
          pending_totp_secret_ciphertext: null,
          pending_totp_secret_iv: null,
          pending_setup_expires_at: null,
        })
        .eq("operation_id", operationId);

      if (updateError) {
        return jsonResponse(
          { error: "No se pudo activar 2FA", details: updateError.message },
          400,
          headers,
        );
      }

      await serviceClient
        .from("operation_2fa_verifications")
        .delete()
        .eq("operation_id", operationId);

      return jsonResponse({ data: { totp_enabled: true, totp_rotated_at: rotatedAt } }, 200, headers);
    }

    if (action === "disable") {
      const { data: allowed } = await authedClient.rpc("can_manage_operation", {
        p_operation_id: operationId,
      });

      if (allowed !== true) {
        return jsonResponse(
          { error: "No tienes permisos para desactivar 2FA" },
          403,
          headers,
        );
      }

      const { error: updateError } = await serviceClient
        .from("operation_security_settings")
        .upsert(
          {
            operation_id: operationId,
            totp_enabled: false,
            totp_secret_ciphertext: null,
            totp_secret_iv: null,
            totp_rotated_at: null,
            pending_setup_id: null,
            pending_totp_secret_ciphertext: null,
            pending_totp_secret_iv: null,
            pending_setup_expires_at: null,
          },
          { onConflict: "operation_id" },
        );

      if (updateError) {
        return jsonResponse(
          { error: "No se pudo desactivar 2FA", details: updateError.message },
          400,
          headers,
        );
      }

      await serviceClient
        .from("operation_2fa_verifications")
        .delete()
        .eq("operation_id", operationId);

      return jsonResponse({ data: { totp_enabled: false } }, 200, headers);
    }

    if (action === "verify") {
      const { data: allowed } = await authedClient.rpc("can_access_operation_by_id", {
        p_operation_id: operationId,
      });

      if (allowed !== true) {
        return jsonResponse({ error: "Operacion no visible" }, 403, headers);
      }

      const { data: settings } = await serviceClient
        .from("operation_security_settings")
        .select("*")
        .eq("operation_id", operationId)
        .maybeSingle();

      const row = settings as SecuritySettingsRow | null;

      if (!row?.totp_enabled) {
        return jsonResponse({ data: { required: false, verified: true } }, 200, headers);
      }

      if (!row.totp_secret_ciphertext || !row.totp_secret_iv) {
        return jsonResponse({ error: "2FA no esta configurado" }, 400, headers);
      }

      if (!code) {
        return jsonResponse({ error: "El codigo es requerido" }, 400, headers);
      }

      const since = addMinutes(new Date(), -FAILED_ATTEMPT_WINDOW_MINUTES)
        .toISOString();
      const { count } = await serviceClient
        .from("operation_2fa_attempts")
        .select("id", { count: "exact", head: true })
        .eq("operation_id", operationId)
        .eq("agent_id", authData.user.id)
        .eq("success", false)
        .gte("attempted_at", since);

      if ((count ?? 0) >= MAX_FAILED_ATTEMPTS) {
        return jsonResponse(
          { error: "Demasiados intentos fallidos. Espera unos minutos." },
          429,
          headers,
        );
      }

      const secret = await decryptSecret(
        row.totp_secret_ciphertext,
        row.totp_secret_iv,
        encryptionKey,
      );
      const valid = await verifyTotp(secret, code);
      const ipHash = await sha256Hex(req.headers.get("x-forwarded-for") ?? "");
      const userAgentHash = await sha256Hex(req.headers.get("user-agent") ?? "");

      await serviceClient.from("operation_2fa_attempts").insert({
        operation_id: operationId,
        agent_id: authData.user.id,
        success: valid,
        reason: valid ? "verified" : "invalid_code",
        ip_hash: ipHash,
        user_agent_hash: userAgentHash,
      });

      if (!valid) {
        return jsonResponse({ error: "Codigo invalido" }, 400, headers);
      }

      const expiresAt = addHours(new Date(), VERIFICATION_TTL_HOURS).toISOString();

      await serviceClient.from("operation_2fa_verifications").insert({
        operation_id: operationId,
        agent_id: authData.user.id,
        expires_at: expiresAt,
        secret_version: row.totp_rotated_at,
      });

      return jsonResponse(
        { data: { required: true, verified: true, expires_at: expiresAt } },
        200,
        headers,
      );
    }

    return jsonResponse({ error: "Accion no soportada" }, 400, headers);
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
