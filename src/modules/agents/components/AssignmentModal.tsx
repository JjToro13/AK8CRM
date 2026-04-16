import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Tag, Users } from "lucide-react";
import {
  CLIENT_STATUS_OPTIONS,
  cn,
  type ClientStatusCode,
} from "../../../lib/utils";
import LoadingSpinner from "../../../shared/components/feedback/LoadingSpinner";
import { supabase, Agent, agentAssignments } from "../../../lib/supabase";
import { useAuth } from "../../../hooks/useAuth";
import { notify } from "../../../shared/lib/notify";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../shared/components/ui/Select";
import Input from "../../../shared/components/ui/Input";
import {
  ModalBody,
  ModalFooter,
  ModalHeader,
  modalPrimaryActionClassName,
  modalSecondaryActionClassName,
} from "../../../shared/components/layout/ModalLayout";
import {
  CLIENT_BALANCE_RANGE_OPTIONS,
  getClientBalanceRangeBounds,
  getClientBalanceRangeLabel,
  type ClientBalanceRangeFilter,
} from "../../clients/lib/clientFilters";
import { applyClientListFilters } from "../../clients/services/clients.service";
import { agentManagement } from "../services/agent-management.service";
import {
  agentInsetClass,
  agentModalFooterClass,
  agentModalHeaderClass,
  agentModalPanelClass,
} from "./agentUi";

interface AssignmentModalProps {
  agent: Agent;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedOperationId?: string | null;
}

type CampaignRow = {
  id: string;
  prefix: string;
  display_name: string | null;
  created_at?: string | null;
  operation_id?: string | null;
};

type CampaignStats = {
  id: string;
  prefix: string;
  display_name: string | null;
  available: number;
};

type AssignmentStatusFilter = "all" | ClientStatusCode;

const ALL_CAMPAIGNS_VALUE = "__ALL__";
const CAMPAIGN_PLACEHOLDER_VALUE = "__campaign_placeholder__";
const STATUS_PLACEHOLDER_VALUE = "__status_placeholder__";

const overlayV = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.18 } },
  exit: { opacity: 0, transition: { duration: 0.18 } },
} as const;

const panelV = {
  initial: { opacity: 0, y: 16, scale: 0.985, filter: "blur(10px)" },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: { type: "spring", stiffness: 240, damping: 22 },
  },
  exit: {
    opacity: 0,
    y: 10,
    scale: 0.99,
    filter: "blur(10px)",
    transition: { duration: 0.18 },
  },
} as const;

