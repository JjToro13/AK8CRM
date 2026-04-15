import { createClient } from "@supabase/supabase-js";
import { appEnv } from "../../config/env";
import {
  BACKEND_PRESSURE_EVENT,
  extractRequestPath,
  shouldEmitBackendPressureFromStatus,
} from "../../shared/resilience/backend-health";

export type SupabaseBrowserConfig = {
  url: string;
  anonKey: string;
};

function emitBackendPressure(detail: {
  message: string;
  path?: string | null;
  reason?: string | null;
  source?: string | null;
  status?: number | null;
}) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent(BACKEND_PRESSURE_EVENT, {
      detail: {
        kind: "failure",
        ...detail,
      },
    }),
  );
}

function buildTimedFetch(timeoutMs: number): typeof fetch {
  return async (input, init) => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      controller.abort(new DOMException("Supabase request timeout", "TimeoutError"));
    }, timeoutMs);

    const cleanupCallbacks: Array<() => void> = [];

    if (init?.signal) {
      const forwardAbort = () => controller.abort(init.signal?.reason);
      init.signal.addEventListener("abort", forwardAbort);
      cleanupCallbacks.push(() =>
        init.signal?.removeEventListener("abort", forwardAbort),
      );
    }

    try {
      const response = await fetch(input, {
        ...init,
        signal: controller.signal,
      });

      if (shouldEmitBackendPressureFromStatus(response.status)) {
        emitBackendPressure({
          message: `Supabase request failed with status ${response.status}`,
          path: extractRequestPath(input),
          reason: "http_status",
          source: "supabase-fetch",
          status: response.status,
        });
      }

      return response;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Supabase request failed";
      const loweredMessage = message.toLowerCase();
      const isTimeout =
        loweredMessage.includes("timeout") ||
        (error instanceof DOMException && error.name === "TimeoutError");
      const isNetworkFailure =
        isTimeout ||
        loweredMessage.includes("fetch failed") ||
        loweredMessage.includes("failed to fetch") ||
        loweredMessage.includes("network");

      if (isNetworkFailure) {
        emitBackendPressure({
          message,
          path: extractRequestPath(input),
          reason: isTimeout ? "timeout" : "network",
          source: "supabase-fetch",
          status: 0,
        });
      }

      throw error;
    } finally {
      window.clearTimeout(timeoutId);
      cleanupCallbacks.forEach((callback) => callback());
    }
  };
}

export function createSupabaseBrowserClient(config: SupabaseBrowserConfig) {
  return createClient(config.url, config.anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
    global: {
      fetch: buildTimedFetch(appEnv.supabase.requestTimeoutMs),
    },
  });
}

export const supabase = createSupabaseBrowserClient({
  url: appEnv.supabase.url,
  anonKey: appEnv.supabase.anonKey,
});
