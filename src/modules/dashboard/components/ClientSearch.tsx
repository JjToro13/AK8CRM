import { useState } from "react";
import {
  Phone,
  User,
  UserRound,
  Hash,
  AlertCircle,
  Edit,
  Mail,
  Building,
  DollarSign,
  Calendar,
  Send,
} from "lucide-react";
import { motion } from "framer-motion";
import { canUseClientActions, Client, calls, supabase } from "../../../lib/supabase";
import { appEnv } from "../../../config/env";
import {
  getStatusColor,
  getStatusText,
  formatCurrency,
  formatDate,
  resolveClientStatus,
} from "../../../lib/utils";
import { useAuth } from "../../../hooks/useAuth";
import LoadingSpinner from "../../../shared/components/feedback/LoadingSpinner";
import ClientCommentsDropdown from "../../../shared/components/client/ClientCommentsDropdown";
import EmailModal from "../../../shared/components/client/EmailModal";

interface ClientSearchProps {
  client: Client;
  onCallStarted: () => void;
  onEditClient?: (client: Client) => void;
}

export default function ClientSearch({
  client,
  onCallStarted,
  onEditClient,
}: ClientSearchProps) {
  const { isAdmin, role } = useAuth();
  const canUseActions = canUseClientActions(role);
  const enableCalls = appEnv.features.enableCalls;
  const [calling, setCalling] = useState(false);
  const [error, setError] = useState("");
  const [showEmailModal, setShowEmailModal] = useState(false);

  const resolvedStatus = resolveClientStatus(client);
  const assignedAgentName = client.assigned_agent?.name?.trim() || null;
  const campaignName =
    client.campaign?.display_name?.trim() ||
    (client.campaign?.prefix ? `Base ${client.campaign.prefix}` : null);

  const handleCall = async () => {
    setCalling(true);
    setError("");

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setError("No se pudo obtener la informacion del agente");
        return;
      }

      const { data, error } = await calls.start(client.id, userData.user.id);

      if (error) {
        setError(error.message || "Error al iniciar la llamada");
      } else {
        onCallStarted();
        console.log("Llamada iniciada:", data);
      }
    } catch (err) {
      setError("Error inesperado al iniciar la llamada");
      console.error("Error iniciando llamada:", err);
    } finally {
      setCalling(false);
    }
  };

  const pillBtn =
    "inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-2 text-sm font-semibold text-ink/80 hover:bg-surface2 transition";

  const pillPrimary =
    "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-soft bg-gradient-to-r from-brand via-brand-600 to-brand-700 hover:brightness-105 active:brightness-95 transition disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <motion.div
      layout
      whileHover={{ y: -1 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="p-5 rounded-[1.25rem] border border-border bg-surface2 hover:bg-surface transition"
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="h-10 w-10 rounded-2xl bg-brand/10 flex items-center justify-center shrink-0">
            <User className="h-5 w-5 text-brand" />
          </div>

          <div className="min-w-0">
            <h3 className="font-semibold text-ink truncate">
              {client.name || client.first_name || "Cliente"}
            </h3>

            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
              <div className="flex items-center">
                <Hash className="h-4 w-4 mr-1 opacity-70" />
                {client.serial}
              </div>

              <div className="flex items-center gap-2">
                <div className={`status-indicator ${getStatusColor(client)}`} />
                <span>{getStatusText(client)}</span>
                <span className="text-[11px] font-semibold text-muted">
                  {resolvedStatus.shortLabel}
                </span>
              </div>

              <span>Intentos: {client.attempts}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canUseActions && onEditClient ? (
            <button
              onClick={() => onEditClient(client)}
              className={pillBtn}
              title="Editar cliente"
              type="button"
            >
              <Edit className="h-4 w-4 text-brand" />
              <span className="hidden sm:inline">Editar</span>
            </button>
          ) : null}

          {canUseActions && client.email ? (
            <button
              onClick={() => setShowEmailModal(true)}
              className={pillBtn}
              title="Enviar email"
              type="button"
            >
              <Send className="h-4 w-4 text-green-600" />
              <span className="hidden sm:inline">Email</span>
            </button>
          ) : null}

          {canUseActions && enableCalls ? (
            <button
              onClick={handleCall}
              disabled={calling}
              className={pillPrimary}
              type="button"
            >
              {calling ? (
                <LoadingSpinner size="sm" text="" fullScreen={false} />
              ) : (
                <>
                  <Phone className="w-4 h-4" />
                  Llamar
                </>
              )}
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
        {isAdmin && client.phone_number && (
          <div className="flex items-center text-muted">
            <Phone className="h-4 w-4 mr-2 opacity-70" />
            <span className="font-semibold text-ink">{client.phone_number}</span>
          </div>
        )}

        {isAdmin && client.email && (
          <div className="flex items-center text-muted">
            <Mail className="h-4 w-4 mr-2 opacity-70" />
            <span className="truncate">{client.email}</span>
          </div>
        )}

        {client.trading_company && (
          <div className="flex items-center text-muted">
            <Building className="h-4 w-4 mr-2 opacity-70" />
            <span className="truncate">{client.trading_company}</span>
          </div>
        )}

        {campaignName && (
          <div className="flex items-center text-muted">
            <Building className="h-4 w-4 mr-2 opacity-70" />
            <span className="truncate">Base: {campaignName}</span>
          </div>
        )}

        {assignedAgentName && (
          <div className="flex items-center text-muted">
            <UserRound className="h-4 w-4 mr-2 opacity-70" />
            <span className="truncate">Asignado a: {assignedAgentName}</span>
          </div>
        )}

        {client.deposit_amount ? (
          <div className="flex items-center text-muted">
            <DollarSign className="h-4 w-4 mr-2 opacity-70" />
            <span>{formatCurrency(client.deposit_amount)}</span>
          </div>
        ) : null}

        {client.investment_date && (
          <div className="flex items-center text-muted">
            <Calendar className="h-4 w-4 mr-2 opacity-70" />
            <span>{formatDate(client.investment_date)}</span>
          </div>
        )}

        <div className="flex items-center text-muted">
          <Calendar className="h-4 w-4 mr-2 opacity-70" />
          <span>Creado: {formatDate(client.created_at)}</span>
        </div>
      </div>

      {canUseActions ? (
        <div className="mt-4">
          <ClientCommentsDropdown
            clientId={client.id}
            initialCount={client.comment_count ?? null}
          />
        </div>
      ) : null}

      {error && (
        <div className="mt-3 flex items-center text-red-600 text-xs">
          <AlertCircle className="h-3 w-3 mr-1" />
          {error}
        </div>
      )}

      {canUseActions ? (
        <EmailModal
          client={client}
          isOpen={showEmailModal}
          onClose={() => setShowEmailModal(false)}
        />
      ) : null}
    </motion.div>
  );
}
