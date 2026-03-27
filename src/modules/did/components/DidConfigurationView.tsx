import LoadingSpinner from "../../../shared/components/feedback/LoadingSpinner";
import { useAgentDidConfiguration } from "../hooks/useAgentDidConfiguration";
import DidAgentsList from "./DidAgentsList";
import DidConfigurationPanel from "./DidConfigurationPanel";
import DidOverviewCard from "./DidOverviewCard";

export default function DidConfigurationView() {
  const {
    agentsList,
    availableExtensions,
    credsByAgentId,
    deleteCredentials,
    deletingAgentId,
    extensionNumber,
    hasSelectedCreds,
    loading,
    maskedToken,
    refreshData,
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
  } = useAgentDidConfiguration();

  const configuredCount = agentsList.filter((agent) =>
    credsByAgentId.has(agent.id),
  ).length;
  const pendingCount = Math.max(agentsList.length - configuredCount, 0);

  if (loading) {
    return (
      <div className="py-14 flex justify-center">
        <LoadingSpinner
          size="sm"
          text="Cargando configuracion..."
          fullScreen={false}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DidOverviewCard
        agentsCount={agentsList.length}
        availableExtensions={availableExtensions}
        configuredCount={configuredCount}
        disableRefresh={saving || testing}
        maskedToken={maskedToken}
        onRefresh={refreshData}
        pendingCount={pendingCount}
        refreshing={refreshing}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(22rem,28rem)_minmax(0,1fr)]">
        <DidAgentsList
          agentsList={agentsList}
          credsByAgentId={credsByAgentId}
          deletingAgentId={deletingAgentId}
          onDelete={deleteCredentials}
          onSelect={selectAgent}
          selectedAgentId={selectedAgent?.id}
        />

        <div className="lg:sticky lg:top-6">
          <DidConfigurationPanel
            extensionNumber={extensionNumber}
            hasSelectedCreds={hasSelectedCreds}
            onExtensionChange={updateExtensionNumber}
            onSave={saveCredentials}
            onTest={testConnection}
            saving={saving}
            selectedAgent={selectedAgent}
            selectedCreds={selectedCreds}
            testResult={testResult}
            testing={testing}
            webhookUrl={webhookUrl}
          />
        </div>
      </div>
    </div>
  );
}
