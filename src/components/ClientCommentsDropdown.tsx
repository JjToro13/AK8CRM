import { useState, useEffect } from "react";
import { MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import { ClientComment, clientComments } from "../lib/supabase";
import { formatDate } from "../lib/utils";
import LoadingSpinner from "./LoadingSpinner";

interface ClientCommentsDropdownProps {
  clientId: string;
}

export default function ClientCommentsDropdown({
  clientId,
}: ClientCommentsDropdownProps) {
  const [comments, setComments] = useState<ClientComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    loadComments();
  }, [clientId]);

  const loadComments = async () => {
    setLoading(true);
    try {
      const { data } = await clientComments.getByClient(clientId);
      setComments(data || []);
    } catch (error) {
      console.error("Error cargando comentarios:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center text-sm text-gray-400">
        <LoadingSpinner size="sm" text="" fullScreen={false} />
      </div>
    );
  }

  if (comments.length === 0) {
    return null;
  }

  const latestComment = comments[0];

  return (
    <div className="mt-3 pt-3 border-t border-gray-200 overflow-hidden">
      <div className="flex items-start text-sm text-gray-600">
        <MessageSquare className="h-4 w-4 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium text-gray-700">Comentarios:</span>
            {comments.length > 1 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center flex-shrink-0"
              >
                {expanded ? (
                  <>
                    Ocultar <ChevronUp className="h-3 w-3 ml-1" />
                  </>
                ) : (
                  <>
                    Ver todos ({comments.length}){" "}
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </>
                )}
              </button>
            )}
          </div>

          {/* Último comentario (siempre visible) */}
          <div className="bg-gray-50 rounded p-2 mb-2 overflow-hidden">
            <p className="text-sm text-gray-900 break-all overflow-wrap-anywhere">
              {latestComment.comment}
            </p>
            <div className="flex items-center justify-between mt-1 gap-2">
              <span className="text-xs font-medium text-blue-600 truncate">
                {latestComment.agent?.name || "Desconocido"}
              </span>
              <span className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0">
                {formatDate(latestComment.created_at)}
              </span>
            </div>
          </div>

          {/* Comentarios anteriores (desplegable) */}
          {expanded && comments.length > 1 && (
            <div className="space-y-2">
              {comments.slice(1).map((comment) => (
                <div
                  key={comment.id}
                  className="bg-gray-50 rounded p-2 border-l-2 border-blue-400 overflow-hidden"
                >
                  <p className="text-sm text-gray-900 break-all overflow-wrap-anywhere">
                    {comment.comment}
                  </p>
                  <div className="flex items-center justify-between mt-1 gap-2">
                    <span className="text-xs font-medium text-blue-600 truncate">
                      {comment.agent?.name || "Desconocido"}
                    </span>
                    <span className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0">
                      {formatDate(comment.created_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
