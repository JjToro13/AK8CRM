import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { KeyRound, ShieldCheck } from "lucide-react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import LoadingSpinner from "../components/feedback/LoadingSpinner";
import {
  ModalBody,
  ModalFooter,
  ModalPanel,
  modalPrimaryActionClassName,
} from "../components/layout/ModalLayout";
import Input from "../components/ui/Input";
import { notify } from "../lib/notify";
import { getStatusKey } from "./Operation2faGate";
import { operation2fa, type Operation2faStatus } from "./operation-2fa.service";

type TotpLocationState = {
  from?: string;
};

export default function Operation2faPage() {
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
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const targetOperationId = useMemo(
    () => (canSeeAllOperations ? activeOperationId : operationId) ?? null,
    [activeOperationId, canSeeAllOperations, operationId],
  );

  const locationState = location.state as TotpLocationState | null;
  const returnTo =
    locationState?.from && locationState.from !== "/totp"
      ? locationState.from
      : "/dashboard";

  const loadStatus = useCallback(async () => {
    if (!targetOperationId || (canSeeAllOperations && !operationReady)) {
      setStatus(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    const { data, error: statusError } =
      await operation2fa.getStatus(targetOperationId);

    setLoading(false);

    if (statusError) {
      console.error("[operation-2fa] status error:", statusError);
      setError("No se pudo validar la seguridad de la operacion.");
      setStatus(null);
      return;
    }

    setStatus(data);
  }, [canSeeAllOperations, operationReady, targetOperationId]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!targetOperationId || !user) return;

    const normalizedCode = code.trim();
    if (!/^\d{6}$/.test(normalizedCode)) {
      setError("Ingresa un codigo de 6 digitos.");
      return;
    }

    setVerifying(true);
    setError("");

    const { error: verifyError } = await operation2fa.verify(
      targetOperationId,
      normalizedCode,
    );

    setVerifying(false);

    if (verifyError) {
      setError(verifyError.message || "Codigo invalido.");
      notify.error("No se pudo verificar el codigo");
      return;
    }

    notify.success("Operacion verificada");
    sessionStorage.setItem(getStatusKey(targetOperationId, user.id), "verified");
    navigate(returnTo, { replace: true });
  };

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (loading || (canSeeAllOperations && !operationReady)) {
    return <LoadingSpinner />;
  }

  if (!targetOperationId || !status?.required || status.verified) {
    return <Navigate to={returnTo} replace />;
  }

  return (
    <main className="min-h-screen bg-bg">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex min-h-[4.5rem] w-full max-w-5xl items-center justify-between gap-4 px-5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-brand/15 bg-brand/[0.08] text-brand">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <div className="text-sm font-semibold text-ink">AK8 CRM</div>
              <div className="text-xs font-medium text-muted">
                Validacion de seguridad requerida
              </div>
            </div>
          </div>
          <div className="hidden rounded-full border border-brand/15 bg-brand/[0.08] px-3 py-1 text-xs font-semibold text-brand sm:inline-flex">
            Operacion protegida
          </div>
        </div>
      </header>

      <section className="flex min-h-[calc(100vh-4.5rem)] items-center justify-center px-4 py-10">
        <ModalPanel className="max-w-lg">
          <div className="border-b border-border bg-surface2 px-6 py-5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand/10">
                <KeyRound className="h-5 w-5 text-brand" />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold text-ink sm:text-lg">
                  Verificacion de operacion
                </h2>
                <p className="truncate text-xs text-muted">
                  Esta operacion requiere autenticador en dos pasos.
                </p>
              </div>
            </div>
          </div>
          <form onSubmit={handleSubmit}>
            <ModalBody>
              <div className="rounded-3xl border border-brand/15 bg-brand/[0.06] p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-brand/15 bg-surface text-brand">
                    <ShieldCheck className="h-4 w-4" />
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-ink">
                      Codigo de Google Authenticator
                    </div>
                    <p className="mt-1 text-sm leading-6 text-muted">
                      Solicita el codigo al owner o a la persona autorizada para
                      esta operacion.
                    </p>
                  </div>
                </div>
              </div>

              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  Codigo
                </span>
                <Input
                  value={code}
                  onChange={(event) =>
                    setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  disabled={verifying}
                  className="mt-2 text-center text-lg font-semibold tracking-[0.28em]"
                />
              </label>

              {error ? (
                <div className="rounded-2xl border border-red-400/30 bg-red-500/[0.08] px-4 py-3 text-sm font-semibold text-red-600">
                  {error}
                </div>
              ) : null}
            </ModalBody>
            <ModalFooter>
              <button
                type="submit"
                className={modalPrimaryActionClassName}
                disabled={verifying || code.trim().length !== 6}
              >
                {verifying ? (
                  <LoadingSpinner size="sm" text="" fullScreen={false} />
                ) : (
                  <KeyRound className="h-4 w-4" />
                )}
                Verificar acceso
              </button>
            </ModalFooter>
          </form>
        </ModalPanel>
      </section>
    </main>
  );
}
