import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { MessageSquare, RefreshCw, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { ClientComment, clientComments } from "../../../lib/supabase";
import { formatDate } from "../../../lib/utils";
import LoadingSpinner from "../feedback/LoadingSpinner";
import {
  clientGhostButtonClass,
  clientInsetClass,
  clientModalPanelClass,
} from "./clientUi";

interface ClientCommentsDropdownProps {
  clientId: string;
  initialCount?: number | null;
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const COMMENTS_PAGE_SIZE = 10;

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
  initialCount = null,
}: ClientCommentsDropdownProps) {
  const [comments, setComments] = useState<ClientComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(initialCount ?? 0);

  useEffect(() => {
    setComments([]);
    setLoading(false);
    setLoadingMore(false);
    setOpen(false);
    setErr("");
    setCurrentPage(0);
    setHasMore(false);
    setTotalCount(initialCount ?? 0);
  }, [clientId, initialCount]);

  const latest = useMemo(() => comments[0] ?? null, [comments]);

  const loadComments = async (
    page: number,
    options?: { reset?: boolean },
  ) => {
    const reset = options?.reset ?? false;

    if (reset) {
      setLoading(true);
      setComments([]);
    } else {
      setLoadingMore(true);
    }

    setErr("");

    try {
      const { data, error, count, hasMore: nextHasMore } =
        await clientComments.getByClient(clientId, {
          page,
          pageSize: COMMENTS_PAGE_SIZE,
          includeCount: false,
        });

      if (error) {
        throw error;
      }

      const nextRows = (data || []) as ClientComment[];

      setComments((prev) => {
        if (reset) return nextRows;

        const seen = new Set(prev.map((comment) => comment.id));
        const appended = nextRows.filter((comment) => !seen.has(comment.id));
        return [...prev, ...appended];
      });
      setCurrentPage(page);
      setHasMore(nextHasMore);
      setTotalCount((prev) => count ?? prev);
    } catch (e: any) {
      console.error("Error cargando comentarios:", e);
      setErr(e?.message || "No se pudieron cargar comentarios");
      if (reset) {
        setComments([]);
        setCurrentPage(0);
      }
    } finally {
      if (reset) {
        setLoading(false);
      } else {
        setLoadingMore(false);
      }
    }
  };

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

  const handleOpen = async () => {
    setOpen(true);
    if (currentPage > 0 || loading) return;
    await loadComments(1, { reset: true });
  };

  const onBackdropMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) setOpen(false);
  };

  const handleRefresh = async () => {
    await loadComments(1, { reset: true });
  };

  const handleLoadMore = async () => {
    if (!hasMore || loadingMore) return;
    await loadComments(currentPage + 1, { reset: false });
  };

  const countLabel =
    totalCount > 0
      ? String(totalCount)
      : hasMore
        ? `${comments.length}+`
        : String(comments.length);
  const shouldShowCountBadge = totalCount > 0 || comments.length > 0 || hasMore;

  return (
    <>
      <div className="mt-3 overflow-hidden border-t border-border pt-3">
        <div className="flex items-start gap-2 text-sm text-muted">
          <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-muted" />

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold text-ink/80">Comentarios</span>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={handleRefresh}
                  className="crm-shell-pill flex h-8 w-8 items-center justify-center rounded-2xl border border-white/76 bg-white/72 text-muted shadow-[0_12px_24px_rgba(15,23,42,0.06)] transition hover:bg-white hover:text-ink"
                  title="Actualizar comentarios"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => void handleOpen()}
                  className="crm-shell-pill inline-flex items-center gap-2 rounded-full border border-white/76 bg-white/72 px-3 py-1.5 text-xs font-semibold text-ink/80 shadow-[0_12px_24px_rgba(15,23,42,0.06)] transition hover:bg-white"
                  title="Ver historial"
                >
                  Ver comentarios
                  {shouldShowCountBadge ? (
                    <span className="rounded-full border border-brand/20 bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-brand">
                      {countLabel}
                    </span>
                  ) : null}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void handleOpen()}
              className={cn(
                "mt-2 w-full text-left",
                "crm-comment-surface rounded-2xl border border-white/76 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(255,255,255,0.68))] px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]",
                "transition hover:bg-white",
                "focus:outline-none focus-visible:ring-4 focus-visible:ring-brand/15",
              )}
              title="Abrir historial"
            >
              {latest ? (
                <>
                  <div className="line-clamp-2 break-words text-sm leading-snug text-ink">
                    {latest.comment}
                  </div>

                  <div className="mt-1 flex min-w-0 items-center gap-2 text-[11px] text-muted">
                    <span className="max-w-[140px] truncate font-semibold text-brand">
                      {latest.agent?.name || "Agente"}
                    </span>
                    <span className="text-border">•</span>
                    <span className="truncate">
                      {formatDate(latest.created_at)}
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-sm text-muted">
                  Abrir historial de comentarios. Se cargan solo cuando lo abras.
                </div>
              )}
            </button>
          </div>
        </div>
      </div>

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
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),transparent_42%),rgba(15,23,42,0.5)] backdrop-blur-[4px]" />

              <motion.div
                className={`${clientModalPanelClass} max-w-2xl`}
                variants={panelV}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <div className="crm-modal-header flex items-center justify-between gap-3 border-b border-white/72 bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(255,255,255,0.42))] px-5 py-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-semibold text-ink">
                        Comentarios
                      </h3>
                      <span className="rounded-full border border-brand/20 bg-brand/10 px-2 py-0.5 text-[12px] font-semibold text-brand">
                        {countLabel}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      Historial del cliente (más reciente primero)
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleRefresh}
                      className="crm-shell-pill flex h-9 w-9 items-center justify-center rounded-2xl border border-white/78 bg-white/76 text-muted shadow-[0_12px_24px_rgba(15,23,42,0.06)] transition hover:bg-white hover:text-ink"
                      title="Actualizar"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="crm-shell-pill flex h-9 w-9 items-center justify-center rounded-2xl border border-white/78 bg-white/76 text-muted shadow-[0_12px_24px_rgba(15,23,42,0.06)] transition hover:bg-white hover:text-ink"
                      aria-label="Cerrar"
                      title="Cerrar"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="crm-scrollbar crm-scrollbar-shell max-h-[70vh] overflow-y-auto p-5">
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <LoadingSpinner
                        size="sm"
                        text="Cargando comentarios..."
                        fullScreen={false}
                      />
                    </div>
                  ) : err ? (
                    <div className="text-xs text-red-600">
                      {err}{" "}
                      <button
                        type="button"
                        className="underline"
                        onClick={() => void loadComments(1, { reset: true })}
                      >
                        reintentar
                      </button>
                    </div>
                  ) : comments.length === 0 ? (
                    <div className="py-3 text-sm text-muted">
                      Sin comentarios aún.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {comments.map((comment) => (
                        <div
                          key={comment.id}
                          className={`crm-comment-surface ${clientInsetClass} p-4`}
                        >
                          <div className="whitespace-pre-wrap break-words text-sm leading-relaxed text-ink">
                            {comment.comment}
                          </div>

                          <div className="mt-3 flex min-w-0 items-center gap-2 text-xs text-muted">
                            <span className="max-w-[220px] truncate font-semibold text-brand">
                              {comment.agent?.name || "Agente"}
                            </span>
                            <span className="text-border">•</span>
                            <span className="whitespace-nowrap">
                              {formatDate(comment.created_at)}
                            </span>
                          </div>
                        </div>
                      ))}

                      {hasMore ? (
                        <div className="flex justify-center pt-2">
                          <button
                            type="button"
                            onClick={handleLoadMore}
                            disabled={loadingMore}
                            className="crm-shell-pill inline-flex items-center rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-ink/80 transition hover:bg-surface2 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {loadingMore ? "Cargando..." : "Cargar mas"}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>

                <div className="crm-modal-footer flex justify-end border-t border-white/72 bg-[linear-gradient(180deg,rgba(255,255,255,0.34),rgba(255,255,255,0.58))] px-5 py-4">
                  <button
                    type="button"
                    className={clientGhostButtonClass}
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
