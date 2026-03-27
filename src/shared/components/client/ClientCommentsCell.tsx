// clientcommentscell.tsx - Componente para mostrar el último comentario de un cliente en la tabla, con opción a ver el historial completo en un modal.

import { useEffect, useRef, useState } from "react";
import { X, RefreshCw } from "lucide-react";
import { clientComments } from "../../../lib/supabase";
import LoadingSpinner from "../feedback/LoadingSpinner";
import { formatDate } from "../../../lib/utils";

type CommentRow = {
  id: string;
  client_id: string;
  agent_id: string;
  comment: string;
  created_at: string;
  agent?: { name: string };
};

const commentsCache: Record<string, CommentRow[]> = {};
const commentsPromiseCache: Record<
  string,
  Promise<{ data: CommentRow[] | null; error: any }> | null
> = {};

const PREFETCH_MAX_CONCURRENT = 2;
let activePrefetches = 0;
const prefetchQueue: Array<() => void> = [];

function runPrefetchTask(task: () => Promise<void>) {
  return new Promise<void>((resolve) => {
    const start = async () => {
      activePrefetches++;

      try {
        await task();
      } finally {
        activePrefetches--;
        const next = prefetchQueue.shift();
        if (next) next();
        resolve();
      }
    };

    if (activePrefetches < PREFETCH_MAX_CONCURRENT) {
      void start();
    } else {
      prefetchQueue.push(() => {
        void start();
      });
    }
  });
}

export default function ClientCommentsCell({
  clientId,
  lastComment,
  lastCommentAt,
  commentCount,
  agent,
}: {
  clientId: string;
  lastComment?: string | null;
  lastCommentAt?: string | null;
  lastCommentAgent?: string | null;
  commentCount?: number | null;
  agent?: { name?: string } | null;
}) {
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState("");

  const rootRef = useRef<HTMLDivElement | null>(null);

  const moreCount = Math.max(0, (commentCount || 0) - 1);

  const fetchCommentsShared = async () => {
    if (commentsCache[clientId]) {
      return { data: commentsCache[clientId], error: null };
    }

    if (!commentsPromiseCache[clientId]) {
      commentsPromiseCache[clientId] = clientComments
        .getByClient(clientId)
        .then((result) => {
          const rows = (result.data || []) as CommentRow[];
          commentsCache[clientId] = rows;
          return { data: rows, error: result.error };
        })
        .finally(() => {
          commentsPromiseCache[clientId] = null;
        });
    }

    return commentsPromiseCache[clientId]!;
  };

  const load = async () => {
    if (commentsCache[clientId]) {
      setComments(commentsCache[clientId]);
      setErr("");
      return;
    }

    setLoading(true);
    setErr("");

    try {
      const { data, error } = await fetchCommentsShared();

      if (error) {
        setErr((error as any)?.message || "No se pudieron cargar comentarios");
        setComments([]);
        return;
      }

      setComments((data || []) as CommentRow[]);
    } catch (e: any) {
      setErr(e?.message || "Error cargando comentarios");
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  const prefetchComments = async () => {
    if (
      commentsCache[clientId] ||
      commentsPromiseCache[clientId] ||
      !commentCount ||
      commentCount <= 1
    ) {
      return;
    }

    await runPrefetchTask(async () => {
      if (commentsCache[clientId] || commentsPromiseCache[clientId]) return;

      try {
        await fetchCommentsShared();
      } catch {
        // silencioso: el prefetch no debe romper la UI
      }
    });
  };

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;

        void prefetchComments();
        observer.disconnect();
      },
      {
        root: null,
        rootMargin: "80px 0px",
        threshold: 0.01,
      },
    );

    observer.observe(el);

    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, commentCount]);

  const onBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) setOpen(false);
  };

  const handleOpen = async () => {
    setOpen(true);
    setErr("");

    if (commentsCache[clientId]) {
      setComments(commentsCache[clientId]);
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await fetchCommentsShared();

      if (error) {
        setErr((error as any)?.message || "No se pudieron cargar comentarios");
        setComments([]);
        return;
      }

      setComments((data || []) as CommentRow[]);
    } catch (e: any) {
      setErr(e?.message || "Error cargando comentarios");
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    delete commentsCache[clientId];
    commentsPromiseCache[clientId] = null;
    await load();
  };

  if (!lastComment) {
    return <span className="text-sm text-gray-400">Sin comentarios</span>;
  }

  return (
    <>
      <div ref={rootRef} className="relative">
        <button
          type="button"
          onClick={handleOpen}
          className={[
            "group w-full text-left",
            "rounded-xl border border-gray-200 bg-white px-3 py-2",
            "shadow-sm transition",
            "hover:-translate-y-[1px] hover:shadow-md hover:border-gray-300",
            "focus:outline-none focus:ring-2 focus:ring-blue-500/30",
          ].join(" ")}
          title="Ver comentarios"
        >
          <div className="text-sm text-gray-900 leading-snug line-clamp-2">
            {lastComment}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
            <span className="font-medium text-blue-700">
              {agent?.name || "Agente"}
            </span>
            <span className="text-gray-300">•</span>
            <span>{lastCommentAt ? formatDate(lastCommentAt) : ""}</span>
          </div>

          {moreCount > 0 && (
            <span
              className={[
                "absolute -right-2 -top-2",
                "rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5",
                "text-[11px] font-semibold text-blue-700 shadow-sm",
                "opacity-100 md:opacity-0 md:group-hover:opacity-100",
                "transition-opacity",
              ].join(" ")}
              title={`${moreCount} comentarios más`}
            >
              +{moreCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={handleRefresh}
          className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full border border-gray-200 bg-white shadow-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition flex items-center justify-center"
          title="Actualizar comentarios"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={onBackdrop}
            aria-label="Cerrar comentarios"
          />
          <div className="relative w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-3xl border border-border bg-surface shadow-soft2">
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border bg-surface2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-ink truncate">
                    Comentarios
                  </h3>
                  <span className="rounded-full border border-brand/20 bg-brand/10 px-2 py-0.5 text-[12px] font-semibold text-brand">
                    {commentCount || comments.length}
                  </span>
                </div>

                <p className="text-xs text-muted mt-1">
                  Historial (más reciente primero)
                </p>
              </div>

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

            <div className="p-5 overflow-y-auto max-h-[70vh]">
              {loading ? (
                <div className="py-10 flex justify-center">
                  <LoadingSpinner
                    size="sm"
                    text="Cargando comentarios..."
                    fullScreen={false}
                  />
                </div>
              ) : err ? (
                <div className="text-sm text-red-600">
                  {err}{" "}
                  <button type="button" className="underline" onClick={load}>
                    reintentar
                  </button>
                </div>
              ) : comments.length === 0 ? (
                <div className="text-sm text-gray-400">
                  Sin comentarios todavía.
                </div>
              ) : (
                <div className="space-y-3">
                  {comments.map((c) => (
                    <div
                      key={c.id}
                      className="rounded-2xl border border-border bg-surface2 p-4"
                    >
                      <div className="text-sm text-ink whitespace-pre-wrap leading-relaxed">
                        {c.comment}
                      </div>

                      <div className="mt-3 flex items-center gap-2 text-xs text-muted">
                        <span className="font-semibold text-brand truncate max-w-[240px]">
                          {c.agent?.name || c.agent_id}
                        </span>
                        <span className="text-border">•</span>
                        <span className="whitespace-nowrap">
                          {formatDate(c.created_at)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-border bg-surface2 flex justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex items-center rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-ink/80 hover:bg-surface2 transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
