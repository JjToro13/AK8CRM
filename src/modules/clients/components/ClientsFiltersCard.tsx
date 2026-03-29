import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  LockKeyholeIcon,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import {
  CLIENT_STATUS_OPTIONS,
  cn,
  type ClientStatusCode,
} from "../../../lib/utils";
import {
  clientGhostButtonClass,
  clientInsetClass,
  clientMutedPillClass,
} from "../../../shared/components/client/clientUi";
import Input from "../../../shared/components/ui/Input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../shared/components/ui/Select";

type ClientsFiltersCardProps = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  statusFilter: "all" | ClientStatusCode;
  onStatusFilterChange: (value: "all" | ClientStatusCode) => void;
  campaignFilter: "all" | string;
  onCampaignFilterChange: (value: "all" | string) => void;
  campaignOptions: Array<{ id: string; label: string }>;
  assignedAgentFilter: "all" | string;
  onAssignedAgentFilterChange: (value: "all" | string) => void;
  agentOptions: Array<{ id: string; name: string }>;
  activeFilterSummary: string[];
  isAdmin: boolean;
  rowsPerPage: number;
  onRowsPerPageChange: (value: number) => void;
  opLocked: boolean;
};

const compactTriggerClassName =
  "w-full min-w-0 rounded-full border-white/0 bg-white/68 px-4 py-2.5 text-sm shadow-none backdrop-blur-xl";

