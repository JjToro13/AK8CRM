import { memo, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import ClientCommentsCell from "../../../shared/components/client/ClientCommentsCell";
import {
  cn,
  formatCurrency,
  formatDate,
  getStatusColor,
  getStatusText,
  resolveClientStatus,
} from "../../../lib/utils";
import { hasCommentToday } from "../lib/clientFollowUp";
import type { Client } from "../../../shared/types/crm";
import type { ClientTableColumnKey } from "./clientTableColumns";
import {
  displayClientEmail,
  displayClientPhone,
  type ClientPrivacySettings,
} from "../../../shared/privacy/client-privacy";

type ClientsTableRowProps = {
  client: Client;
  visibleColumns: ClientTableColumnKey[];
  gridTemplate: string;
  selected: boolean;
  privacySettings: ClientPrivacySettings;
  onSelectClient: (
    clientId: string,
    event: MouseEvent<HTMLDivElement> | KeyboardEvent<HTMLDivElement>,
  ) => void;
  onOpenEdit: (client: Client) => void;
  onCopy: (label: string, value?: string | null) => void;
};

type SheetCellProps = {
  children: ReactNode;
  className?: string;
};

function SheetCell({ children, className }: SheetCellProps) {
  return (
    <div
      className={cn(
        "flex min-h-[70px] min-w-0 items-center px-4 py-3 text-sm text-ink",
        className,
      )}
    >
      {children}
    </div>
  );
}

function CopyableText({
  label,
  value,
  displayValue,
  masked,
  onCopy,
}: {
  label: string;
  value?: string | null;
  displayValue?: string;
  masked?: boolean;
  onCopy: (label: string, value?: string | null) => void;
}) {
  if (!value) {
    return <span className="text-muted">-</span>;
  }

  if (masked) {
    return (
      <span className="truncate text-sm font-semibold text-ink/75">
        {displayValue || "••••"}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onCopy(label, value);
      }}
      className="truncate text-left text-sm text-ink underline decoration-dotted underline-offset-2 transition hover:text-brand"
      title={`Click para copiar ${label.toLowerCase()}`}
    >
      {displayValue || value}
    </button>
  );
}

function isInteractiveElementTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(
    target.closest(
      "button, a, input, textarea, select, [contenteditable='true']",
    ),
  );
}

