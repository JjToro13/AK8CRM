// ClientCommentsDropdown.tsx
// ✅ Último comentario + botón "Ver todos" que abre modal premium
// ✅ Modal por portal al <body> para evitar quedar atrapado en cards/motion/transforms
// ✅ ESC + click afuera + body scroll lock
// ✅ Animaciones alineadas con el resto usando framer-motion

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { MessageSquare, X, RefreshCw } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { ClientComment, clientComments } from "../../../lib/supabase";
import { formatDate } from "../../../lib/utils";
import LoadingSpinner from "../feedback/LoadingSpinner";

interface ClientCommentsDropdownProps {
  clientId: string;
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const overlayV = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.18 } },
  exit: { opacity: 0, transition: { duration: 0.18 } },
} as const;

const panelV = {
  initial: { opacity: 0, y: 16, scale: 0.985, filter: "blur(10px)" },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: { type: "spring", stiffness: 240, damping: 22 },
  },
  exit: {
    opacity: 0,
    y: 10,
    scale: 0.99,
    filter: "blur(10px)",
    transition: { duration: 0.18 },
  },
} as const;

export default function ClientCommentsDropdown({
  clientId,
}: ClientCommentsDropdownProps) {
  const [comments, setComments] = useState<ClientComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string>("");

  const latest = useMemo(() => {
    if (!comments?.length) return null;
    return [...comments].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )[0];
  }, [comments]);

  const sortedComments = useMemo(() => {
    return [...comments].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [comments]);

  const count = comments?.length || 0;

  const loadComments = async () => {
    setLoading(true);
    setErr("");
    try {
      const { data, error } = await clientComments.getByClient(clientId);
      if (error) throw error;
      setComments(data || []);
    } catch (e: any) {
      console.error("Error cargando comentarios:", e);
      setErr(e?.message || "No se pudieron cargar comentarios");
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;

    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
    };
  }, [open]);

  const onBackdropMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) setOpen(false);
  };

  if (loading) {
    return (
      <div className="flex items-center text-sm text-muted">
        <LoadingSpinner size="sm" text="" fullScreen={false} />
      </div>
    );
  }

  if (err) {
    return (
      <div className="text-xs text-red-600">
        {err}{" "}
        <button type="button" className="underline" onClick={loadComments}>
          reintentar
        </button>
      </div>
    );
  }

  if (!latest) return null;

  return (
    <>
      {/* Vista compacta (inline) */}
      <div className="mt-3 pt-3 border-t border-border overflow-hidden">
        <div className="flex items-start gap-2 text-sm text-muted">
          <MessageSquare className="h-4 w-4 text-muted mt-0.5 shrink-0" />

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold text-ink/80">Comentarios</span>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={loadComments}
                  className="h-8 w-8 rounded-xl border border-border bg-surface text-muted hover:text-ink hover:bg-surface2 transition flex items-center justify-center"
                  title="Actualizar comentarios"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setOpen(true)}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-ink/80 hover:bg-surface2 transition"
                  title="Ver historial"
                >
                  Ver todos
                  <span className="rounded-full border border-brand/20 bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-brand">
                    {count}
                  </span>
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOpen(true)}
              className={cn(
                "mt-2 w-full text-left",
                "rounded-2xl border border-border bg-surface2 px-3 py-2",
                "hover:bg-surface transition",
                "focus:outline-none focus-visible:ring-4 focus-visible:ring-brand/15",
              )}
              title="Abrir historial"
            >
              <div className="text-sm text-ink leading-snug line-clamp-2 break-words">
                {latest.comment}
              </div>

              <div className="mt-1 flex items-center gap-2 text-[11px] text-muted min-w-0">
                <span className="font-semibold text-brand truncate max-w-[140px]">
                  {latest.agent?.name || "Agente"}
                </span>
                <span className="text-border">•</span>
                <span className="truncate">
                  {formatDate(latest.created_at)}
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Modal premium por portal */}
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              className="fixed inset-0 z-[120] flex items-center justify-center p-4"
              onMouseDown={onBackdropMouseDown}
              role="dialog"
              aria-modal="true"
              variants={overlayV}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <div className="absolute inset-0 bg-black/45 backdrop-blur-[3px]" />

              <motion.div
                className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-border bg-surface shadow-soft2"
                variants={panelV}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                {/* Header */}
                <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border bg-surface2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-ink truncate">
                        Comentarios
                      </h3>
                      <span className="rounded-full border border-brand/20 bg-brand/10 px-2 py-0.5 text-[12px] font-semibold text-brand">
                        {count}
                      </span>
                    </div>
                    <p className="text-xs text-muted mt-1">
                      Historial del cliente (más reciente primero)
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={loadComments}
                      className="h-9 w-9 rounded-2xl border border-border bg-surface text-muted hover:text-ink hover:bg-surface2 transition flex items-center justify-center"
                      title="Actualizar"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="h-9 w-9 rounded-2xl border border-border bg-surface text-muted hover:text-ink hover:bg-surface2 transition flex items-center justify-center"
                      aria-label="Cerrar"
                      title="Cerrar"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="max-h-[70vh] overflow-y-auto p-5">
                  <div className="space-y-3">
                    {sortedComments.map((c) => (
                      <div
                        key={c.id}
                        className="rounded-2xl border border-border bg-surface2 p-4"
                      >
                        <div className="text-sm text-ink whitespace-pre-wrap leading-relaxed break-words">
                          {c.comment}
                        </div>

                        <div className="mt-3 flex items-center gap-2 text-xs text-muted min-w-0">
                          <span className="font-semibold text-brand truncate max-w-[220px]">
                            {c.agent?.name || "Agente"}
                          </span>
                          <span className="text-border">•</span>
                          <span className="whitespace-nowrap">
                            {formatDate(c.created_at)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-4 border-t border-border bg-surface2 flex justify-end">
                  <button
                    type="button"
                    className="inline-flex items-center rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-ink/80 hover:bg-surface2 transition"
                    onClick={() => setOpen(false)}
                  >
                    Cerrar
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
