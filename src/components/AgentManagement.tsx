// AgentManagement.tsx - Componente principal para gestionar agentes, ver sus clientes asignados y asignar nuevos clientes.

import { useState, useEffect, useMemo } from "react";
import { Plus, Eye, AlertCircle } from "lucide-react";
import { supabase, agents, Agent } from "../lib/supabase";
import LoadingSpinner from "./LoadingSpinner";
import AssignmentModal from "./AssignmentModal";
import AgentDetailsModal from "./AgentDetailsModal";
import CampaignBadge from "./CampaignBadge";

interface AgentManagementProps {
  compact?: boolean;
}

type AgentCountRow = { agent_id: string; assigned_count: number };
type CampaignRow = { campaign: string; available: number };

export default function AgentManagement({
  
}: AgentManagementProps) {
  const [agentsList, setAgentsList] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [showAgentDetails, setShowAgentDetails] = useState(false);
  const [error, setError] = useState("");
  const [campaignNames, setCampaignNames] = useState<Record<string, string>>(
    {},
  );

  // ✅ NUEVO: counts por agente (clientes asignados)
  const [assignedCounts, setAssignedCounts] = useState<Record<string, number>>(
    {},
  );

  // ✅ NUEVO: campañas con clientes disponibles (unassigned)
  const [availableCampaigns, setAvailableCampaigns] = useState<CampaignRow[]>(
    [],
  );

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalAvailable = useMemo(
    () => availableCampaigns.reduce((acc, c) => acc + (c.available || 0), 0),
    [availableCampaigns],
  );

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      // 1) Agentes
      const { data: agentsData, error: agentsError } = await agents.getAll();
      if (agentsError) {
        console.error("Error cargando agentes:", agentsError);
        setError("Error cargando agentes");
        return;
      }

      const agentsOnly = (agentsData || []).filter((a) => a.role === "agent");
      setAgentsList(agentsOnly);

      // 2) Counts asignados por agente (PRO: RPC)
      const countsMap: Record<string, number> = {};

      // Intento 2a) RPC
      const { data: countsRpc, error: countsRpcError } = await supabase.rpc(
        "get_agent_assigned_counts",
      );

      if (!countsRpcError && Array.isArray(countsRpc)) {
        (countsRpc as AgentCountRow[]).forEach((row) => {
          if (row?.agent_id)
            countsMap[row.agent_id] = Number(row.assigned_count || 0);
        });
      } else {
        // Fallback 2b) N+1 por agente (funciona si son pocos agentes)
        if (countsRpcError) {
          console.warn(
            "RPC get_agent_assigned_counts no disponible o falló. Usando fallback.",
            countsRpcError,
          );
        }

        for (const ag of agentsOnly) {
          const { count, error: cErr } = await supabase
            .from("clients")
            .select("id", { count: "exact", head: true })
            .eq("assigned_to", ag.id);

          if (cErr) {
            console.error("Error contando asignados para agente:", ag.id, cErr);
            continue;
          }
          countsMap[ag.id] = Number(count || 0);
        }
      }

      setAssignedCounts(countsMap);

      // 3) Campañas disponibles (PRO: RPC)
      const { data: campRpc, error: campRpcError } = await supabase.rpc(
        "get_available_campaigns",
      );

      if (!campRpcError && Array.isArray(campRpc)) {
        setAvailableCampaigns(
          (campRpc as CampaignRow[])
            .filter((x) => x?.campaign)
            .map((x) => ({
              campaign: String(x.campaign),
              available: Number(x.available || 0),
            })),
        );

        // Traer display_name para los prefixes presentes en availableCampaigns
        const prefixes = (campRpc as CampaignRow[])
          .filter((x) => x?.campaign)
          .map((x) => String(x.campaign));

        if (prefixes.length > 0) {
          const { data: nameRows, error: nameErr } = await supabase
            .from("campaigns")
            .select("prefix, display_name")
            .in("prefix", prefixes);

          if (!nameErr && Array.isArray(nameRows)) {
            const map: Record<string, string> = {};
            nameRows.forEach((r: any) => {
              if (r?.prefix)
                map[String(r.prefix)] = String(r.display_name ?? "").trim();
            });
            setCampaignNames(map);
          } else {
            setCampaignNames({});
          }
        } else {
          setCampaignNames({});
        }
      } else {
        // Fallback: query directa (si no tienes RPC)
        if (campRpcError) {
          console.warn(
            "RPC get_available_campaigns no disponible o falló. Usando fallback.",
            campRpcError,
          );
        }

        const { data: rows, error: qErr } = await supabase.rpc(
          "get_available_campaigns_fallback",
        ); // <- si no existe, cae al catch de abajo

        if (!qErr && Array.isArray(rows)) {
          setAvailableCampaigns(rows as CampaignRow[]);
        } else {
          // último fallback: sin campañas
          setAvailableCampaigns([]);
        }
      }
    } catch (err) {
      console.error("Error cargando datos:", err);
      setError("Error inesperado");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAssignment = (agent: Agent) => {
    setSelectedAgent(agent);
    setShowAssignmentModal(true);
  };

  const handleViewAgentDetails = (agent: Agent) => {
    setSelectedAgent(agent);
    setShowAgentDetails(true);
  };

  const handleAssignmentCreated = () => {
    loadData();
    setShowAssignmentModal(false);
  };

  if (loading) {
    return <LoadingSpinner text="Cargando agentes..." />;
  }

  return (
    <div className="space-y-4">
      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* ✅ NUEVO: Resumen de campañas disponibles */}
      <div className="card">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-semibold text-gray-900">
              Campañas disponibles
            </h3>
            <p className="text-sm text-gray-600">
              Clientes sin asignar: <strong>{totalAvailable}</strong>
            </p>
          </div>

          {/* // Si hay campañas con clientes disponibles, mostrar badges. Si no, mensaje de "No hay clientes sin asignar". */}
          {availableCampaigns.length > 0 ? (
            <div className="flex flex-wrap gap-2 justify-end">
              {availableCampaigns.map((c) => (
                <CampaignBadge
                  key={c.campaign}
                  prefix={c.campaign}
                  available={c.available}
                  title={
                    campaignNames[c.campaign]
                      ? `${campaignNames[c.campaign]} · Disponibles: ${c.available}`
                      : `Disponibles en ${c.campaign}: ${c.available}`
                  }
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              No hay clientes sin asignar.
            </p>
          )}
        </div>
      </div>

      {/* Lista de agentes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agentsList.map((agent) => {
          const assigned = assignedCounts[agent.id] ?? 0;

          return (
            <div
              key={agent.id}
              className="card hover:shadow-md transition-shadow"
            >
              {/* Header del agente */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center min-w-0 flex-1">
                  <div className="w-3 h-3 rounded-full mr-3 flex-shrink-0 bg-blue-500" />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {agent.name}
                    </h3>
                    <p className="text-sm text-gray-600 truncate break-all">
                      {agent.email}
                    </p>
                    <span className="text-xs px-2 py-1 rounded-full inline-block mt-1 bg-blue-100 text-blue-800">
                      Agente
                    </span>
                  </div>
                </div>
              </div>

              {/* ✅ CAMBIO: en vez de rangos, mostrar clientes asignados */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Clientes asignados ({assigned})
                </h4>
                <p className="text-sm text-gray-600">
                  {assigned > 0
                    ? `Este agente tiene ${assigned} clientes asignados.`
                    : "Sin clientes asignados."}
                </p>
              </div>

              {/* Acciones */}
              <div className="flex space-x-2">
                <button
                  onClick={() => handleViewAgentDetails(agent)}
                  className="flex-1 btn-secondary flex items-center justify-center text-sm"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Ver Detalles
                </button>

                <button
                  onClick={() => handleCreateAssignment(agent)}
                  className="flex-1 btn-primary flex items-center justify-center text-sm"
                  disabled={totalAvailable <= 0}
                  title={
                    totalAvailable <= 0
                      ? "No hay clientes disponibles"
                      : "Asignar clientes"
                  }
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Asignar
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modales */}
      {selectedAgent && (
        <>
          <AssignmentModal
            agent={selectedAgent}
            isOpen={showAssignmentModal}
            onClose={() => setShowAssignmentModal(false)}
            onSuccess={handleAssignmentCreated}
          />

          <AgentDetailsModal
            agent={selectedAgent}
            isOpen={showAgentDetails}
            onClose={() => setShowAgentDetails(false)}
          />
        </>
      )}
    </div>
  );
}
