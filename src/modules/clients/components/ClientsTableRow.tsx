import type { MouseEvent, ReactNode } from "react";
import ClientCommentsCell from "../../../shared/components/client/ClientCommentsCell";
import {
  cn,
  formatCurrency,
  formatDate,
  getStatusColor,
  getStatusText,
  resolveClientStatus,
} from "../../../lib/utils";
import type { Client } from "../../../shared/types/crm";
import { CLIENTS_GRID_TEMPLATE } from "./clientsTableLayout";

type ClientsTableRowProps = {
  client: Client;
  selected: boolean;
  onSelect: () => void;
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
  onCopy,
}: {
  label: string;
  value?: string | null;
  onCopy: (label: string, value?: string | null) => void;
}) {
  if (!value) {
    return <span className="text-muted">-</span>;
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
      {value}
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

export default function ClientsTableRow({
  client,
  selected,
  onSelect,
  onOpenEdit,
  onCopy,
}: ClientsTableRowProps) {
  const resolvedStatus = resolveClientStatus(client);
  const isHighValue =
    (client.net_deposit ?? 0) >= 500 || (client.deposit_amount ?? 0) >= 500;
  const isManyAttempts = (client.attempts ?? 0) >= 3;
  const company = client.source || client.trading_company || "-";
  const rowAccentClass = isManyAttempts
    ? "before:bg-red-400"
    : isHighValue
      ? "before:bg-blue-400"
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
      onClick={onSelect}
      onDoubleClick={handleRowDoubleClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "group relative grid min-w-max text-left transition-colors hover:bg-slate-50/70",
        "before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1",
        rowAccentClass,
        selected &&
          "bg-brand-50/60 shadow-[inset_0_0_0_1px_rgba(37,99,235,0.18)]",
      )}
      style={{ gridTemplateColumns: CLIENTS_GRID_TEMPLATE }}
      aria-selected={selected}
    >
      <SheetCell className={cn(selected && "bg-brand-50/28")}>
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

      <SheetCell className={cn("font-medium", selected && "bg-brand-50/28")}>
        <div className="truncate">{client.first_name || client.name || "Sin nombre"}</div>
      </SheetCell>

      <SheetCell className={cn(selected && "bg-brand-50/28")}>
        <div className="truncate">{client.last_name || "-"}</div>
      </SheetCell>

      <SheetCell className={cn(selected && "bg-brand-50/28")}>
        <CopyableText label="Email" value={client.email} onCopy={onCopy} />
      </SheetCell>

      <SheetCell className={cn(selected && "bg-brand-50/28")}>
        <CopyableText
          label="Telefono"
          value={client.phone_number}
          onCopy={onCopy}
        />
      </SheetCell>

      <SheetCell className={cn(selected && "bg-brand-50/28")}>
        <div className="truncate">{client.country || "-"}</div>
      </SheetCell>

      <SheetCell className={cn(selected && "bg-brand-50/28")}>
        <div className="truncate" title={company}>
          {company}
        </div>
      </SheetCell>

      <SheetCell className={cn(selected && "bg-brand-50/28")}>
        <div className="truncate">{client.funnel || "-"}</div>
      </SheetCell>

      <SheetCell className={cn(selected && "bg-brand-50/28")}>
        <div className="truncate">
          {client.deposit_amount ? formatCurrency(client.deposit_amount) : "-"}
        </div>
      </SheetCell>

      <SheetCell className={cn(selected && "bg-brand-50/28")}>
        <div className="truncate">
          {client.net_deposit ? formatCurrency(client.net_deposit) : "-"}
        </div>
      </SheetCell>

      <SheetCell className={cn(selected && "bg-brand-50/28")}>
        <div className="truncate">
          {client.user_balance ? formatCurrency(client.user_balance) : "-"}
        </div>
      </SheetCell>

      <SheetCell className={cn(selected && "bg-brand-50/28")}>
        <div className="truncate">{client.investment_date || "-"}</div>
      </SheetCell>

      <SheetCell className={cn("font-mono text-[13px]", selected && "bg-brand-50/28")}>
        <div className="truncate">{client.serial}</div>
      </SheetCell>

      <SheetCell className={cn(selected && "bg-brand-50/28")}>
        <div>{client.attempts ?? 0}</div>
      </SheetCell>

      <SheetCell className={cn("items-start py-2.5", selected && "bg-brand-50/28")}>
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

      <SheetCell className={cn(selected && "bg-brand-50/28")}>
        <div className="truncate">{formatDate(client.created_at)}</div>
      </SheetCell>
    </div>
  );
}
