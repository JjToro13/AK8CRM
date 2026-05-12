// EmailModal.tsx - Modal para enviar email al cliente desde su ficha (premium)

import { useState, useEffect, useMemo } from "react";
import { Send, Mail, AlertCircle, CheckCircle } from "lucide-react";
import { Client, emails, supabase } from "../../../lib/supabase";
import LoadingSpinner from "../feedback/LoadingSpinner";
import { useAuth } from "../../../hooks/useAuth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/Select";
import Field from "../ui/Field";
import Input from "../ui/Input";
import Textarea from "../ui/Textarea";
import {
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalPanel,
  modalPrimaryActionClassName,
  modalSecondaryActionClassName,
} from "../layout/ModalLayout";
import {
  clientInsetClass,
  clientModalFooterClass,
  clientModalHeaderClass,
  clientModalPanelClass,
} from "./clientUi";
import { displayClientEmail } from "../../privacy/client-privacy";
import { useClientPrivacySettings } from "../../privacy/useClientPrivacySettings";

interface EmailModalProps {
  client: Client;
  isOpen: boolean;
  onClose: () => void;
}

interface EmailAccount {
  id: number;
  name: string;
  from_email: string;
}

export default function EmailModal({ client, isOpen, onClose }: EmailModalProps) {
  const { isAdmin, user } = useAuth();
  const { settings: privacySettings } = useClientPrivacySettings();

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  // Cargar cuentas al abrir
  useEffect(() => {
    if (isOpen && user) loadEmailAccounts();
  }, [isOpen, user]);

  const selectedAccount = useMemo(
    () => emailAccounts.find((acc) => acc.id === selectedAccountId),
    [emailAccounts, selectedAccountId],
  );

  const loadEmailAccounts = async () => {
    try {
      setLoadingAccounts(true);
      setError("");

      const { data: functionsData, error: functionsError } =
        await supabase.functions.invoke("get-email-accounts");

      if (functionsError) {
        console.error("Error obteniendo cuentas de email:", functionsError);
        setError("No se pudieron cargar las cuentas de email");
        return;
      }

      if (!functionsData?.success || !functionsData?.accounts?.length) {
        setError("No hay cuentas de email configuradas en el sistema");
        return;
      }

      setEmailAccounts(functionsData.accounts as EmailAccount[]);

      const { data: prefData, error: prefErr } = await supabase.rpc("get_email_pref");
      if (!prefErr) {
        const preferredId = prefData?.preferred_email_account_id ?? null;

        if (
          preferredId &&
          (functionsData.accounts as EmailAccount[]).some((acc) => acc.id === preferredId)
        ) {
          setSelectedAccountId(preferredId);
        } else {
          setSelectedAccountId((functionsData.accounts as EmailAccount[])[0].id);
        }
      } else {
        setSelectedAccountId((functionsData.accounts as EmailAccount[])[0].id);
      }
    } catch (e) {
      console.error("Error en loadEmailAccounts:", e);
      setError("Error al cargar las cuentas de email");
    } finally {
      setLoadingAccounts(false);
    }
  };

  const handleAccountChange = async (accountId: number) => {
    setSelectedAccountId(accountId);

    if (user) {
      try {
        const { error } = await supabase.rpc("set_email_pref", { p_account_id: accountId });
        if (error) console.error("Error guardando preferencia de email:", error);
      } catch (e) {
        console.error("Error al guardar preferencia:", e);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!subject.trim() || !message.trim()) {
      setError("El asunto y el mensaje son requeridos");
      return;
    }
    if (!selectedAccountId) {
      setError("Por favor selecciona una cuenta de email");
      return;
    }

    setLoading(true);

    try {
      const { error } = await emails.sendWithAccount(
        client.id,
        subject.trim(),
        message.trim(),
        user?.id,
        selectedAccountId,
      );

      if (error) throw new Error(error.message || "Error enviando email");

      setSuccess(true);
      setSubject("");
      setMessage("");

      window.setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 2000);
    } catch (e) {
      console.error("Error enviando email:", e);
      setError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  // reset visual al cerrar
  useEffect(() => {
    if (!isOpen) {
      setError("");
      setSuccess(false);
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),transparent_42%),rgba(15,23,42,0.5)] backdrop-blur-[4px]"
        onClick={handleBackdropClick}
        aria-label="Cerrar modal de email"
      />
      <ModalPanel className={`${clientModalPanelClass} max-h-[90vh] max-w-3xl`}>
        <ModalHeader
          icon={<Mail className="h-5 w-5 text-brand" />}
          title="Enviar Email"
          description={
            <>
              a {client.first_name || client.name || "Cliente"} ({client.serial})
            </>
          }
          onClose={onClose}
          className={clientModalHeaderClass}
        />

        <form
          id="__email_form__"
          onSubmit={handleSubmit}
          className="crm-scrollbar crm-scrollbar-shell max-h-[calc(90vh-86px-78px)] overflow-y-auto"
        >
          <ModalBody>
          {/* Información cliente */}
          <div className="rounded-3xl border border-brand/20 bg-[linear-gradient(180deg,rgba(var(--color-brand-50),0.74),rgba(255,255,255,0.66))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]">
            <div className="flex items-center justify-between gap-3 mb-2">
              <h3 className="text-xs font-semibold text-brand">Información del Cliente</h3>
              <span className="text-[11px] text-ink/60">
                {isAdmin ? "Gestion" : "Operativo"}
              </span>
            </div>

            <div className="text-sm text-ink/80 space-y-1">
              <p>
                <span className="font-semibold">Nombre:</span>{" "}
                {client.first_name || client.name || "No disponible"}
              </p>
              <p>
                <span className="font-semibold">Serie:</span> {client.serial}
              </p>
              <p>
                <span className="font-semibold">Email:</span>{" "}
                {client.email
                  ? displayClientEmail(client.email, {
                      maskEmails: privacySettings.maskEmails || !isAdmin,
                      maskPhoneNumbers: privacySettings.maskPhoneNumbers,
                    })
                  : "No disponible"}
              </p>
            </div>
          </div>

          {/* Selector cuenta */}
          {loadingAccounts ? (
            <div className={`${clientInsetClass} rounded-3xl p-4`}>
              <div className="flex items-center justify-center">
                <LoadingSpinner size="sm" text="Cargando cuentas de email..." fullScreen={false} />
              </div>
            </div>
          ) : emailAccounts.length > 0 ? (
            <div>
              <label htmlFor="email-account" className="block text-xs font-semibold text-muted mb-2">
                Enviar desde *
              </label>

              <Select
                value={selectedAccountId ? String(selectedAccountId) : undefined}
                onValueChange={(value) => handleAccountChange(Number(value))}
              >
                <SelectTrigger id="email-account">
                  <SelectValue placeholder="Selecciona una cuenta de email" />
                </SelectTrigger>

                <SelectContent>
                  {emailAccounts.map((account) => (
                    <SelectItem key={account.id} value={String(account.id)}>
                      {account.name} ({account.from_email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedAccount && (
                <p className="text-xs text-muted mt-2">
                  Se enviará desde: <span className="font-semibold text-ink/80">{selectedAccount.from_email}</span>
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-3xl border border-red-200/90 bg-[linear-gradient(180deg,rgba(254,226,226,0.82),rgba(255,255,255,0.7))] p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <p className="text-red-700 text-sm font-semibold">
                  No hay cuentas de email configuradas en el sistema
                </p>
              </div>
            </div>
          )}

          {/* Asunto */}
          <Field label="Asunto" required hint={`${subject.length}/100 caracteres`}>
            <Input
              id="subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Ej: Seguimiento de inversión"
              required
              maxLength={100}
            />
          </Field>

          {/* Mensaje */}
          <Field label="Mensaje" required hint={`${message.length}/5000 caracteres`}>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Escribe tu mensaje aquí..."
              className="min-h-[220px] resize-y"
              required
              maxLength={5000}
            />
          </Field>

          {/* Instrucciones */}
          <div className={`${clientInsetClass} rounded-3xl p-4`}>
            <h3 className="text-xs font-semibold text-ink/80 mb-2">Instrucciones</h3>
            <ul className="text-sm text-muted space-y-1 list-disc pl-5">
              <li>El email se enviará desde la cuenta seleccionada arriba</li>
              <li>El cliente recibirá el mensaje en su email registrado</li>
              <li>Tu selección de cuenta se guardará para futuros envíos</li>
              <li>El cliente podrá responder directamente a este email</li>
            </ul>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-3xl border border-red-200/90 bg-[linear-gradient(180deg,rgba(254,226,226,0.82),rgba(255,255,255,0.7))] p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <p className="text-red-700 text-sm font-semibold">{error}</p>
              </div>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="rounded-3xl border border-green-200/90 bg-[linear-gradient(180deg,rgba(220,252,231,0.82),rgba(255,255,255,0.7))] p-4">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <p className="text-green-700 text-sm font-semibold">
                  Email enviado correctamente. Se cerrará automáticamente.
                </p>
              </div>
            </div>
          )}

            {/* Spacer para que el footer no tape contenido */}
            <div className="h-2" />
          </ModalBody>
        </form>

        <ModalFooter className={clientModalFooterClass}>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className={modalSecondaryActionClassName}
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={
              loading ||
              loadingAccounts ||
              !subject.trim() ||
              !message.trim() ||
              !selectedAccountId ||
              emailAccounts.length === 0
            }
            className={modalPrimaryActionClassName}
            formNoValidate={false}
            form="__email_form__"
          >
            {loading ? (
              <LoadingSpinner size="sm" text="Enviando..." fullScreen={false} />
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Enviar Email
              </>
            )}
          </button>
        </ModalFooter>
      </ModalPanel>
    </div>
  );
}
