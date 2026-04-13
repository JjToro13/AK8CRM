// AssignmentModal.tsx - Modal para asignar clientes a un agente usando RPC assign_leads_atomic
// ✅ Portal (no se bloquea por pointer-events-none del modal padre)
// ✅ Overlay + panel premium (mismo estilo)
// ✅ Carga SOLO campañas de la operación actual
// ✅ ESC y click fuera cierran (si no está asignando)
// ✅ Icono Tag alineado

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Users, AlertCircle, Tag } from "lucide-react";
import { cn } from "../../../lib/utils";
import LoadingSpinner from "../../../shared/components/feedback/LoadingSpinner";
import { supabase, Agent, agentAssignments } from "../../../lib/supabase";
import { useAuth } from "../../../hooks/useAuth";
import { notify } from "../../../shared/lib/notify";
import { agentManagement } from "../services/agent-management.service";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
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
  const [error, setError] = useState("");

  const [count, setCount] = useState<number>(50);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignStats[]>([]);

  const ALL_CAMPAIGNS_VALUE = "__ALL__";
  const CAMPAIGN_PLACEHOLDER_VALUE = "__campaign_placeholder__";

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

    void loadCampaigns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, effectiveOperationId]);

  const loadCampaigns = async () => {
    setLoadingCampaigns(true);
    setError("");

    try {
      if (!effectiveOperationId) {
        setCampaigns([]);
        setError("No hay una operación seleccionada.");
        return;
      }

      const campaignsQuery = supabase
        .from("campaigns")
        .select("id, prefix, display_name, created_at, operation_id")
        .eq("operation_id", effectiveOperationId)
        .order("prefix", { ascending: true });

      const { data: campRows, error: campErr } = await campaignsQuery;
      if (campErr) throw campErr;

      const list = (campRows || []) as CampaignRow[];
      const {
        data: availableRows,
        error: availableErr,
      } = await agentManagement.getAvailableCampaigns([effectiveOperationId]);
      if (availableErr) throw availableErr;

      const availableByCampaignId = new Map(
        (availableRows || []).map((row) => [row.id, Number(row.available || 0)]),
      );

      const seen = new Set<string>();
      const merged: CampaignStats[] = [];

      for (const c of list) {
        const campaignId = c.id;
        const prefix = c.prefix;
        seen.add(campaignId);

        merged.push({
          id: campaignId,
          prefix,
          display_name: (c.display_name?.trim() ||
            `Campaña ${prefix}`) as string,
          available: Math.max(0, Number(availableByCampaignId.get(campaignId) || 0)),
        });
      }

      for (const row of availableRows || []) {
        if (seen.has(row.id)) continue;

        merged.push({
          id: row.id,
          prefix: row.prefix,
          display_name: row.display_name?.trim() || `Campaña ${row.prefix}`,
          available: Math.max(0, Number(row.available || 0)),
        });
      }

      merged.sort((a, b) => a.prefix.localeCompare(b.prefix));
      setCampaigns(merged);
    } catch (e: any) {
      console.error("[AssignmentModal] loadCampaigns error:", e);
      setError(e?.message || "Error cargando campañas");
      setCampaigns([]);
    } finally {
      setLoadingCampaigns(false);
    }
  };

  const totalAvailableAll = useMemo(
    () => campaigns.reduce((acc, c) => acc + (c.available || 0), 0),
    [campaigns],
  );

  const selectedCampaign = useMemo(() => {
    if (!selectedCampaignId) return null;
    return campaigns.find((c) => c.id === selectedCampaignId) ?? null;
  }, [campaigns, selectedCampaignId]);

  const campaignSelectValue = selectedCampaignId ?? ALL_CAMPAIGNS_VALUE;

  const maxAllowed = useMemo(() => {
    if (selectedCampaign) return selectedCampaign.available;
    return totalAvailableAll;
  }, [selectedCampaign, totalAvailableAll]);

  useEffect(() => {
    if (!isOpen) return;

    if (maxAllowed <= 0) {
      setCount(0);
      return;
    }

    setCount((prev) => Math.min(Math.max(1, prev || 1), maxAllowed));
  }, [maxAllowed, isOpen]);

  const handleAssign = async () => {
    setError("");

    if (!effectiveOperationId) {
      setError("No hay una operación seleccionada.");
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

      const { error: rpcErr } = await agentAssignments.assignLeadsAtomic({
        agent_id: agent.id,
        count: safeCount,
        assigned_by: adminId,
        campaign_id: selectedCampaignId ?? null,
        campaign_prefix: selectedCampaign?.prefix ?? null,
      });

      if (rpcErr) {
        console.error("assignLeadsAtomic error:", rpcErr);
        setError(rpcErr.message || "Error asignando clientes.");
        return;
      }

      notify.success(
        "Clientes asignados",
        `Se asignaron ${safeCount} cliente${safeCount === 1 ? "" : "s"} a ${agent.name}.`,
      );
      onSuccess();
    } catch (e: any) {
      console.error("Error asignando:", e);
      setError(e?.message || "Error inesperado asignando clientes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose, loading]);

  if (!isOpen) return null;

  const canAssign =
    !loading && !!effectiveOperationId && maxAllowed > 0 && (count ?? 0) > 0;

  return createPortal(
    <AnimatePresence mode="wait">
      <motion.div
        className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto overscroll-y-contain p-3 sm:items-center sm:p-6"
        variants={overlayV}
        initial="initial"
        animate="animate"
        exit="exit"
        onMouseDown={(e) => {
          if (loading) return;
          if (e.target === e.currentTarget) onClose();
        }}
        role="dialog"
        aria-modal="true"
      >
        <div className="absolute inset-0 bg-[rgba(15,23,42,0.42)] backdrop-blur-sm" />

        <motion.div
          className={cn(
            agentModalPanelClass,
            "my-auto flex max-h-[min(92vh,880px)] w-full max-w-2xl flex-col",
          )}
          variants={panelV}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <ModalHeader
            icon={<Users className="w-5 h-5 text-brand" />}
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
            {error && (
              <div className="rounded-[1.2rem] border border-red-200/90 bg-[linear-gradient(180deg,rgba(254,242,242,0.92),rgba(255,255,255,0.78))] px-4 py-3 text-sm text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5" />
                <span className="font-semibold">{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                    onChange={(e) => {
                      const v = Number(e.target.value || 0);
                      if (!Number.isFinite(v)) return;

                      if (maxAllowed <= 0) {
                        setCount(0);
                        return;
                      }
                      setCount(Math.min(Math.max(1, v), maxAllowed));
                    }}
                    disabled={loading || maxAllowed <= 0}
                  />

                  <p className="mt-2 text-xs text-muted">
                    Máximo asignable ahora:{" "}
                    <span className="font-semibold text-ink/70">
                      {maxAllowed.toLocaleString()}
                    </span>{" "}
                    {selectedCampaign
                      ? `(solo ${
                          selectedCampaign.display_name ??
                          `Campaña ${selectedCampaign.prefix}`
                        })`
                      : "(todas las campañas de la operación actual)"}
                  </p>
                </div>
              </div>

              <div className={cn(agentInsetClass, "p-5")}>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-ink/80">
                    Campaña (opcional)
                  </div>
                  {loadingCampaigns ? (
                    <span className="text-xs text-muted">Cargando…</span>
                  ) : null}
                </div>

                <div className="mt-3">
                  <Select
                    value={campaignSelectValue}
                    onValueChange={(v) => {
                      if (v === CAMPAIGN_PLACEHOLDER_VALUE) return;
                      if (v === ALL_CAMPAIGNS_VALUE) setSelectedCampaignId(null);
                      else setSelectedCampaignId(v);
                    }}
                    disabled={loading || loadingCampaigns || !effectiveOperationId}
                  >
                    <SelectTrigger leftIcon={<Tag className="h-4 w-4" />}>
                      <SelectValue placeholder="Todas las campañas" />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value={CAMPAIGN_PLACEHOLDER_VALUE} disabled>
                        Todas las campañas
                      </SelectItem>
                      <SelectItem value={ALL_CAMPAIGNS_VALUE}>
                        Todas las campañas
                      </SelectItem>

                      {campaigns.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {(c.display_name ?? `Campaña ${c.prefix}`) +
                            ` · Disponibles: ${c.available}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <p className="mt-2 text-xs text-muted">
                    Si eliges una campaña, solo se asignarán clientes de ese
                    prefijo dentro de la operación actual.
                  </p>
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

              {selectedCampaign && (
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-muted">
                    Disponibles en{" "}
                    <span className="font-semibold">
                      {selectedCampaign.prefix}
                    </span>
                  </span>
                  <span className="font-semibold text-ink">
                    {selectedCampaign.available.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </ModalBody>

          <ModalFooter className={cn("justify-end gap-2 max-sm:flex-wrap", agentModalFooterClass)}>
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
