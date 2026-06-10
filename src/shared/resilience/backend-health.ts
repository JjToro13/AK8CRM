export const BACKEND_PRESSURE_EVENT = "crm:backend-pressure";

export type BackendPressureSignal = {
  kind: "failure";
  message: string;
  path?: string | null;
  reason?: string | null;
  source?: string | null;
  status?: number | null;
};

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function getBackendIssueMessage(error: unknown) {
  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }

  if (error && typeof error === "object") {
    const message = readString((error as { message?: unknown }).message);
    if (message) return message;
  }

  return "Backend temporalmente inestable";
}

export function isBackendPressureError(error: unknown) {
  if (!error) return false;

  if (error && typeof error === "object") {
    const status = readNumber(
      (error as { status?: unknown; statusCode?: unknown }).status ??
        (error as { statusCode?: unknown }).statusCode,
    );

    if (status !== null && [408, 429, 500, 502, 503, 504].includes(status)) {
      return true;
    }

    const code = readString((error as { code?: unknown }).code)?.toUpperCase();
    if (code && ["57014", "ETIMEDOUT", "ECONNRESET", "ECONNREFUSED"].includes(code)) {
      return true;
    }

    const message = getBackendIssueMessage(error).toLowerCase();
    return [
      "fetch failed",
      "network",
      "timeout",
      "timed out",
      "failed to fetch",
      "gateway",
      "temporarily unavailable",
      "too many requests",
      "service unavailable",
      "upstream",
      "econn",
      "aborterror",
    ].some((fragment) => message.includes(fragment));
  }

  return false;
}

export function shouldEmitBackendPressureFromStatus(status: number) {
  return [408, 429, 500, 502, 503, 504].includes(status);
}

export function extractRequestPath(input: RequestInfo | URL) {
  try {
    if (typeof input === "string") {
      return new URL(input).pathname;
    }

    if (input instanceof URL) {
      return input.pathname;
    }

    if (typeof Request !== "undefined" && input instanceof Request) {
      return new URL(input.url).pathname;
    }
  } catch {
    //
  }

  return null;
}
