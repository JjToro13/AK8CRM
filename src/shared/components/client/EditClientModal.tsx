// EditClientModal.tsx - Modal para editar el estado del cliente y gestionar comentarios

import { useState, useEffect, useMemo } from "react";
import {
  X,
  Save,
  MessageSquare,
  AlertCircle,
  Edit2,
  Check,
} from "lucide-react";
import { supabase, ClientComment, clientComments } from "../../../lib/supabase";
import { Client } from "../../../lib/supabase";
import LoadingSpinner from "../feedback/LoadingSpinner";
import {
  CLIENT_STATUS_OPTIONS,
  ClientStatusCode,
  formatDate,
  getStatusCode,
  getStatusDotClass,
  getStatusText,
} from "../../../lib/utils";
import { useAuth } from "../../../hooks/useAuth";
import Input from "../ui/Input";
import Textarea from "../ui/Textarea";
import {
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalPanel,
  modalPrimaryActionClassName,
  modalSecondaryActionClassName,
} from "../layout/ModalLayout";

interface EditClientModalProps {
  client: Client | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  isAdmin: boolean;
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type StatusGroup = {
  title: string;
  items: Array<(typeof CLIENT_STATUS_OPTIONS)[number]>;
};

export default function EditClientModal({
  client,
  isOpen,
  onClose,
  onSave,
  isAdmin,
}: EditClientModalProps) {
  const { user } = useAuth();

  const [statusCode, setStatusCode] = useState<ClientStatusCode>("SC");

  const [newComment, setNewComment] = useState("");
  const [comments, setComments] = useState<ClientComment[]>([]);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");

  const [loading, setLoading] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [error, setError] = useState("");
  const [commentError, setCommentError] = useState<string | null>(null);

  useEffect(() => {
    if (client) {
      setStatusCode(getStatusCode(client));
      setNewComment("");
      setEditingCommentId(null);
      setEditingCommentText("");
      loadComments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]);

  const selectableStatusOptions = useMemo(() => {
    return CLIENT_STATUS_OPTIONS.filter((status) => status.code !== "SC");
  }, []);

  const statusGroups = useMemo<StatusGroup[]>(() => {
    const byCode = new Map(
      selectableStatusOptions.map((status) => [status.code, status]),
    );

    return [
      {
        title: "Sin contacto efectivo",
        items: ["NA", "WN"]
          .map((code) => byCode.get(code as ClientStatusCode))
          .filter(Boolean) as Array<(typeof CLIENT_STATUS_OPTIONS)[number]>,
      },
      {
        title: "Contacto inicial",
        items: ["HU", "CP"]
          .map((code) => byCode.get(code as ClientStatusCode))
          .filter(Boolean) as Array<(typeof CLIENT_STATUS_OPTIONS)[number]>,
      },
      {
        title: "Resultado comercial",
        items: ["CB", "NI"]
          .map((code) => byCode.get(code as ClientStatusCode))
          .filter(Boolean) as Array<(typeof CLIENT_STATUS_OPTIONS)[number]>,
      },
    ];
  }, [selectableStatusOptions]);

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
    } catch (e) {
      console.error("Error en loadComments:", e);
    } finally {
      setLoadingComments(false);
    }
  };

  const startEditComment = (comment: ClientComment) => {
    setCommentError(null);
    setEditingCommentId(comment.id);
    setEditingCommentText(comment.comment);
  };

