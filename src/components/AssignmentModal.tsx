// AssignmentModal.tsx - Modal para asignar clientes a un agente usando RPC assign_leads_atomic
// ✅ Campañas reales desde tabla campaigns + conteos reales (total/asignados/disponibles)
// ✅ El input "Cantidad" se limita al máximo disponible según campaña seleccionada

import { useEffect, useMemo, useState } from "react";
import { X, Users, AlertCircle, Tag } from "lucide-react";
import LoadingSpinner from "./LoadingSpinner";
import { supabase, Agent, agentAssignments } from "../lib/supabase";

interface AssignmentModalProps {
  agent: Agent;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type CampaignRow = {
  prefix: string;
  display_name: string | null;
  created_at?: string | null;
};

type CampaignStats = {
  prefix: string;
  display_name: string | null;
  total: number;
  assigned: number;
  available: number;
};

export default function AssignmentModal({
  agent,
  isOpen,
  onClose,
  onSuccess,
}: AssignmentModalProps) {
  const [loading, setLoading] = useState(false);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [error, setError] = useState("");

  // Cantidad a asignar
  const [count, setCount] = useState<number>(50);

  // null => todas
  const [selectedPrefix, setSelectedPrefix] = useState<string | null>(null);

  // campañas reales
  const [campaigns, setCampaigns] = useState<CampaignStats[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    setError("");
    setCount(50);
    setSelectedPrefix(null);

    void loadCampaigns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const loadCampaigns = async () => {
    setLoadingCampaigns(true);
    setError("");

    try {
      // 1) Leer campañas (metadata)
      const { data: campRows, error: campErr } = await supabase
        .from("campaigns")
        .select("prefix, display_name, created_at")
        .order("prefix", { ascending: true });

      if (campErr) throw campErr;

      const list = (campRows || []) as CampaignRow[];

      // 2) Traer stats por prefijo desde clients (min/max/total/asignados)
      // Nota: Supabase JS no hace group-by directo elegante; usamos RPC si existe o hacemos 2 queries.
      // Aquí hacemos 2 queries agregadas en el cliente:

      // 2a) total por prefijo
      const { data: totalsRows, error: totalsErr } = await supabase
        .from("clients")
        .select("serial, assigned_to");

      if (totalsErr) throw totalsErr;

      const totalsMap: Record<
        string,
        { total: number; assigned: number; min: string; max: string }
      > = {};

      for (const r of totalsRows || []) {
        const serial = (r as any).serial as string | null;
        if (!serial) continue;
        const prefix = serial.substring(0, 1);
        if (!totalsMap[prefix]) {
          totalsMap[prefix] = {
            total: 0,
            assigned: 0,
            min: serial,
            max: serial,
          };
        }
        totalsMap[prefix].total += 1;

        const assignedTo = (r as any).assigned_to as string | null;
        if (assignedTo) totalsMap[prefix].assigned += 1;

        if (serial < totalsMap[prefix].min) totalsMap[prefix].min = serial;
        if (serial > totalsMap[prefix].max) totalsMap[prefix].max = serial;
      }

      // 3) Unir campaigns + stats (si existe prefijo en clients pero no en campaigns, lo agregamos)
      const seen = new Set<string>();
      const merged: CampaignStats[] = [];

      for (const c of list) {
        const prefix = c.prefix;
        seen.add(prefix);
        const stats = totalsMap[prefix] || { total: 0, assigned: 0 };
        const total = Number((stats as any).total || 0);
        const assigned = Number((stats as any).assigned || 0);
        merged.push({
          prefix,
          display_name: c.display_name ?? `Campaña ${prefix}`,
          total,
          assigned,
          available: Math.max(0, total - assigned),
        });
      }

      // prefijos que estén en clients pero no en campaigns
      for (const prefix of Object.keys(totalsMap)) {
        if (seen.has(prefix)) continue;
        const stats = totalsMap[prefix];
        merged.push({
          prefix,
          display_name: `Campaña ${prefix}`,
          total: stats.total,
          assigned: stats.assigned,
          available: Math.max(0, stats.total - stats.assigned),
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
    if (!selectedPrefix) return null;
    return campaigns.find((c) => c.prefix === selectedPrefix) ?? null;
  }, [campaigns, selectedPrefix]);

  const maxAllowed = useMemo(() => {
    if (selectedCampaign) return selectedCampaign.available;
    return totalAvailableAll;
  }, [selectedCampaign, totalAvailableAll]);

  // Clamp del input si cambia campaña o disponibilidad
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
        campaign_prefix: selectedPrefix ?? null,
      });

      if (rpcErr) {
        console.error("assignLeadsAtomic error:", rpcErr);
        setError(rpcErr.message || "Error asignando clientes.");
        return;
      }

      onSuccess();
    } catch (e: any) {
      console.error("Error asignando:", e);
      setError(e?.message || "Error inesperado asignando clientes.");
    } finally {
      setLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!isOpen) return null;

  const canAssign = !loading && maxAllowed > 0 && (count ?? 0) > 0;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg w-full max-w-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Users className="w-6 h-6 mr-2 text-blue-600" />
            Asignar Clientes a {agent.name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Info agente */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
            <div className="font-semibold mb-1">Información del Agente</div>
            <div>
              <strong>Nombre:</strong> {agent.name}
            </div>
            <div>
              <strong>Email:</strong> {agent.email}
            </div>
            <div>
              <strong>Rol:</strong> Agente
            </div>
          </div>

          {/* Cantidad */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cantidad de clientes a asignar
            </label>
            <input
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
              className="input-field"
              disabled={loading || maxAllowed <= 0}
            />

            <p className="text-xs text-gray-500 mt-1">
              Máximo asignable ahora:{" "}
              <strong>{maxAllowed.toLocaleString()}</strong>{" "}
              {selectedCampaign
                ? `(Disponibles en ${selectedCampaign.display_name ?? `Campaña ${selectedCampaign.prefix}`})`
                : "(Disponibles en todas las campañas)"}
            </p>
          </div>

          {/* Campaña */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Campaña / Prefijo (opcional)
            </label>

            <div className="relative">
              <Tag className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                value={selectedPrefix ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setSelectedPrefix(v ? v : null);
                }}
                className="input-field pl-9"
                disabled={loading || loadingCampaigns}
              >
                <option value="">Todas las campañas</option>

                {campaigns.map((c) => (
                  <option key={c.prefix} value={c.prefix}>
                    {c.display_name ?? `Campaña ${c.prefix}`} • Disponibles:{" "}
                    {c.available}
                  </option>
                ))}
              </select>
            </div>

            {loadingCampaigns ? (
              <div className="mt-2 text-xs text-gray-500">
                Cargando campañas...
              </div>
            ) : (
              <div className="mt-2 text-xs text-gray-500">
                Tip: si eliges una campaña, solo se asignarán clientes de ese
                prefijo.
              </div>
            )}
          </div>

          {/* Resumen disponibilidad */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-700">
            <div className="flex items-center justify-between">
              <span>Disponibles totales</span>
              <strong>{totalAvailableAll.toLocaleString()}</strong>
            </div>
            {selectedCampaign && (
              <div className="flex items-center justify-between mt-1">
                <span>Disponibles en {selectedCampaign.prefix}</span>
                <strong>{selectedCampaign.available.toLocaleString()}</strong>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="btn-secondary"
            disabled={loading}
          >
            Cancelar
          </button>

          <button
            onClick={handleAssign}
            disabled={!canAssign}
            className="btn-primary flex items-center"
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
              "Asignar Clientes"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
