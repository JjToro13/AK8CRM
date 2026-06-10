import { useCallback, useEffect, useMemo, useState } from "react";
import { buildSupabaseFunctionUrl } from "../../../config/env";
import type { Agent, AgentDidCredentials } from "../../../shared/types/crm";
import { agents } from "../../agents/services/agents.service";
import { didCredentials } from "../services/did-credentials.service";
import type { DidFormData, DidTestResult } from "../types/agent-did.types";

const GLOBAL_TOKEN = "oedNbOjtfsl_Wq9GdkxTWRQ-1752768458";
const DEFAULT_FORM_DATA: DidFormData = { extensionNumber: "" };
const AVAILABLE_EXTENSIONS = [
  "101",
  "102",
  "103",
  "104",
  "105",
  "106",
  "107",
  "108",
  "109",
  "110",
] as const;

function maskToken(token: string) {
  if (token.length <= 10) {
    return token;
  }

  return `${token.slice(0, 6)}...${token.slice(-4)}`;
}

export function useAgentDidConfiguration() {
  const [agentsList, setAgentsList] = useState<Agent[]>([]);
  const [credentialsList, setCredentialsList] = useState<AgentDidCredentials[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [formData, setFormData] = useState<DidFormData>(DEFAULT_FORM_DATA);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [deletingAgentId, setDeletingAgentId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<DidTestResult | null>(null);

  const webhookUrl = useMemo(
    () => buildSupabaseFunctionUrl("call-ended-v2"),
    [],
  );
  const maskedToken = useMemo(() => maskToken(GLOBAL_TOKEN), []);

  const loadData = useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const [{ data: agentsData }, { data: credentialsData }] =
          await Promise.all([agents.getAll(), didCredentials.getAll()]);

        setAgentsList(agentsData ?? []);
        setCredentialsList((credentialsData as AgentDidCredentials[]) ?? []);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const credsByAgentId = useMemo(() => {
    const map = new Map<string, AgentDidCredentials>();

    for (const credentials of credentialsList) {
      map.set(String(credentials.agent_id), credentials);
    }

    return map;
  }, [credentialsList]);

  useEffect(() => {
    if (!selectedAgent) {
      return;
    }

    const nextSelectedAgent =
      agentsList.find((agent) => agent.id === selectedAgent.id) ?? null;

    if (!nextSelectedAgent) {
      setSelectedAgent(null);
      setFormData(DEFAULT_FORM_DATA);
      setTestResult(null);
      return;
    }

    if (nextSelectedAgent !== selectedAgent) {
      setSelectedAgent(nextSelectedAgent);
    }
  }, [agentsList, selectedAgent]);

  const selectedCreds = useMemo(() => {
    if (!selectedAgent) {
      return null;
    }

    return credsByAgentId.get(selectedAgent.id) ?? null;
  }, [credsByAgentId, selectedAgent]);

  const hasSelectedCreds = Boolean(selectedCreds?.extension_number);

  const selectAgent = useCallback(
    (agent: Agent) => {
      setSelectedAgent(agent);
      setTestResult(null);

      const existingCredentials = credsByAgentId.get(agent.id);

      setFormData({
        extensionNumber: existingCredentials?.extension_number || "",
      });
    },
    [credsByAgentId],
  );

  const updateExtensionNumber = useCallback((extensionNumber: string) => {
    setFormData({ extensionNumber });
  }, []);

  const testConnection = useCallback(async () => {
    if (!selectedAgent || !formData.extensionNumber) {
      setTestResult({
        success: false,
        message: "Por favor, introduce un numero de extension.",
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const { success, error } = await didCredentials.testConnection(
        formData.extensionNumber,
      );

      setTestResult({
        success,
        message: success
          ? `Extension ${formData.extensionNumber} validada correctamente.`
          : error || "Error validando la extension.",
      });
    } catch {
      setTestResult({
        success: false,
        message: "Error validando la extension.",
      });
    } finally {
      setTesting(false);
    }
  }, [formData.extensionNumber, selectedAgent]);

  const saveCredentials = useCallback(async () => {
    if (!selectedAgent || !formData.extensionNumber) {
      return;
    }

    setSaving(true);

    try {
      const { error } = await didCredentials.upsert({
        agent_id: selectedAgent.id,
        extension_number: formData.extensionNumber,
      });

      if (error) {
        console.error("Error guardando credenciales:", error);
        setTestResult({
          success: false,
          message: "No se pudo guardar. Revisa permisos o conexion.",
        });
        return;
      }

      await loadData({ silent: true });

      setTestResult({
        success: true,
        message: "Credenciales guardadas correctamente.",
      });
    } catch (error) {
      console.error("Error guardando credenciales:", error);
      setTestResult({
        success: false,
        message: "Ocurrio un error guardando credenciales.",
      });
    } finally {
      setSaving(false);
    }
  }, [formData.extensionNumber, loadData, selectedAgent]);

  const deleteCredentials = useCallback(
    async (agentId: string) => {
      if (
        !window.confirm(
          "Estas seguro de que quieres eliminar la configuracion de este agente?",
        )
      ) {
        return;
      }

      setDeletingAgentId(agentId);

      try {
        const { error } = await didCredentials.delete(agentId);

        if (error) {
          console.error("Error eliminando credenciales:", error);
          setTestResult({
            success: false,
            message: "No se pudo eliminar. Revisa permisos o conexion.",
          });
          return;
        }

        await loadData({ silent: true });

        if (selectedAgent?.id === agentId) {
          setSelectedAgent(null);
          setFormData(DEFAULT_FORM_DATA);
          setTestResult(null);
        }
      } catch (error) {
        console.error("Error eliminando credenciales:", error);
        setTestResult({
          success: false,
          message: "Ocurrio un error eliminando la configuracion.",
        });
      } finally {
        setDeletingAgentId(null);
      }
    },
    [loadData, selectedAgent],
  );

  return {
    agentsList,
    availableExtensions: AVAILABLE_EXTENSIONS,
    credsByAgentId,
    deleteCredentials,
    deletingAgentId,
    extensionNumber: formData.extensionNumber,
    hasSelectedCreds,
    loading,
    maskedToken,
    refreshData: () => loadData({ silent: true }),
    refreshing,
    saveCredentials,
    saving,
    selectAgent,
    selectedAgent,
    selectedCreds,
    testConnection,
    testResult,
    testing,
    updateExtensionNumber,
    webhookUrl,
  };
}