function ClientsTableRow({
  client,
  visibleColumns,
  gridTemplate,
  selected,
  privacySettings,
  onSelectClient,
  onOpenEdit,
  onCopy,
}: ClientsTableRowProps) {
  const resolvedStatus = resolveClientStatus(client);
  const isHighValue =
    (client.net_deposit ?? 0) >= 500 || (client.deposit_amount ?? 0) >= 500;
  const isManyAttempts = (client.attempts ?? 0) >= 3;
  const company = client.source || client.trading_company || "-";
  const campaignPrefix = client.campaign?.prefix?.trim() || client.campaign_id || "";
  const campaignLabel =
    client.campaign?.display_name?.trim() || campaignPrefix || "-";
  const assignedAgentName = client.assigned_agent?.name?.trim() || "Sin asignar";
  const isPendingToday = !hasCommentToday(client.last_comment_at);
  const rowAccentClass = isManyAttempts
    ? "before:bg-red-400"
    : isHighValue
      ? "before:bg-blue-400"
      : isPendingToday
        ? "before:bg-amber-400"
        : "";

  const handleRowDoubleClick = (event: MouseEvent<HTMLDivElement>) => {
    if (isInteractiveElementTarget(event.target)) {
      return;
    }

    onOpenEdit(client);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(event) => onSelectClient(client.id, event)}
      onDoubleClick={handleRowDoubleClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelectClient(client.id, event);
        }
      }}
      className={cn(
        "crm-client-row group relative grid min-w-max text-left transition-all",
        "select-none",
        "before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1",
        rowAccentClass,
        selected && "crm-client-row-selected",
      )}
      style={{ gridTemplateColumns: gridTemplate }}
      aria-selected={selected}
    >
      {visibleColumns.map((column) => {
        switch (column) {
          case "status":
            return (
              <SheetCell
                key={column}
                className={cn(selected && "crm-client-row-cell-selected")}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className={cn(
                      "status-indicator shrink-0 !mr-0",
                      getStatusColor(client),
                      selected && "ring-4 ring-brand/10",
                    )}
                  />
                  <div className="min-w-0">
                    <div className="truncate text-sm text-ink">{getStatusText(client)}</div>
                    <div className="text-[11px] font-semibold text-muted">
                      {resolvedStatus.shortLabel}
                    </div>
                  </div>
                </div>
              </SheetCell>
            );
          case "first_name":
            return (
              <SheetCell
                key={column}
                className={cn("font-medium", selected && "crm-client-row-cell-selected")}
              >
                <div className="min-w-0">
                  <div className="truncate">{client.first_name || client.name || "Sin nombre"}</div>
                  {isPendingToday ? (
                    <div className="mt-1 text-[11px] font-semibold text-amber-700">
                      Urgente · sin comentario hoy
                    </div>
                  ) : null}
                </div>
              </SheetCell>
            );
          case "last_name":
            return (
              <SheetCell key={column} className={cn(selected && "crm-client-row-cell-selected")}>
                <div className="truncate">{client.last_name || "-"}</div>
              </SheetCell>
            );
          case "email":
            return (
              <SheetCell key={column} className={cn(selected && "crm-client-row-cell-selected")}>
                <CopyableText
                  label="Email"
                  value={client.email}
                  displayValue={displayClientEmail(client.email, privacySettings)}
                  masked={privacySettings.maskEmails}
                  onCopy={onCopy}
                />
              </SheetCell>
            );
          case "phone_number":
            return (
              <SheetCell key={column} className={cn(selected && "crm-client-row-cell-selected")}>
                <CopyableText
                  label="Telefono"
                  value={client.phone_number}
                  displayValue={displayClientPhone(
                    client.phone_number,
                    privacySettings,
                  )}
                  masked={privacySettings.maskPhoneNumbers}
                  onCopy={onCopy}
                />
              </SheetCell>
            );
          case "country":
            return (
              <SheetCell key={column} className={cn(selected && "crm-client-row-cell-selected")}>
                <div className="truncate">{client.country || "-"}</div>
              </SheetCell>
            );
          case "source":
            return (
              <SheetCell key={column} className={cn(selected && "crm-client-row-cell-selected")}>
                <div className="truncate" title={company}>
                  {company}
                </div>
              </SheetCell>
            );
          case "campaign":
            return (
              <SheetCell key={column} className={cn(selected && "crm-client-row-cell-selected")}>
                <div className="min-w-0">
                  <div className="truncate" title={campaignLabel}>
                    {campaignLabel}
                  </div>
                  {campaignPrefix && campaignPrefix !== campaignLabel ? (
                    <div className="mt-1 text-[11px] font-semibold text-muted">
                      {campaignPrefix}
                    </div>
                  ) : null}
                </div>
              </SheetCell>
            );
          case "assigned_agent":
            return (
              <SheetCell key={column} className={cn(selected && "crm-client-row-cell-selected")}>
                <div
                  className={cn("truncate", !client.assigned_agent?.name && "text-muted")}
                  title={assignedAgentName}
                >
                  {assignedAgentName}
                </div>
              </SheetCell>
            );
          case "funnel":
            return (
              <SheetCell key={column} className={cn(selected && "crm-client-row-cell-selected")}>
                <div className="truncate">{client.funnel || "-"}</div>
              </SheetCell>
            );
          case "deposit_amount":
            return (
              <SheetCell key={column} className={cn(selected && "crm-client-row-cell-selected")}>
                <div className="truncate">
                  {client.deposit_amount ? formatCurrency(client.deposit_amount) : "-"}
                </div>
              </SheetCell>
            );
          case "net_deposit":
            return (
              <SheetCell key={column} className={cn(selected && "crm-client-row-cell-selected")}>
                <div className="truncate">
                  {client.net_deposit ? formatCurrency(client.net_deposit) : "-"}
                </div>
              </SheetCell>
            );
          case "user_balance":
            return (
              <SheetCell key={column} className={cn(selected && "crm-client-row-cell-selected")}>
                <div className="truncate">
                  {client.user_balance ? formatCurrency(client.user_balance) : "-"}
                </div>
              </SheetCell>
            );
          case "investment_date":
            return (
              <SheetCell key={column} className={cn(selected && "crm-client-row-cell-selected")}>
                <div className="truncate">{client.investment_date || "-"}</div>
              </SheetCell>
            );
          case "serial":
            return (
              <SheetCell
                key={column}
                className={cn("font-mono text-[13px]", selected && "crm-client-row-cell-selected")}
              >
                <div className="truncate">{client.serial}</div>
              </SheetCell>
            );
          case "attempts":
            return (
              <SheetCell key={column} className={cn(selected && "crm-client-row-cell-selected")}>
                <div>{client.attempts ?? 0}</div>
              </SheetCell>
            );
          case "comments":
            return (
              <SheetCell
                key={column}
                className={cn("items-start py-2.5", selected && "crm-client-row-cell-selected")}
              >
                <div className="w-full min-w-0">
                  <ClientCommentsCell
                    clientId={client.id}
                    lastComment={client.last_comment}
                    lastCommentAt={client.last_comment_at}
                    lastCommentAgent={client.last_comment_agent}
                    commentCount={client.comment_count}
                    agent={client.agent}
                  />
                </div>
              </SheetCell>
            );
          case "created_at":
            return (
              <SheetCell key={column} className={cn(selected && "crm-client-row-cell-selected")}>
                <div className="truncate">{formatDate(client.created_at)}</div>
              </SheetCell>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}

export default memo(
  ClientsTableRow,
  (prevProps, nextProps) =>
    prevProps.client === nextProps.client &&
    prevProps.selected === nextProps.selected &&
    prevProps.gridTemplate === nextProps.gridTemplate &&
    prevProps.visibleColumns === nextProps.visibleColumns &&
    prevProps.privacySettings === nextProps.privacySettings,
);
