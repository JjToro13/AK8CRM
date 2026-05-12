import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { operation2fa, type Operation2faStatus } from "./operation-2fa.service";

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

    return () => {
      window.removeEventListener("cm:operation-changed", reload);
      window.removeEventListener("cm:operation-settings-changed", reload);
    };
  }, []);

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
