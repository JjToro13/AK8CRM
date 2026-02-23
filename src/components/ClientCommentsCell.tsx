import { useEffect, useMemo, useState } from "react";
import { X, RefreshCw } from "lucide-react";
import { clientComments } from "../lib/supabase";
import LoadingSpinner from "./LoadingSpinner";
import { formatDate } from "../lib/utils";

type CommentRow = {
  id: string;
  client_id: string;
  agent_id: string;
  comment: string;
  created_at: string;
  agent?: { name: string };
};

export default function ClientCommentsCell({ clientId }: { clientId: string }) {
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string>("");

  const latest = useMemo(() => {
    if (!comments?.length) return null;
    return [...comments].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )[0];
  }, [comments]);

  const moreCount = Math.max(0, (comments?.length || 0) - 1);

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const { data, error } = await clientComments.getByClient(clientId);
      if (error) {
        setErr((error as any)?.message || "No se pudieron cargar comentarios");
        setComments([]);
        return;
      }
      setComments((data as any) ?? []);
    } catch (e: any) {
      setErr(e?.message || "Error cargando comentarios");
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const onBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) setOpen(false);
  };

  if (loading) {
    return (
      <div className="text-xs text-gray-500 flex items-center gap-2">
        <LoadingSpinner size="sm" text="" fullScreen={false} />
        <span>Cargando…</span>
      </div>
    );
  }

  if (err) {
    return (
      <div className="text-xs text-red-600">
        {err}{" "}
        <button type="button" className="underline" onClick={load}>
          reintentar
        </button>
      </div>
    );
  }

  if (!latest) {
    return <span className="text-sm text-gray-400">Sin comentarios</span>;
  }

  return (
    <>
      {/* Tarjeta clickable */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(true)}
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
            {latest.comment}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
            <span className="font-medium text-blue-700">
              {latest.agent?.name || "Agente"}
            </span>
            <span className="text-gray-300">•</span>
            <span>{formatDate(latest.created_at)}</span>
          </div>

          {/* Badge +N aparece en hover (y en touch queda visible por seguridad) */}
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

        {/* Refresh discreto (opcional). Si lo quieres quitar: borra este bloque */}
        <button
          type="button"
          onClick={load}
          className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full border border-gray-200 bg-white shadow-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition flex items-center justify-center"
          title="Actualizar comentarios"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Modal con historial */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-[70] flex items-center justify-center p-4"
          onClick={onBackdrop}
        >
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[80vh] overflow-hidden shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-semibold text-gray-900">
                Comentarios ({comments.length})
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-700"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto max-h-[70vh] space-y-3">
              {comments
                .slice()
                .sort(
                  (a, b) =>
                    new Date(b.created_at).getTime() -
                    new Date(a.created_at).getTime(),
                )
                .map((c) => (
                  <div
                    key={c.id}
                    className="rounded-lg border border-gray-200 bg-gray-50 p-3"
                  >
                    <div className="text-sm text-gray-900 whitespace-pre-wrap">
                      {c.comment}
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      <span className="text-blue-700 font-medium">
                        {c.agent?.name || c.agent_id}
                      </span>{" "}
                      • {formatDate(c.created_at)}
                    </div>
                  </div>
                ))}
            </div>

            <div className="px-5 py-4 border-t flex justify-end">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setOpen(false)}
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
