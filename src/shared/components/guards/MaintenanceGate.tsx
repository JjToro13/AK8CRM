// MaintenanceGate.tsx
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { appEnv } from "../../../config/env";
import { supabase } from "../../../lib/supabase";
import {
  fetchMaintenance,
  subscribeMaintenance,
  MaintenanceState,
} from "../../../lib/maintenance";

type Props = {
  children: React.ReactNode;
  pollMs?: number;
};

export default function MaintenanceGate({ children, pollMs = 60000 }: Props) {
  const [state, setState] = useState<MaintenanceState>({
    enabled: false,
    message: "",
  });
  const [loading, setLoading] = useState(true);
  const signingOutRef = useRef(false);

  const navigate = useNavigate();
  const location = useLocation();

  // ✅ Bypass SOLO en desarrollo y SOLO si tú lo activas en .env.local
  const devBypass = appEnv.features.maintenanceBypass;

  const forceSignOut = async () => {
    if (signingOutRef.current) return;
    signingOutRef.current = true;

    try {
      await supabase.auth.signOut({ scope: "local" });
    } finally {
      localStorage.clear();
      sessionStorage.setItem("maintenance_forced_logout", "1");

      if (location.pathname !== "/login") {
        navigate("/login", { replace: true });
      }
    }
  };

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (document.visibilityState === "hidden") return;

      try {
        const s = await fetchMaintenance();
        if (!mounted) return;
        setState(s);
      } catch {
        // si falla la lectura, no bloqueamos por defecto
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    const t = window.setInterval(load, pollMs);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void load();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const unsub = subscribeMaintenance((s) => {
      setState(s);
      setLoading(false);
    });

    return () => {
      mounted = false;
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      unsub?.();
    };
  }, [pollMs]);

  useEffect(() => {
    if (state.enabled && !devBypass) {
      forceSignOut();
    } else if (!state.enabled) {
      sessionStorage.removeItem("maintenance_forced_logout");
      signingOutRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.enabled, devBypass]);

  if (loading) return <>{children}</>;

  if (state.enabled && !devBypass) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-3xl rounded-[2.5rem] border border-border bg-surface2 shadow-soft2 p-2 sm:p-2.5">
          <div className="rounded-[2.1rem] bg-surface border border-border shadow-soft overflow-hidden">
            <div className="p-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-ink shadow-soft">
                <span className="relative inline-flex h-2.5 w-2.5">
                  <span className="absolute inset-0 rounded-full bg-red-400/25 blur-[6px] animate-blink-glow" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-400 shadow-[0_0_14px_rgba(248,113,113,0.75)] animate-blink-glow" />
                </span>
                Mantenimiento activo
              </div>

              <h1 className="mt-6 text-3xl font-semibold tracking-tight text-ink">
                Login deshabilitado
              </h1>

              <p className="mt-3 text-sm text-muted max-w-xl">
                {state.message?.trim()
                  ? state.message
                  : "Ajuste interno en curso. Por favor intenta nuevamente en unos minutos."}
              </p>

              <div className="mt-8 rounded-3xl border border-border bg-white p-5">
                <p className="text-sm text-ink font-semibold">¿Qué pasó?</p>
                <p className="mt-2 text-sm text-muted">
                  Se activó un bloqueo global para evitar inconsistencias
                  mientras se aplican cambios internos. Cuando el sistema vuelva,
                  podrás iniciar sesión normalmente.
                </p>
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  className="auth-pill w-full sm:w-auto"
                  onClick={() => window.location.reload()}
                >
                  Reintentar
                </button>
              </div>

              {/* ✅ Solo para que tú sepas cuando estás “bypasseando” */}
              <p className="mt-6 text-xs text-muted">
                 Si tenias un seguimiento activo, podrás continuar una vez que el mantenimiento haya finalizado, en caso de ser urgente contacta con soporte o con tu administrador para brindarte una solución.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
