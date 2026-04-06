const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://ak8crm.com",
];

export function corsHeaders(origin?: string | null) {
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
