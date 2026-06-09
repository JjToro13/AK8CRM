import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import {
  CLIENT_STATUS_OPTIONS,
  setClientStatusOptions,
  toClientStatusMeta,
  type ClientStatusMeta,
} from "../../lib/utils";
import { clientStatuses } from "../services/client-statuses.service";

type UseClientStatusCatalogOptions = {
  tenantId?: string | null;
  enabled?: boolean;
  syncRuntime?: boolean;
};

export function useClientStatusCatalog(
  options: UseClientStatusCatalogOptions = {},
) {
  const { activeOperationId, operationId, canSeeAllOperations, operationReady, user } =
    useAuth();
  const [statusOptions, setStatusOptions] =
    useState<ClientStatusMeta[]>(CLIENT_STATUS_OPTIONS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const enabled = options.enabled ?? true;
  const syncRuntime = options.syncRuntime ?? true;
  const effectiveTenantId = options.tenantId ?? null;
  const effectiveOperationId = canSeeAllOperations
    ? activeOperationId
    : operationId;
  const canLoadImplicitTenant = Boolean(effectiveOperationId);
  const shouldLoad =
    enabled &&
    Boolean(user) &&
    (effectiveTenantId !== null || (operationReady && canLoadImplicitTenant));

  useEffect(() => {
    if (!shouldLoad) {
      setStatusOptions(CLIENT_STATUS_OPTIONS);
      if (syncRuntime) {
        setClientStatusOptions(CLIENT_STATUS_OPTIONS);
      }
      return;
    }

    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError("");

      const { data, error: loadError } = await clientStatuses.list(effectiveTenantId);

      if (cancelled) return;

      if (loadError) {
        setError(loadError.message);
        setStatusOptions(CLIENT_STATUS_OPTIONS);
        if (syncRuntime) {
          setClientStatusOptions(CLIENT_STATUS_OPTIONS);
        }
        setLoading(false);
        return;
      }

      const nextOptions =
        (data ?? []).map((row) => toClientStatusMeta(row)) || CLIENT_STATUS_OPTIONS;
      const resolvedOptions =
        nextOptions.length > 0 ? nextOptions : CLIENT_STATUS_OPTIONS;

      setStatusOptions(resolvedOptions);
      if (syncRuntime) {
        setClientStatusOptions(resolvedOptions);
      }
      setLoading(false);
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [
    effectiveTenantId,
    operationReady,
    shouldLoad,
    syncRuntime,
    effectiveOperationId,
  ]);

  return useMemo(
    () => ({
      statusOptions,
      loading,
      error,
    }),
    [error, loading, statusOptions],
  );
}
