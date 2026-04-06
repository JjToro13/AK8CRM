import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Edit,
  Mail,
  Phone,
} from "lucide-react";
import { cn, resolveClientStatus } from "../../../lib/utils";
import {
  clientGhostButtonClass,
  clientInsetClass,
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
};

const actionBtnClass =
  "inline-flex min-h-[42px] items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold shadow-[0_16px_34px_rgba(15,23,42,0.07),inset_0_1px_0_rgba(255,255,255,0.84)] backdrop-blur-xl transition " +
  "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/15 disabled:cursor-not-allowed disabled:opacity-45";

const inactiveActionBtnClass =
  "border-white/76 bg-white/66 text-muted hover:bg-white/78";

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
              className={cn(
                actionBtnClass,
                hasSelectedClient && canExecuteClientActions
                  ? "border-emerald-200/90 bg-emerald-50/86 text-emerald-800 hover:bg-emerald-100/88"
                  : inactiveActionBtnClass,
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
              className={cn(
                actionBtnClass,
                hasSelectedClient && canExecuteClientActions
                  ? "border-brand/18 bg-brand/[0.08] text-brand hover:bg-brand/[0.12]"
                  : inactiveActionBtnClass,
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
              className={cn(
                actionBtnClass,
                hasSelectedClient && canExecuteClientActions
                  ? "border-amber-200/90 bg-amber-50/86 text-amber-800 hover:bg-amber-100/88"
                  : inactiveActionBtnClass,
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
              className={cn(
                actionBtnClass,
                hasSelectedClient && canExecuteClientActions
                  ? "border-slate-200/90 bg-slate-50/86 text-slate-800 hover:bg-slate-100/88"
                  : inactiveActionBtnClass,
              )}
            >
              <Edit className="h-4 w-4" />
              Editar
            </button>
          </div>

          <div className={cn(clientInsetClass, "flex items-center gap-2 px-3 py-2")}>
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
                className="w-16 rounded-2xl border border-white/78 bg-white/78 px-3 py-2 text-center text-sm font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.86)] outline-none backdrop-blur-xl focus:ring-4 focus:ring-brand/15"
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