export default function AssignmentModal({
  agent,
  isOpen,
  onClose,
  onSuccess,
  selectedOperationId,
}: AssignmentModalProps) {
  const {
    canSeeAllOperations,
    operationId: authOperationId,
    activeOperationId: authActiveOperationId,
  } = useAuth();

  const effectiveOperationId = useMemo(() => {
    if (selectedOperationId) return selectedOperationId;
    if (canSeeAllOperations) return authActiveOperationId ?? null;
    return authOperationId ?? null;
  }, [
    selectedOperationId,
    canSeeAllOperations,
    authActiveOperationId,
    authOperationId,
  ]);

  const [loading, setLoading] = useState(false);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [loadingAssignableCount, setLoadingAssignableCount] = useState(false);
  const [error, setError] = useState("");
  const [count, setCount] = useState<number>(50);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(
    null,
  );
  const [campaigns, setCampaigns] = useState<CampaignStats[]>([]);
  const [statusFilter, setStatusFilter] =
    useState<AssignmentStatusFilter>("all");
  const [countryFilter, setCountryFilter] = useState("");
  const [balanceRangeFilter, setBalanceRangeFilter] =
    useState<ClientBalanceRangeFilter>("all");
  const [assignableCount, setAssignableCount] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    window.dispatchEvent(
      new CustomEvent("am:submodal", { detail: { open: true } }),
    );
    return () => {
      window.dispatchEvent(
        new CustomEvent("am:submodal", { detail: { open: false } }),
      );
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    setError("");
    setCount(50);
    setSelectedCampaignId(null);
    setCampaigns([]);
    setStatusFilter("all");
    setCountryFilter("");
    setBalanceRangeFilter("all");
    setAssignableCount(0);

    void loadCampaigns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, effectiveOperationId]);

  const loadCampaigns = async () => {
    setLoadingCampaigns(true);
    setError("");

    try {
      if (!effectiveOperationId) {
        setCampaigns([]);
        setError("No hay una operacion seleccionada.");
        return;
      }

      const { data: campRows, error: campErr } = await supabase
        .from("campaigns")
        .select("id, prefix, display_name, created_at, operation_id")
        .eq("operation_id", effectiveOperationId)
        .order("prefix", { ascending: true });

      if (campErr) throw campErr;

      const list = (campRows ?? []) as CampaignRow[];
      const {
        data: availableRows,
        error: availableErr,
      } = await agentManagement.getAvailableCampaigns([effectiveOperationId]);

      if (availableErr) throw availableErr;

      const availableByCampaignId = new Map(
        (availableRows ?? []).map((row) => [row.id, Number(row.available || 0)]),
      );

      const seen = new Set<string>();
      const merged: CampaignStats[] = [];

      for (const campaign of list) {
        seen.add(campaign.id);
        merged.push({
          id: campaign.id,
          prefix: campaign.prefix,
          display_name:
            campaign.display_name?.trim() || `Campana ${campaign.prefix}`,
          available: Math.max(
            0,
            Number(availableByCampaignId.get(campaign.id) || 0),
          ),
        });
      }

      for (const row of availableRows ?? []) {
        if (seen.has(row.id)) continue;

        merged.push({
          id: row.id,
          prefix: row.prefix,
          display_name: row.display_name?.trim() || `Campana ${row.prefix}`,
          available: Math.max(0, Number(row.available || 0)),
        });
      }

      merged.sort((left, right) => left.prefix.localeCompare(right.prefix));
      setCampaigns(merged);
    } catch (loadError: any) {
      console.error("[AssignmentModal] loadCampaigns error:", loadError);
      setError(loadError?.message || "Error cargando campanas");
      setCampaigns([]);
    } finally {
      setLoadingCampaigns(false);
    }
  };

  const totalAvailableAll = useMemo(
    () => campaigns.reduce((acc, campaign) => acc + (campaign.available || 0), 0),
    [campaigns],
  );

  const selectedCampaign = useMemo(() => {
    if (!selectedCampaignId) return null;
    return campaigns.find((campaign) => campaign.id === selectedCampaignId) ?? null;
  }, [campaigns, selectedCampaignId]);

  const campaignSelectValue = selectedCampaignId ?? ALL_CAMPAIGNS_VALUE;
  const trimmedCountryFilter = countryFilter.trim();
  const hasActiveExtraFilters =
    statusFilter !== "all" ||
    trimmedCountryFilter.length > 0 ||
    balanceRangeFilter !== "all";

  useEffect(() => {
    if (!isOpen) return;

    const loadAssignableCount = async () => {
      if (!effectiveOperationId) {
        setAssignableCount(0);
        return;
      }

      setLoadingAssignableCount(true);
      setError("");

      try {
        let request = supabase
          .from("clients")
          .select("id", { count: "exact", head: true })
          .is("assigned_to", null)
          .or("status.eq.new,status.is.null");

        request = applyClientListFilters(request, {
          operationId: effectiveOperationId,
          campaignId: selectedCampaignId,
          statusCode: statusFilter === "all" ? null : statusFilter,
          country: trimmedCountryFilter || null,
          balanceRange:
            balanceRangeFilter === "all" ? null : balanceRangeFilter,
        });

        const { count: nextCount, error: countError } = await request;

        if (countError) throw countError;

        setAssignableCount(Number(nextCount ?? 0));
      } catch (countError: any) {
        console.error("[AssignmentModal] loadAssignableCount error:", countError);
        setError(
          countError?.message || "No se pudo calcular la cantidad asignable.",
        );
        setAssignableCount(0);
      } finally {
        setLoadingAssignableCount(false);
      }
    };

    void loadAssignableCount();
  }, [
    balanceRangeFilter,
    effectiveOperationId,
    isOpen,
    selectedCampaignId,
    statusFilter,
    trimmedCountryFilter,
  ]);

  const maxAllowed = assignableCount;

  useEffect(() => {
    if (!isOpen) return;

    if (maxAllowed <= 0) {
      setCount(0);
      return;
    }

    setCount((prev) => Math.min(Math.max(1, prev || 1), maxAllowed));
  }, [isOpen, maxAllowed]);

  const handleAssign = async () => {
    setError("");

    if (!effectiveOperationId) {
      setError("No hay una operacion seleccionada.");
      return;
    }

    if (maxAllowed <= 0) {
      setError("No hay clientes disponibles para asignar.");
      return;
    }

    const safeCount = Math.min(Math.max(1, Number(count || 0)), maxAllowed);
    if (!safeCount || safeCount <= 0) {
      setError("La cantidad debe ser mayor a 0.");
      return;
    }

    setLoading(true);

    try {
      const { data: currentUser } = await supabase.auth.getUser();
      const adminId = currentUser?.user?.id;

      if (!adminId) {
        setError("No se pudo obtener el usuario administrador.");
        return;
      }

      const assignmentRequest = {
        agent_id: agent.id,
        count: safeCount,
        assigned_by: adminId,
        campaign_id: selectedCampaignId ?? null,
        campaign_prefix: selectedCampaign?.prefix ?? null,
      };

      const balanceBounds = getClientBalanceRangeBounds(balanceRangeFilter);
      const { error: rpcErr } = hasActiveExtraFilters
        ? await agentAssignments.assignLeadsFiltered({
            ...assignmentRequest,
            status_codes: statusFilter === "all" ? null : [statusFilter],
            country: trimmedCountryFilter || null,
            balance_min: balanceBounds.min,
            balance_max: balanceBounds.max,
          })
        : await agentAssignments.assignLeadsAtomic(assignmentRequest);

      if (rpcErr) {
        console.error("[AssignmentModal] assign error:", rpcErr);
        setError(rpcErr.message || "Error asignando clientes.");
        return;
      }

      notify.success(
        "Clientes asignados",
        `Se asignaron ${safeCount} cliente${safeCount === 1 ? "" : "s"} a ${agent.name}.`,
      );
      onSuccess();
    } catch (assignError: any) {
      console.error("[AssignmentModal] unexpected assign error:", assignError);
      setError(assignError?.message || "Error inesperado asignando clientes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) onClose();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const canAssign =
    !loading &&
    !loadingAssignableCount &&
    !!effectiveOperationId &&
    maxAllowed > 0 &&
    (count ?? 0) > 0;

  return createPortal(
    <AnimatePresence mode="wait">
      <motion.div
        className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto overscroll-y-contain p-3 sm:items-center sm:p-6"
        variants={overlayV}
        initial="initial"
        animate="animate"
        exit="exit"
        onMouseDown={(event) => {
          if (loading) return;
          if (event.target === event.currentTarget) onClose();
        }}
        role="dialog"
        aria-modal="true"
      >
        <div className="absolute inset-0 bg-[rgba(15,23,42,0.42)] backdrop-blur-sm" />

        <motion.div
          className={cn(
            agentModalPanelClass,
            "my-auto flex max-h-[min(92vh,920px)] w-full max-w-3xl flex-col",
          )}
          variants={panelV}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <ModalHeader
            icon={<Users className="h-5 w-5 text-brand" />}
            title="Asignar clientes"
            description={
              <>
                Para: <span className="font-semibold text-ink/80">{agent.name}</span>
                {agent.email ? (
                  <>
                    {" "}
                    - <span className="font-mono">{agent.email}</span>
                  </>
                ) : null}
              </>
            }
            onClose={() => !loading && onClose()}
            closeDisabled={loading}
            className={agentModalHeaderClass}
          />

          <ModalBody className="crm-scrollbar crm-scrollbar-shell min-h-0 space-y-5 overflow-y-auto overscroll-contain">
            {error ? (
              <div className="flex items-start gap-2 rounded-[1.2rem] border border-red-200/90 bg-[linear-gradient(180deg,rgba(254,242,242,0.92),rgba(255,255,255,0.78))] px-4 py-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4" />
                <span className="font-semibold">{error}</span>
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className={cn(agentInsetClass, "p-5")}>
                <div className="text-sm font-semibold text-ink/80">
                  Cantidad a asignar
                </div>

                <div className="mt-3">
                  <Input
                    type="number"
                    min={maxAllowed > 0 ? 1 : 0}
                    max={maxAllowed > 0 ? maxAllowed : 0}
                    value={count}
                    onChange={(event) => {
                      const nextValue = Number(event.target.value || 0);
                      if (!Number.isFinite(nextValue)) return;

                      if (maxAllowed <= 0) {
                        setCount(0);
                        return;
                      }

                      setCount(Math.min(Math.max(1, nextValue), maxAllowed));
                    }}
                    disabled={loading || loadingAssignableCount || maxAllowed <= 0}
                  />

                  <p className="mt-2 text-xs text-muted">
                    Coincidencias asignables ahora:{" "}
                    <span className="font-semibold text-ink/70">
                      {loadingAssignableCount
                        ? "Calculando..."
                        : maxAllowed.toLocaleString()}
                    </span>{" "}
                    {selectedCampaign
                      ? `(campana ${
                          selectedCampaign.display_name ??
                          `Campana ${selectedCampaign.prefix}`
                        })`
                      : "(toda la operacion actual)"}
                  </p>
                </div>
              </div>

              <div className={cn(agentInsetClass, "p-5")}>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-ink/80">
                    Campana (opcional)
                  </div>
                  {loadingCampaigns ? (
                    <span className="text-xs text-muted">Cargando...</span>
                  ) : null}
                </div>

                <div className="mt-3">
                  <Select
                    value={campaignSelectValue}
                    onValueChange={(value) => {
                      if (value === CAMPAIGN_PLACEHOLDER_VALUE) return;
                      if (value === ALL_CAMPAIGNS_VALUE) setSelectedCampaignId(null);
                      else setSelectedCampaignId(value);
                    }}
                    disabled={loading || loadingCampaigns || !effectiveOperationId}
                  >
                    <SelectTrigger leftIcon={<Tag className="h-4 w-4" />}>
                      <SelectValue placeholder="Todas las campanas" />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value={CAMPAIGN_PLACEHOLDER_VALUE} disabled>
                        Todas las campanas
                      </SelectItem>
                      <SelectItem value={ALL_CAMPAIGNS_VALUE}>
                        Todas las campanas
                      </SelectItem>

                      {campaigns.map((campaign) => (
                        <SelectItem key={campaign.id} value={campaign.id}>
                          {(campaign.display_name ?? `Campana ${campaign.prefix}`) +
                            ` · Disponibles: ${campaign.available}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <p className="mt-2 text-xs text-muted">
                    Si eliges una campana, solo se revisara esa base dentro de la
                    operacion actual.
                  </p>
                </div>
              </div>
            </div>

            <div className={cn(agentInsetClass, "p-5")}>
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-ink/80">
                    Filtros de asignacion
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    Estos filtros se aplican solo al lote que se va a repartir.
                  </p>
                </div>

                {hasActiveExtraFilters ? (
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter("all");
                      setCountryFilter("");
                      setBalanceRangeFilter("all");
                    }}
                    disabled={loading}
                    className={modalSecondaryActionClassName}
                  >
                    Restablecer
                  </button>
                ) : null}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                    Estatus
                  </div>
                  <Select
                    value={statusFilter}
                    onValueChange={(value) => {
                      if (value === STATUS_PLACEHOLDER_VALUE) return;
                      setStatusFilter(value as AssignmentStatusFilter);
                    }}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos los estatus" />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value={STATUS_PLACEHOLDER_VALUE} disabled>
                        Todos los estatus
                      </SelectItem>
                      <SelectItem value="all">Todos los estatus</SelectItem>
                      {CLIENT_STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status.code} value={status.code}>
                          {status.shortLabel} · {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                    Pais
                  </div>
                  <Input
                    type="text"
                    value={countryFilter}
                    onChange={(event) => setCountryFilter(event.target.value)}
                    placeholder="Ej. Colombia"
                    disabled={loading}
                  />
                </div>

                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                    Saldo
                  </div>
                  <Select
                    value={balanceRangeFilter}
                    onValueChange={(value) =>
                      setBalanceRangeFilter(value as ClientBalanceRangeFilter)
                    }
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos los saldos" />
                    </SelectTrigger>

                    <SelectContent>
                      {CLIENT_BALANCE_RANGE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className={cn(agentInsetClass, "px-5 py-4")}>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">Disponibles totales</span>
                <span className="font-semibold text-ink">
                  {totalAvailableAll.toLocaleString()}
                </span>
              </div>

              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-muted">Coincidencias para asignar</span>
                <span className="font-semibold text-ink">
                  {loadingAssignableCount
                    ? "Calculando..."
                    : maxAllowed.toLocaleString()}
                </span>
              </div>

              {selectedCampaign ? (
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-muted">
                    Disponibles en <span className="font-semibold">{selectedCampaign.prefix}</span>
                  </span>
                  <span className="font-semibold text-ink">
                    {selectedCampaign.available.toLocaleString()}
                  </span>
                </div>
              ) : null}

              {hasActiveExtraFilters ? (
                <div className="mt-2 flex items-center justify-between gap-4 text-sm">
                  <span className="text-muted">Filtros activos</span>
                  <span className="text-right font-semibold text-ink">
                    {[
                      statusFilter !== "all"
                        ? CLIENT_STATUS_OPTIONS.find(
                            (option) => option.code === statusFilter,
                          )?.label ?? statusFilter
                        : null,
                      trimmedCountryFilter ? `Pais: ${trimmedCountryFilter}` : null,
                      balanceRangeFilter !== "all"
                        ? getClientBalanceRangeLabel(balanceRangeFilter)
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </div>
              ) : null}
            </div>
          </ModalBody>

          <ModalFooter
            className={cn("justify-end gap-2 max-sm:flex-wrap", agentModalFooterClass)}
          >
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
              onClick={handleAssign}
              disabled={!canAssign}
              className={modalPrimaryActionClassName}
              title={
                maxAllowed <= 0
                  ? "No hay clientes disponibles para asignar"
                  : "Asignar clientes"
              }
            >
              {loading ? (
                <LoadingSpinner
                  size="sm"
                  text="Asignando..."
                  fullScreen={false}
                />
              ) : (
                "Asignar clientes"
              )}
            </button>
          </ModalFooter>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
