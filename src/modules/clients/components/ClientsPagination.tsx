import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Edit,
  Mail,
  Phone,
  UserPlus,
} from "lucide-react";
import { cn, resolveClientStatus } from "../../../lib/utils";
import {
  clientGhostButtonClass,
  clientInsetClass,
  clientQuickActionButtonClass,
  clientStatusBadgeClass,
} from "../../../shared/components/client/clientUi";
import type { Client } from "../../../shared/types/crm";

type ClientsPaginationProps = {
  startItem: number;
  endItem: number;
  totalClients: number;
  currentPage: number;
  pageInput: string;
  totalPages: number;
  onPrevPage: () => void;
  onNextPage: () => void;
  onPageInputChange: (value: string) => void;
  onPageInputSubmit: () => void;
  selectedClient: Client | null;
  canExecuteClientActions: boolean;
  enableCalls: boolean;
  callingClient: string | null;
  onCallClient: (client: Client) => void;
  onOpenCallNotice: () => void;
  onEmailClient: (client: Client) => void;
  onScheduleClient: (client: Client) => void;
  onEditClient: (client: Client) => void;
  canAssignClient: boolean;
  onAssignClient: (client: Client) => void;
};

export default function ClientsPagination({
  currentPage,
  pageInput,
  totalPages,
  onPrevPage,
  onNextPage,
  onPageInputChange,
  onPageInputSubmit,
  selectedClient,
  canExecuteClientActions,
  enableCalls,
  callingClient,
  onCallClient,
  onOpenCallNotice,
  onEmailClient,
  onScheduleClient,
  onEditClient,
  canAssignClient,
  onAssignClient,
}: ClientsPaginationProps) {
  const selectedStatus = selectedClient
    ? resolveClientStatus(selectedClient)
    : null;
  const hasSelectedClient = Boolean(selectedClient);
  const selectedClientName = selectedClient
    ? `${selectedClient.first_name || selectedClient.name || "Sin nombre"} ${selectedClient.last_name || ""}`.trim()
    : null;
  const selectedClientCompany =
    selectedClient?.source || selectedClient?.trading_company || null;

  return (
    <div className="mt-5 border-t border-white/55 pt-5">
      <div className="space-y-3">
        <div className="flex min-h-[28px] min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted">
            Acciones rápidas
          </div>

          {selectedClient ? (
            <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-ink">
              <span className="truncate font-semibold">{selectedClientName}</span>
              <span className="text-muted">|</span>
              <span className="font-mono text-[13px]">{selectedClient.serial}</span>
              {selectedClientCompany ? (
                <>
                  <span className="text-muted">|</span>
                  <span className="truncate text-muted">{selectedClientCompany}</span>
                </>
              ) : null}
              {selectedStatus ? (
                <span
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] shadow-[0_12px_26px_rgba(15,23,42,0.05)] backdrop-blur-xl",
                    clientStatusBadgeClass(selectedStatus.code),
                  )}
                >
                  <span>{selectedStatus.label}</span>
                  <span
                    aria-hidden="true"
                    className="text-[10px] leading-none opacity-60"
                  >
                    •
                  </span>
                  <span>{selectedStatus.shortLabel}</span>
                </span>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted">
              Selecciona una fila para activar las acciones.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (!selectedClient) return;
                if (enableCalls) onCallClient(selectedClient);
                else onOpenCallNotice();
              }}
              disabled={
                !canExecuteClientActions ||
                !selectedClient ||
                (enableCalls && callingClient === selectedClient.id)
              }
              className={clientQuickActionButtonClass(
                "call",
                hasSelectedClient && canExecuteClientActions,
              )}
            >
              <Phone className="h-4 w-4" />
              Llamar
            </button>

            <button
              type="button"
              onClick={() => {
                if (!selectedClient) return;
                onEmailClient(selectedClient);
              }}
              disabled={
                !canExecuteClientActions || !selectedClient || !selectedClient.email
              }
              className={clientQuickActionButtonClass(
                "email",
                hasSelectedClient && canExecuteClientActions && Boolean(selectedClient?.email),
              )}
            >
              <Mail className="h-4 w-4" />
              Email
            </button>

            <button
              type="button"
              onClick={() => {
                if (!selectedClient) return;
                onScheduleClient(selectedClient);
              }}
              disabled={!canExecuteClientActions || !selectedClient}
              className={clientQuickActionButtonClass(
                "calendar",
                hasSelectedClient && canExecuteClientActions,
              )}
            >
              <CalendarDays className="h-4 w-4" />
              Calendario
            </button>

            <button
              type="button"
              onClick={() => {
                if (!selectedClient) return;
                onEditClient(selectedClient);
              }}
              disabled={!canExecuteClientActions || !selectedClient}
              className={clientQuickActionButtonClass(
                "neutral",
                hasSelectedClient && canExecuteClientActions,
              )}
            >
              <Edit className="h-4 w-4" />
              Editar
            </button>

            {canAssignClient ? (
              <button
                type="button"
                onClick={() => {
                  if (!selectedClient) return;
                  onAssignClient(selectedClient);
                }}
                disabled={!selectedClient}
                className={clientQuickActionButtonClass(
                  "neutral",
                  hasSelectedClient,
                )}
              >
                <UserPlus className="h-4 w-4" />
                Asignacion
              </button>
            ) : null}
          </div>

          <div className={cn(clientInsetClass, "crm-client-pagination-shell flex items-center gap-2 px-3 py-2")}>
            <button
              type="button"
              onClick={onPrevPage}
              disabled={currentPage <= 1}
              className={clientGhostButtonClass}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </button>

            <div className="flex items-center gap-2 text-sm text-ink/80">
              <span>Página</span>
              <input
                type="text"
                inputMode="numeric"
                value={pageInput}
                onChange={(event) =>
                  onPageInputChange(event.target.value.replace(/[^\d]/g, ""))
                }
                onBlur={onPageInputSubmit}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    onPageInputSubmit();
                  }
                }}
                className="crm-client-pagination-input w-16 rounded-2xl border px-3 py-2 text-center text-sm font-semibold outline-none backdrop-blur-xl focus:ring-4 focus:ring-brand/15"
              />
              <span>de {totalPages}</span>
            </div>

            <button
              type="button"
              onClick={onNextPage}
              disabled={currentPage >= totalPages}
              className={clientGhostButtonClass}
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
