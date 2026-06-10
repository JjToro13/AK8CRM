import { useState } from "react";
import {
  Bug,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  ShieldAlert,
  Zap,
} from "lucide-react";
import { appEnv } from "../../config/env";
import { useBackendHealth } from "./BackendHealthProvider";

export default function BackendHealthDebugger() {
  const {
    consecutiveFailures,
    isDegraded,
    isManualDegraded,
    lastIssueMessage,
    recoverySuccesses,
    reportBackendIssue,
    reportBackendSuccess,
    resetBackendHealth,
    setManualDegraded,
  } = useBackendHealth();
  const [open, setOpen] = useState(false);

  if (!appEnv.features.enableResilienceDebugger) {
    return null;
  }

  const badgeClass = isDegraded
    ? "border-amber-300 bg-amber-50 text-amber-900"
    : "border-emerald-300 bg-emerald-50 text-emerald-800";

  return (
    <div className="fixed bottom-4 right-4 z-[80] w-[min(22rem,calc(100vw-2rem))]">
      <div className="rounded-[1.35rem] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.92))] p-3 shadow-[0_24px_60px_rgba(15,23,42,0.18)] backdrop-blur-2xl">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="flex w-full items-center justify-between gap-3 rounded-[1rem] px-2 py-1 text-left"
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="rounded-xl bg-slate-100 p-2">
              <Bug className="h-4 w-4 text-slate-700" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Resilience Debug
              </div>
              <div className="text-sm font-semibold text-slate-900">
                {isDegraded ? "Modo degradado activo" : "Sistema sano"}
              </div>
            </div>
          </div>

          {open ? (
            <ChevronDown className="h-4 w-4 text-slate-500" />
          ) : (
            <ChevronUp className="h-4 w-4 text-slate-500" />
          )}
        </button>

        {open ? (
          <div className="mt-3 space-y-3">
            <div className={`rounded-[1rem] border px-3 py-2 text-xs ${badgeClass}`}>
              <div>Estado: {isDegraded ? "degraded" : "healthy"}</div>
              <div>Manual: {isManualDegraded ? "on" : "off"}</div>
              <div>Fallos consecutivos: {consecutiveFailures}</div>
              <div>Exitos de recuperacion: {recoverySuccesses}</div>
            </div>

            {lastIssueMessage ? (
              <div className="rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                Ultimo error: {lastIssueMessage}
              </div>
            ) : null}

            <label className="flex items-center justify-between gap-3 rounded-[1rem] border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-800">
              <span className="flex items-center gap-2 font-medium">
                <ShieldAlert className="h-4 w-4 text-amber-600" />
                Forzar modo degradado
              </span>
              <input
                type="checkbox"
                checked={isManualDegraded}
                onChange={(event) => setManualDegraded(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  reportBackendIssue(
                    new Error("Manual debugger: failed to fetch / timeout"),
                    "debugger",
                  )
                }
                className="inline-flex items-center justify-center gap-2 rounded-[1rem] border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800"
              >
                <Zap className="h-4 w-4" />
                Simular fallo
              </button>

              <button
                type="button"
                onClick={() => reportBackendSuccess("debugger")}
                className="inline-flex items-center justify-center gap-2 rounded-[1rem] border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800"
              >
                <Zap className="h-4 w-4" />
                Simular exito
              </button>
            </div>

            <button
              type="button"
              onClick={resetBackendHealth}
              className="inline-flex w-full items-center justify-center gap-2 rounded-[1rem] border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700"
            >
              <RotateCcw className="h-4 w-4" />
              Reset health
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
