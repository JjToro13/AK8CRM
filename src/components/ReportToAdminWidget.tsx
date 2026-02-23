// ReportToAdminWidget.tsx - Un widget de botón flotante para que los usuarios puedan enviar reportes o feedback al administrador. Al hacer click, se abre un modal con un formulario para ingresar el título y detalles del reporte. El reporte se puede enviar a través de un callback opcional o guardarse localmente en el navegador si no hay backend disponible.

import { useMemo, useState } from "react";
import { ChevronUp, ChevronDown, Flag, X, Send } from "lucide-react";

type ReportPayload = {
  id: string;
  createdAt: string;
  title: string;
  details: string;
  page?: string;
};

type ReportToAdminWidgetProps = {
  /** Opcional: para mostrar en el reporte */
  page?: string;
  /** Opcional: callback real para enviar a backend/supabase */
  onSubmitReport?: (payload: ReportPayload) => Promise<void> | void;
};

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

/**
 * Guarda reportes localmente si no hay backend todavía.
 */
function saveLocalReport(payload: ReportPayload) {
  const key = "admin_reports_local";
  try {
    const prev = JSON.parse(
      localStorage.getItem(key) || "[]",
    ) as ReportPayload[];
    prev.unshift(payload);
    localStorage.setItem(key, JSON.stringify(prev.slice(0, 50)));
  } catch {
    // ignore
  }
}

export default function ReportToAdminWidget({
  page,
  onSubmitReport,
}: ReportToAdminWidgetProps) {
  const [expanded, setExpanded] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);
  const [sentOk, setSentOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSend = useMemo(() => {
    return title.trim().length >= 4 && details.trim().length >= 10;
  }, [title, details]);

  const resetForm = () => {
    setTitle("");
    setDetails("");
    setSending(false);
    setSentOk(false);
    setError(null);
  };

  const openModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSentOk(false);
    setError(null);
  };

  const handleSend = async () => {
    if (!canSend || sending) return;

    const payload: ReportPayload = {
      id: uid(),
      createdAt: new Date().toISOString(),
      title: title.trim(),
      details: details.trim(),
      page,
    };

    setSending(true);
    setError(null);

    try {
      if (onSubmitReport) {
        await onSubmitReport(payload);
      } else {
        // fallback: localStorage
        saveLocalReport(payload);
      }
      setSentOk(true);
      setTimeout(() => {
        setModalOpen(false);
        setExpanded(false);
      }, 900);
    } catch (e: any) {
      setError(e?.message || "No se pudo enviar el reporte.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* FAB bottom-left */}
      <div className="fixed bottom-5 left-5 z-[55] flex flex-col items-start gap-2">
        {/* panel expandible */}
        {expanded && (
          <div className="rounded-2xl border border-orange-200 bg-white p-3 shadow-lg">
            <button
              onClick={openModal}
              className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
            >
              <Flag className="h-4 w-4" />
              Reportar al administrador
            </button>
            <p className="mt-2 max-w-[220px] text-xs text-gray-500">
              Enviá un aviso rápido si algo falla o si necesitás soporte.
            </p>
          </div>
        )}

        {/* flechita */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className={[
            "rounded-full border border-orange-300 bg-white p-3 shadow-lg",
            "hover:bg-orange-50",
            "shadow-[0_0_0_2px_rgba(255,140,0,0.10),0_0_18px_rgba(255,140,0,0.25)]",
          ].join(" ")}
          aria-label={expanded ? "Cerrar menú" : "Abrir menú"}
        >
          {expanded ? (
            <ChevronDown className="h-5 w-5 text-orange-700" />
          ) : (
            <ChevronUp className="h-5 w-5 text-orange-700" />
          )}
        </button>
      </div>

      {/* Modal reporte */}
      {modalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />

          <div className="relative w-full max-w-lg rounded-2xl border border-orange-200 bg-white p-5 shadow-xl">
            <button
              onClick={closeModal}
              className="absolute right-3 top-3 rounded-lg p-2 hover:bg-gray-100"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5 text-gray-700" />
            </button>

            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-orange-50 p-2">
                <Flag className="h-6 w-6 text-orange-700" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  Reporte al administrador
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  Contanos qué pasó y en qué pantalla. Mientras más detalle,
                  mejor.
                </p>

                {page && (
                  <div className="mt-2 inline-flex rounded-lg bg-gray-100 px-2 py-1 text-xs text-gray-700">
                    Página: {page}
                  </div>
                )}

                <div className="mt-4 space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-700">
                      Título
                    </label>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Ej: No carga la lista de clientes"
                      className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-200"
                    />
                    <p className="mt-1 text-[11px] text-gray-500">
                      Mínimo 4 caracteres.
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700">
                      Detalles
                    </label>
                    <textarea
                      value={details}
                      onChange={(e) => setDetails(e.target.value)}
                      placeholder="Qué intentaste hacer, qué esperabas, qué pasó, mensajes de error…"
                      rows={5}
                      className="mt-1 w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-200"
                    />
                    <p className="mt-1 text-[11px] text-gray-500">
                      Mínimo 10 caracteres.
                    </p>
                  </div>

                  {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {error}
                    </div>
                  )}

                  {sentOk && (
                    <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                      Reporte enviado ✅
                    </div>
                  )}

                  <div className="mt-2 flex justify-end gap-2">
                    <button
                      onClick={closeModal}
                      className="rounded-xl px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                    >
                      Cancelar
                    </button>

                    <button
                      onClick={handleSend}
                      disabled={!canSend || sending}
                      className={[
                        "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold",
                        canSend && !sending
                          ? "bg-orange-600 text-white hover:bg-orange-700"
                          : "bg-orange-200 text-orange-900/60 cursor-not-allowed",
                      ].join(" ")}
                    >
                      <Send className="h-4 w-4" />
                      {sending ? "Enviando..." : "Enviar"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
