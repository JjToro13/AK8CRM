import { useState, useEffect } from "react";
import {
  X,
  Save,
  MessageSquare,
  AlertCircle,
  Edit2,
  Check,
} from "lucide-react";
import { supabase, ClientComment, clientComments } from "../lib/supabase";
import { Client } from "../lib/supabase";
import LoadingSpinner from "./LoadingSpinner";
import { formatDate } from "../lib/utils";
import { useAuth } from "../hooks/useAuth";

interface EditClientModalProps {
  client: Client | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  isAdmin: boolean;
}

export default function EditClientModal({
  client,
  isOpen,
  onClose,
  onSave,
  isAdmin,
}: EditClientModalProps) {
  const { user } = useAuth();
  const [statusColor, setStatusColor] = useState<
    "gray" | "red" | "yellow" | "green" | "blue"
  >("gray");
  const [newComment, setNewComment] = useState("");
  const [comments, setComments] = useState<ClientComment[]>([]);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (client) {
      setStatusColor(client.status_color);
      setNewComment("");
      setEditingCommentId(null);
      setEditingCommentText("");
      loadComments();
    }
  }, [client]);

  const loadComments = async () => {
    if (!client) return;

    setLoadingComments(true);
    try {
      const { data, error } = await clientComments.getByClient(client.id);

      if (error) {
        console.error("Error cargando comentarios:", error);
      } else {
        setComments(data || []);
      }
    } catch (error) {
      console.error("Error en loadComments:", error);
    } finally {
      setLoadingComments(false);
    }
  };

  const startEditComment = (comment: ClientComment) => {
    setEditingCommentId(comment.id);
    setEditingCommentText(comment.comment);
  };

  const cancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentText("");
  };

  const saveEditComment = async (commentId: string) => {
    if (!editingCommentText.trim()) {
      setError("El comentario no puede estar vacío");
      return;
    }

    try {
      const { error } = await clientComments.update(
        commentId,
        editingCommentText,
      );

      if (error) {
        setError("Error al actualizar el comentario");
        return;
      }

      // Recargar comentarios
      await loadComments();
      setEditingCommentId(null);
      setEditingCommentText("");
    } catch (error) {
      console.error("Error guardando edición:", error);
      setError("Error inesperado al guardar");
    }
  };

  const handleSave = async () => {
    if (!client || !user) return;

    setLoading(true);
    setError("");

    try {
      // Actualizar estado del cliente
      const { error: updateError } = await supabase
        .from("clients")
        .update({
          status_color: statusColor,
          updated_at: new Date().toISOString(),
        })
        .eq("id", client.id);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      // Si hay un nuevo comentario, añadirlo
      if (newComment.trim()) {
        const { error: commentError } = await clientComments.add(
          client.id,
          user.id,
          newComment,
        );

        if (commentError) {
          console.error("Error añadiendo comentario:", commentError);
          setError("Cliente actualizado, pero error al guardar comentario");
          // No retornar aquí, el cliente ya se actualizó
        }
      }

      onSave();
      onClose();
    } catch (err) {
      setError("Error inesperado al guardar");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColorClass = (color: string) => {
    switch (color) {
      case "gray":
        return "bg-gray-500";
      case "red":
        return "bg-red-500";
      case "yellow":
        return "bg-yellow-500";
      case "green":
        return "bg-green-500";
      case "blue":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = (color: string) => {
    switch (color) {
      case "gray":
        return "Sin contactar";
      case "red":
        return "Múltiples intentos";
      case "yellow":
        return "No desea ser contactado";
      case "green":
        return "Contacto exitoso";
      case "blue":
        return "En proceso de venta";
      default:
        return "Sin contactar";
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen || !client) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <MessageSquare className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Editar Cliente
              </h2>
              <p className="text-sm text-gray-600">
                {client.first_name || client.name} - {client.serial}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Información básica */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre
              </label>
              <input
                type="text"
                value={client.first_name || client.name || ""}
                disabled
                className="input-field bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Serie
              </label>
              <input
                type="text"
                value={client.serial}
                disabled
                className="input-field bg-gray-100"
              />
            </div>
          </div>

          {/* Estado del cliente */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Estado del Cliente
            </label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {(["gray", "red", "yellow", "green", "blue"] as const).map(
                (color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setStatusColor(color)}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      statusColor === color
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <div
                        className={`w-4 h-4 rounded-full ${getStatusColorClass(color)}`}
                      />
                      <span className="text-sm font-medium text-gray-700">
                        {getStatusText(color)}
                      </span>
                    </div>
                  </button>
                ),
              )}
            </div>
          </div>

          {/* Historial de comentarios */}
          {loadingComments ? (
            <div className="flex justify-center py-4">
              <LoadingSpinner
                size="sm"
                text="Cargando comentarios..."
                fullScreen={false}
              />
            </div>
          ) : comments.length > 0 ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Historial de Comentarios ({comments.length})
              </label>
              <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto space-y-3">
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="bg-white rounded-lg p-3 border border-gray-200 overflow-hidden"
                  >
                    {editingCommentId === comment.id ? (
                      // Modo edición
                      <div className="space-y-2">
                        <textarea
                          value={editingCommentText}
                          onChange={(e) =>
                            setEditingCommentText(e.target.value)
                          }
                          className="input-field w-full h-20 resize-none text-sm"
                          rows={3}
                        />
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={cancelEditComment}
                            className="text-xs text-gray-600 hover:text-gray-800 px-2 py-1"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => saveEditComment(comment.id)}
                            className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 flex items-center"
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Guardar
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Modo visualización
                      <div className="overflow-hidden">
                        <p className="text-sm text-gray-900 break-all overflow-wrap-anywhere">
                          {comment.comment}
                        </p>
                        <div className="flex items-center justify-between mt-2 gap-2">
                          <div className="flex items-center space-x-2 min-w-0">
                            <span className="text-xs font-medium text-blue-600 truncate">
                              {comment.agent?.name || "Desconocido"}
                            </span>
                            <span className="text-xs text-gray-500 whitespace-nowrap">
                              {formatDate(comment.created_at)}
                            </span>
                          </div>
                          {user && comment.agent_id === user.id && (
                            <button
                              onClick={() => startEditComment(comment)}
                              className="text-xs text-gray-600 hover:text-blue-600 flex items-center flex-shrink-0"
                              title="Editar comentario"
                            >
                              <Edit2 className="h-3 w-3 mr-1" />
                              Editar
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Nuevo comentario */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MessageSquare className="w-4 h-4 inline mr-1" />
              Añadir Nuevo Comentario
            </label>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Escribe un nuevo comentario sobre este cliente..."
              className="input-field w-full h-32 resize-none"
              rows={4}
            />
            <p className="text-xs text-gray-500 mt-1">
              {newComment.trim()
                ? "Este comentario se añadirá al historial"
                : "El comentario es opcional"}
            </p>
          </div>

          {/* Información adicional */}
          <div
            className={`p-4 rounded-lg ${isAdmin ? "bg-gray-50" : "bg-blue-50"}`}
          >
            <h3
              className={`text-sm font-medium mb-2 ${
                isAdmin ? "text-gray-700" : "text-blue-800"
              }`}
            >
              Información Adicional
            </h3>
            <div
              className={`text-sm ${isAdmin ? "text-gray-600" : "text-blue-700"}`}
            >
              <p>
                <strong>Intentos de llamada:</strong> {client.attempts}
              </p>
              <p>
                <strong>Última actualización:</strong>{" "}
                {formatDate(client.updated_at || client.created_at)}
              </p>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="btn-primary flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <LoadingSpinner
                  size="sm"
                  text="Guardando..."
                  fullScreen={false}
                />
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Guardar Cambios
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
