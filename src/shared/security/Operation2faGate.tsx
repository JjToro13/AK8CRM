import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { operation2fa, type Operation2faStatus } from "./operation-2fa.service";
import { isOperation2faRequiredError } from "./operation-2fa-errors";

export function getStatusKey(operationId: string, userId: string) {
  return `${operationId}:${userId}`;
}

export default function Operation2faGate() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    activeOperationId,
    canSeeAllOperations,
    operationId,
    operationReady,
    user,
  } = useAuth();
  const [status, setStatus] = useState<Operation2faStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const targetOperationId = useMemo(
    () => (canSeeAllOperations ? activeOperationId : operationId) ?? null,
    [activeOperationId, canSeeAllOperations, operationId],
  );

  const shouldSkip =
    !user ||
    location.pathname === "/login" ||
    location.pathname === "/totp" ||
    !targetOperationId ||
    (canSeeAllOperations && !operationReady);

  const loadStatus = useCallback(async () => {
    if (shouldSkip || !targetOperationId) {
      setStatus(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error } = await operation2fa.getStatus(targetOperationId);

    setLoading(false);

    if (error) {
      console.error("[operation-2fa] status error:", error);
      if (isOperation2faRequiredError(error)) {
        setStatus({
          operation_id: targetOperationId,
          required: true,
          verified: false,
          verified_until: null,
        });
        return;
      }
      setStatus(null);
      return;
    }

    setStatus(data);
  }, [shouldSkip, targetOperationId]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus, reloadKey]);

  useEffect(() => {
    const reload = () => setReloadKey((current) => current + 1);

    window.addEventListener("cm:operation-changed", reload);
    window.addEventListener("cm:operation-settings-changed", reload);
    window.addEventListener("cm:operation-2fa-required", reload);

    return () => {
      window.removeEventListener("cm:operation-changed", reload);
      window.removeEventListener("cm:operation-settings-changed", reload);
      window.removeEventListener("cm:operation-2fa-required", reload);
    };
  }, []);

  useEffect(() => {
    if (!status?.required || !status.verified_until) return;

    const verifiedUntilMs = new Date(status.verified_until).getTime();
    if (!Number.isFinite(verifiedUntilMs)) return;

    const timeoutId = window.setTimeout(
      () => setReloadKey((current) => current + 1),
      Math.max(verifiedUntilMs - Date.now(), 0) + 1_000,
    );

    return () => window.clearTimeout(timeoutId);
  }, [status?.required, status?.verified_until]);

  useEffect(() => {
    setStatus(null);
  }, [targetOperationId]);

  const blocked = Boolean(status?.required && !status.verified);

  useEffect(() => {
    if (!blocked || shouldSkip || loading) return;

    navigate("/totp", {
      replace: true,
      state: {
        from: `${location.pathname}${location.search}${location.hash}`,
      },
    });
  }, [
    blocked,
    loading,
    location.hash,
    location.pathname,
    location.search,
    navigate,
    shouldSkip,
  ]);

  if (shouldSkip || loading) {
    return null;
  }

  if (!blocked) {
    return null;
  }

  return null;
}