  const cancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentText("");
  };

  function getFriendlyCommentError(error: any): string {
    if (!error) return "No se pudo actualizar el comentario.";

    const msg = error.message || "";

    if (msg.includes("single JSON object")) {
      return "No tienes permiso para editar este comentario.";
    }

    if (msg.includes("row-level security")) {
      return "No tienes permisos para modificar este comentario.";
    }

    if (msg.includes("network")) {
      return "Error de conexión. Intenta nuevamente.";
    }

    return "No se pudo actualizar el comentario. Intenta nuevamente.";
  }

  const saveEditComment = async (commentId: string) => {
    if (!editingCommentText.trim()) {
      setCommentError("El comentario no puede estar vacío");
      return;
    }

    try {
      setCommentError(null);

      const { error } = await clientComments.update(
        commentId,
        editingCommentText,
      );

      if (error) {
        console.error("Supabase error:", error);
        setCommentError(getFriendlyCommentError(error));
        return;
      }

      await loadComments();
      setEditingCommentId(null);
      setEditingCommentText("");
    } catch (e) {
      console.error("Error guardando edición:", e);
      setCommentError("Error inesperado al guardar");
    }
  };

  const handleSave = async () => {
    if (!client || !user) return;

    setLoading(true);
    setError("");

    try {
      const currentStatus = getStatusCode(client);
      const statusChanged = statusCode !== currentStatus;
      const hasNewComment = !!newComment.trim();

      if (!statusChanged && !hasNewComment) {
        onClose();
        return;
      }

      if (statusCode === "SC" && currentStatus !== "SC") {
        setError("La tipificación SC es automática y no puede asignarse manualmente.");
        return;
      }

      if (statusChanged) {
        let updateRequest = supabase
          .from("clients")
          .update({
            status_code: statusCode,
            updated_at: new Date().toISOString(),
          })
          .eq("id", client.id);

        if (client.operation_id) {
          updateRequest = updateRequest.eq("operation_id", client.operation_id);
        }

        const { error: updateError } = await updateRequest;

        if (updateError) {
          setError(updateError.message);
          return;
        }
      }

      if (hasNewComment) {
        const { error: commentInsertError } = await clientComments.add(
          client.id,
          user.id,
          newComment,
        );

        if (commentInsertError) {
          console.error("Error añadiendo comentario:", commentInsertError);
          setError(
            statusChanged
              ? "Cliente actualizado, pero hubo un error al guardar el comentario"
              : "No se pudo guardar el comentario",
          );
          return;
        }
      }

      onSave();
      onClose();
    } catch (e) {
      console.error(e);
      setError("Error inesperado al guardar");
    } finally {
      setLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!isOpen || !client) return null;

  const currentResolvedText = getStatusText(client);
  const selectedResolvedText = getStatusText(statusCode);
  const currentStatusCode = getStatusCode(client);
  const currentStatusIsSC = currentStatusCode === "SC";
  const statusChanged = statusCode !== currentStatusCode;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        onClick={handleBackdropClick}
        aria-label="Cerrar modal de cliente"
      />
      <ModalPanel className="relative max-h-[90vh] max-w-5xl">
        {/* Header */}
        <div className="hidden">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-11 w-11 rounded-2xl bg-brand/10 flex items-center justify-center shrink-0">
              <MessageSquare className="h-5 w-5 text-brand" />
            </div>

            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-semibold text-ink truncate">
                Editar Cliente
              </h2>
              <p className="text-xs text-muted truncate">
                {client.first_name || client.name || "Cliente"} • {client.serial}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="h-10 w-10 rounded-2xl border border-border bg-surface text-muted hover:text-ink hover:bg-surface2 transition flex items-center justify-center"
            aria-label="Cerrar"
            title="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <ModalHeader
          icon={<MessageSquare className="h-5 w-5 text-brand" />}
          title="Editar cliente"
          description={`${client.first_name || client.name || "Cliente"} - ${client.serial}`}
          onClose={onClose}
        />

        {/* Body */}
        <ModalBody className="max-h-[calc(90vh-86px-78px)] overflow-y-auto">
          {/* Info básica */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="block text-xs font-semibold text-muted mb-2">
                Nombre
              </div>
              <Input
                type="text"
                value={client.first_name || client.name || ""}
                disabled
                className="bg-surface2/70"
              />
            </div>

            <div>
              <div className="block text-xs font-semibold text-muted mb-2">
                Serie
              </div>
              <Input
                type="text"
                value={client.serial}
                disabled
                className="bg-surface2/70"
              />
            </div>
          </div>

          {/* Estado */}
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="block text-xs font-semibold text-muted">
                Tipificación del Cliente
              </div>

              <div className="rounded-2xl border border-border bg-surface2 px-3 py-2 text-xs text-muted">
                <div>
                  Actual:{" "}
                  <span className="font-semibold text-ink/80">
                    {currentResolvedText}
                  </span>
                </div>
                <div className="mt-0.5">
                  Seleccionada:{" "}
                  <span className="font-semibold text-ink/80">
                    {selectedResolvedText}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2">
              <p className="text-[11px] leading-relaxed text-amber-800">
                <span className="font-semibold">SC</span> es automático y no se
                puede asignar manualmente. Puedes guardar solo un comentario sin
                cambiar el estado.
              </p>
            </div>

            <div className="space-y-3">
              {statusGroups.map((group) => (
                <div
                  key={group.title}
                  className="rounded-2xl border border-border bg-surface2 p-3"
                >
                  <div className="mb-2">
                    <h3 className="text-xs font-semibold text-ink/85">
                      {group.title}
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {group.items.map((status) => {
                      const active = statusCode === status.code;

                      return (
                        <button
                          key={status.code}
                          type="button"
                          onClick={() => setStatusCode(status.code)}
                          className={cn(
                            "rounded-xl border px-3 py-2.5 text-left transition",
                            active
                              ? "border-brand/30 bg-brand/10 shadow-[0_8px_20px_rgba(17,24,39,0.05)]"
                              : "border-border bg-surface hover:bg-surface2",
                            "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/15",
                          )}
                        >
                          <div className="flex items-start gap-2.5">
                            <span
                              className={cn(
                                "mt-1 h-3 w-3 rounded-full shrink-0",
                                getStatusDotClass(status.code),
                              )}
                            />

                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold tracking-wide text-ink/90">
                                  {status.shortLabel}
                                </span>

                                <span className="h-3 w-px bg-border/80 rounded-full" />

                                <span className="text-xs font-semibold text-ink/80">
                                  {status.label}
                                </span>
                              </div>

                              <p className="mt-1 text-[11px] leading-snug text-muted">
                                {status.description}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {currentStatusIsSC && !statusChanged && (
              <p className="text-[11px] text-muted">
                El cliente sigue en <span className="font-semibold">SC</span>. No
                necesitas cambiar la tipificación para agregar un comentario.
              </p>
            )}
          </div>

          {/* Historial */}
          <div>
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="block text-xs font-semibold text-muted">
                Historial de Comentarios
              </div>
              <span className="rounded-full border border-brand/20 bg-brand/10 px-2 py-0.5 text-[12px] font-semibold text-brand">
                {comments.length}
              </span>
            </div>

            <div className="rounded-3xl border border-border bg-surface2 p-4">
              {loadingComments ? (
                <div className="flex justify-center py-6">
                  <LoadingSpinner
                    size="sm"
                    text="Cargando comentarios..."
                    fullScreen={false}
                  />
                </div>
              ) : comments.length === 0 ? (
                <div className="text-sm text-muted py-3">
                  Sin comentarios aún.
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto pr-1 space-y-3">
                  {comments.map((comment) => {
                    const canEdit = user && comment.agent_id === user.id;
                    const isEditing = editingCommentId === comment.id;

                    return (
                      <div
                        key={comment.id}
                        className="rounded-2xl border border-border bg-surface p-4"
                      >
                        {isEditing ? (
                          <div className="space-y-3">
                            <Textarea
                              value={editingCommentText}
                              onChange={(e) => {
                                setEditingCommentText(e.target.value);
                                if (commentError) setCommentError(null);
                              }}
                              className="h-24 resize-none"
                              rows={3}
                            />
                            {commentError && (
                              <span className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2">
                                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                                <p className="text-xs text-red-700 font-medium leading-relaxed">
                                  {commentError}
                                </p>
                              </span>
                            )}

                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={cancelEditComment}
                                className="inline-flex items-center rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-ink/80 hover:bg-surface2 transition"
                              >
                                Cancelar
                              </button>

                              <button
                                type="button"
                                onClick={() => saveEditComment(comment.id)}
                                className="inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold text-white shadow-soft bg-gradient-to-r from-brand via-brand-600 to-brand-700 hover:brightness-105 active:brightness-95 transition"
                              >
                                <Check className="h-3.5 w-3.5 mr-1" />
                                Guardar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-sm text-ink whitespace-pre-wrap leading-relaxed break-words">
                              {comment.comment}
                            </p>

                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2 text-xs text-muted min-w-0">
                                <span className="font-semibold text-brand truncate max-w-[220px]">
                                  {comment.agent?.name || "Desconocido"}
                                </span>
                                <span className="text-border">•</span>
                                <span className="whitespace-nowrap">
                                  {formatDate(comment.created_at)}
                                </span>
                              </div>

                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={() => startEditComment(comment)}
                                  className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-ink/70 hover:bg-surface2 hover:text-ink transition"
                                  title="Editar comentario"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                  Editar
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Nuevo comentario */}
          <div>
            <div className="block text-xs font-semibold text-muted mb-2">
              <MessageSquare className="w-4 h-4 inline mr-1" />
              Añadir Nuevo Comentario
            </div>

            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Escribe un nuevo comentario sobre este cliente..."
              className="h-32 resize-none"
              rows={4}
            />

            <p className="text-xs text-muted mt-2">
              {newComment.trim()
                ? "Este comentario se añadirá al historial"
                : "El comentario es opcional"}
            </p>
          </div>

          {/* Info adicional */}
          <div
            className={cn(
              "rounded-3xl border border-border p-4",
              isAdmin ? "bg-surface2" : "bg-brand/10",
            )}
          >
            <h3
              className={cn(
                "text-xs font-semibold mb-2",
                isAdmin ? "text-ink/80" : "text-brand",
              )}
            >
              Información Adicional
            </h3>

            <div
              className={cn("text-sm", isAdmin ? "text-muted" : "text-ink/80")}
            >
              <p>
                <span className="font-semibold">Intentos de llamada:</span>{" "}
                {client.attempts}
              </p>
              <p className="mt-1">
                <span className="font-semibold">Última actualización:</span>{" "}
                {formatDate(client.updated_at || client.created_at)}
              </p>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <p className="text-red-700 text-sm font-semibold">{error}</p>
              </div>
            </div>
          )}
        </ModalBody>

        {/* Footer */}
        <ModalFooter>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className={modalSecondaryActionClassName}
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className={modalPrimaryActionClassName}
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
        </ModalFooter>
      </ModalPanel>
    </div>
  );
}
