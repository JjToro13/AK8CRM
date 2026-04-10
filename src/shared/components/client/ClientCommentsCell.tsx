import { useEffect, useRef, useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { clientComments } from "../../../lib/supabase";
import { formatDate } from "../../../lib/utils";
import LoadingSpinner from "../feedback/LoadingSpinner";

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
        // El prefetch no debe romper la UI.
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
    return <span className="text-sm text-muted">Sin comentarios</span>;
  }

  return (
    <>
      <div ref={rootRef} className="relative">
        <button
          type="button"
          onClick={handleOpen}
          className="crm-comment-surface group w-full rounded-xl border px-3 py-2 text-left shadow-sm transition hover:-translate-y-[1px] focus:outline-none focus:ring-2 focus:ring-brand/20"
          title="Ver comentarios"
        >
          <div className="line-clamp-2 text-sm leading-snug text-ink">
            {lastComment}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
            <span className="font-medium text-brand">
              {agent?.name || "Agente"}
            </span>
            <span className="text-border">•</span>
            <span>{lastCommentAt ? formatDate(lastCommentAt) : ""}</span>
          </div>

          {moreCount > 0 ? (
            <span
              className="crm-shell-pill absolute -right-2 -top-2 rounded-full border border-brand/20 bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-brand shadow-sm opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100"
              title={`${moreCount} comentarios mas`}
            >
              +{moreCount}
            </span>
          ) : null}
        </button>

        <button
          type="button"
          onClick={handleRefresh}
          className="crm-comment-surface absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full border text-muted shadow-sm transition hover:text-ink"
          title="Actualizar comentarios"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {open ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-[rgba(15,23,42,0.42)] backdrop-blur-sm"
            onClick={onBackdrop}
            aria-label="Cerrar comentarios"
          />

          <div className="crm-modal-panel relative max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-3xl border border-border bg-surface shadow-soft2">
            <div className="crm-modal-header flex items-center justify-between gap-3 border-b border-border bg-surface2 px-5 py-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="truncate font-semibold text-ink">Comentarios</h3>
                  <span className="rounded-full border border-brand/20 bg-brand/10 px-2 py-0.5 text-[12px] font-semibold text-brand">
                    {commentCount || comments.length}
                  </span>
                </div>

                <p className="mt-1 text-xs text-muted">
                  Historial (mas reciente primero)
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-2xl border border-border bg-surface text-muted transition hover:bg-surface2 hover:text-ink"
                aria-label="Cerrar"
                title="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="crm-scrollbar crm-scrollbar-shell max-h-[70vh] overflow-y-auto p-5">
              {loading ? (
                <div className="flex justify-center py-10">
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
                <div className="text-sm text-muted">Sin comentarios todavia.</div>
              ) : (
                <div className="space-y-3">
                  {comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="crm-comment-surface rounded-2xl border p-4"
                    >
                      <div className="whitespace-pre-wrap text-sm leading-relaxed text-ink">
                        {comment.comment}
                      </div>

                      <div className="mt-3 flex items-center gap-2 text-xs text-muted">
                        <span className="max-w-[240px] truncate font-semibold text-brand">
                          {comment.agent?.name || comment.agent_id}
                        </span>
                        <span className="text-border">•</span>
                        <span className="whitespace-nowrap">
                          {formatDate(comment.created_at)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="crm-modal-footer flex justify-end border-t border-border bg-surface2 px-5 py-4">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="crm-shell-pill inline-flex items-center rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-ink/80 transition hover:bg-surface2"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