export default function ClientsFiltersCard({
  searchQuery,
  onSearchChange,
  onClearSearch,
  statusFilter,
  onStatusFilterChange,
  campaignFilter,
  onCampaignFilterChange,
  campaignOptions,
  assignedAgentFilter,
  onAssignedAgentFilterChange,
  agentOptions,
  activeFilterSummary,
  isAdmin,
  rowsPerPage,
  onRowsPerPageChange,
  opLocked,
}: ClientsFiltersCardProps) {
  const [isHoverOpen, setIsHoverOpen] = useState(false);
  const [isPinnedOpen, setIsPinnedOpen] = useState(false);
  const closeTimerRef = useRef<number | null>(null);
  const filterAnchorRef = useRef<HTMLDivElement | null>(null);

  const isSearchActive = searchQuery.trim().length > 0;
  const hasActiveFilters = useMemo(() => {
    return (
      statusFilter !== "all" ||
      campaignFilter !== "all" ||
      (isAdmin && assignedAgentFilter !== "all")
    );
  }, [assignedAgentFilter, campaignFilter, isAdmin, statusFilter]);
  const isTrayOpen = isHoverOpen || isPinnedOpen;
  const filterSummaryText =
    activeFilterSummary.length > 0
      ? activeFilterSummary.length <= 3
        ? activeFilterSummary.join(" · ")
        : `${activeFilterSummary.slice(0, 3).join(" · ")} · +${activeFilterSummary.length - 3}`
      : "Sin filtros activos";

  const clearCloseTimer = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const openTray = () => {
    clearCloseTimer();
    setIsHoverOpen(true);
  };

  const scheduleClose = () => {
    clearCloseTimer();

    if (isPinnedOpen) return;

    closeTimerRef.current = window.setTimeout(() => {
      setIsHoverOpen(false);
    }, 160);
  };

  useEffect(() => {
    if (!isTrayOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;

      if (!target) return;
      if (filterAnchorRef.current?.contains(target)) return;
      if (target.closest(".clients-filter-select-content")) return;

      setIsHoverOpen(false);
      setIsPinnedOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isTrayOpen]);

  useEffect(() => {
    return () => {
      clearCloseTimer();
    };
  }, []);

  return (
    <section className="mb-5 border-b border-white/55 pb-5">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="w-full xl:max-w-[22rem]">
            <Input
              type="text"
              placeholder="Buscar clientes..."
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              leftIcon={<Search className="h-5 w-5" />}
              rightSlot={
                isSearchActive ? (
                  <button
                    type="button"
                    onClick={onClearSearch}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/80 bg-white/76 text-muted shadow-[0_12px_24px_rgba(15,23,42,0.06)] transition hover:bg-white hover:text-ink"
                    aria-label="Limpiar búsqueda"
                    title="Limpiar búsqueda"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null
              }
              disabled={opLocked}
              className="rounded-full border-white/0 bg-white/72 py-2.5 shadow-[0_14px_32px_rgba(15,23,42,0.06)] backdrop-blur-xl"
              containerClassName="w-full"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 xl:justify-end">
            <div className={clientMutedPillClass}>
              {isAdmin ? (
                <span className="inline-flex items-center">
                  <LockKeyholeIcon className="mr-1 h-4 w-4 text-emerald-600" />
                  información visible (Administrador)
                </span>
              ) : (
                <span className="inline-flex items-center">
                  <LockKeyholeIcon className="mr-1 h-4 w-4 text-orange-600" />
                  información visible (Temporal para Agentes)
                </span>
              )}
            </div>

            <div className={clientMutedPillClass}>
              <span>Mostrar</span>
              <Select
                value={String(rowsPerPage)}
                onValueChange={(value) => onRowsPerPageChange(Number(value))}
                disabled={opLocked}
              >
                <SelectTrigger className="min-w-[88px] rounded-full border-0 bg-transparent px-2 py-0 shadow-none hover:border-transparent focus-visible:border-transparent focus-visible:ring-0">
                  <SelectValue placeholder="15" />
                </SelectTrigger>

                <SelectContent className="clients-filter-select-content">
                  <SelectItem value="15">15</SelectItem>
                  <SelectItem value="30">30</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div
            ref={filterAnchorRef}
            className="relative"
            onMouseEnter={openTray}
            onMouseLeave={scheduleClose}
          >
            <button
              type="button"
              onClick={() => {
                clearCloseTimer();
                setIsPinnedOpen((current) => !current);
                setIsHoverOpen(true);
              }}
              className={cn(
                "inline-flex max-w-[32rem] items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition shadow-[0_14px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl",
                hasActiveFilters
                  ? "border-brand/20 bg-brand/[0.08] text-brand"
                  : "border-white/78 bg-white/70 text-muted hover:border-brand/15 hover:bg-white/86",
              )}
              aria-expanded={isTrayOpen}
              aria-haspopup="dialog"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{filterSummaryText}</span>
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 shrink-0 transition-transform",
                  isTrayOpen && "rotate-180",
                )}
              />
            </button>

            <div
              className={cn(
                "absolute left-0 top-full z-40 mt-3 w-[46rem] max-w-[calc(100vw-4rem)]",
                "rounded-[1.45rem] border border-white/84 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(255,255,255,0.8))] p-4 shadow-[0_28px_70px_rgba(15,23,42,0.16),inset_0_1px_0_rgba(255,255,255,0.86)] backdrop-blur-2xl",
                "transition duration-150 ease-out",
                isTrayOpen
                  ? "pointer-events-auto translate-y-0 opacity-100"
                  : "pointer-events-none -translate-y-1 opacity-0",
              )}
              onMouseDownCapture={() => setIsPinnedOpen(true)}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
                    Filtros
                  </div>
                  <div className="mt-1 text-sm text-ink/80">
                    Elige solo los filtros que quieras activar.
                  </div>
                </div>

                {hasActiveFilters ? (
                  <button
                    type="button"
                    onClick={() => {
                      onStatusFilterChange("all");
                      onCampaignFilterChange("all");
                      if (isAdmin) onAssignedAgentFilterChange("all");
                    }}
                    className={cn(clientGhostButtonClass, "px-3 py-1.5 text-xs")}
                  >
                    Restablecer
                  </button>
                ) : null}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className={cn(clientInsetClass, "p-3")}>
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
                    Tipificación
                  </div>
                  <Select
                    value={statusFilter}
                    onValueChange={(value) =>
                      onStatusFilterChange(value as "all" | ClientStatusCode)
                    }
                    disabled={opLocked}
                  >
                    <SelectTrigger className={compactTriggerClassName}>
                      <SelectValue placeholder="Todas las tipificaciones" />
                    </SelectTrigger>

                    <SelectContent className="clients-filter-select-content">
                      <SelectItem value="all">Todas las tipificaciones</SelectItem>
                      {CLIENT_STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status.code} value={status.code}>
                          <span className="inline-flex items-center gap-2">
                            <span
                              className={cn(
                                "h-2.5 w-2.5 shrink-0 rounded-full",
                                status.dotClass,
                              )}
                            />
                            <span>
                              {status.shortLabel} · {status.label}
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className={cn(clientInsetClass, "p-3")}>
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
                    Campaña
                  </div>
                  <Select
                    value={campaignFilter}
                    onValueChange={(value) => onCampaignFilterChange(value)}
                    disabled={opLocked}
                  >
                    <SelectTrigger className={compactTriggerClassName}>
                      <SelectValue placeholder="Todas las campañas" />
                    </SelectTrigger>

                    <SelectContent className="clients-filter-select-content">
                      <SelectItem value="all">Todas las campañas</SelectItem>
                      {campaignOptions.map((campaign) => (
                        <SelectItem key={campaign.id} value={campaign.id}>
                          {campaign.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {isAdmin ? (
                  <div className={cn(clientInsetClass, "p-3 md:col-span-2")}>
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
                      Agente
                    </div>
                    <Select
                      value={assignedAgentFilter}
                      onValueChange={(value) => onAssignedAgentFilterChange(value)}
                      disabled={opLocked}
                    >
                      <SelectTrigger className={compactTriggerClassName}>
                        <SelectValue placeholder="Todos los agentes" />
                      </SelectTrigger>

                      <SelectContent className="clients-filter-select-content">
                        <SelectItem value="all">Todos los agentes</SelectItem>
                        {agentOptions.map((agent) => (
                          <SelectItem key={agent.id} value={agent.id}>
                            {agent.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
