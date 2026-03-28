import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Edit,
  Mail,
  Phone,
} from "lucide-react";
import { cn, resolveClientStatus } from "../../../lib/utils";
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

const pillBtn =
  "inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-ink/80 " +
  "shadow-[0_8px_20px_rgba(17,24,39,0.06)] hover:shadow-[0_12px_26px_rgba(17,24,39,0.09)] " +
  "hover:bg-surface2 transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/15 " +
  "disabled:opacity-50 disabled:cursor-not-allowed";

const actionBtnClass =
  "inline-flex min-h-[42px] items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition " +
  "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/15 disabled:cursor-not-allowed disabled:opacity-45";

const inactiveActionBtnClass =
  "border-border bg-surface2 text-muted hover:bg-surface2";

function getStatusBadgeClass(code?: string | null) {
  switch (code) {
    case "NC":
      return "border-slate-300 bg-slate-100 text-slate-700";
    case "LD":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "SG":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "DP":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "NI":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "NX":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "NE":
      return "border-yellow-200 bg-yellow-50 text-yellow-800";
    case "RA":
      return "border-violet-200 bg-violet-50 text-violet-700";
    case "FS":
      return "border-zinc-300 bg-zinc-100 text-zinc-700";
    case "NU":
    default:
      return "border-gray-200 bg-gray-50 text-gray-700";
  }
}

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
    <div className="mt-5 border-t border-border/70 pt-4">
      <div className="space-y-3">
        <div className="flex min-h-[28px] min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
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
                    "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]",
                    getStatusBadgeClass(selectedStatus.code),
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
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
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
                  ? "border-brand-200 bg-brand-50 text-brand-800 hover:bg-brand-100"
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
                  ? "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
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
                  ? "border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100"
                  : inactiveActionBtnClass,
              )}
            >
              <Edit className="h-4 w-4" />
              Editar
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onPrevPage}
              disabled={currentPage <= 1}
              className={pillBtn}
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
                className="w-16 rounded-xl border border-border bg-surface px-3 py-2 text-center text-sm font-semibold outline-none focus:ring-4 focus:ring-brand/15"
              />
              <span>de {totalPages}</span>
            </div>

            <button
              type="button"
              onClick={onNextPage}
              disabled={currentPage >= totalPages}
              className={pillBtn}
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
