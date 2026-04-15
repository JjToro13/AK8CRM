import { AnimatePresence, motion } from "framer-motion";
import { Phone } from "lucide-react";
import {
  canUseCalendarWorkspace,
  canUseCallHistory,
  canUseClientActions,
} from "../../../lib/supabase";
import EditClientModal from "../../../shared/components/client/EditClientModal";
import SecurityInfo from "./SecurityInfo";
import AppFooter from "../../../shared/components/layout/AppFooter";
import PageStage from "../../../shared/components/layout/PageStage";
import { useBranding } from "../../../shared/branding/BrandingProvider";
import PageHeader from "../../../shared/components/layout/PageHeader";
import { useDashboard } from "../hooks/useDashboard";
import type { DashboardProps } from "../types/dashboard.types";
import DashboardQuickActionsPanel from "./DashboardQuickActionsPanel";
import DashboardCalendarPanel from "../../calendar/components/DashboardCalendarPanel";
import DashboardRecentCallsPanel from "./DashboardRecentCallsPanel";
import DashboardSearchPanel from "./DashboardSearchPanel";
import DashboardStatsPanel from "./DashboardStatsPanel";
import { dashboardFadeUp } from "./dashboardUi";
import DashboardHeaderMenu from "./DashboardHeaderMenu";

export default function DashboardView(props: DashboardProps) {
  const { branding } = useBranding();
  const {
    callsLoading,
    degradedMode,
    handleCallStarted,
    handleClientSaved,
    handleEditClient,
    handleSearchInput,
    handleSignOut,
    loading,
    opLocked,
    operations,
    opsError,
    opsLoading,
    recentCalls,
    searchQuery,
    searchResults,
    selectedClient,
    selectedTenantId,
    selectedOperationId,
    selectOperation,
    selectTenant,
    setShowEditModal,
    showEditModal,
    statCompleted,
    statInProgress,
    statNoAnswer,
    statToday,
    tenants,
  } = useDashboard(props);

  const { canSeeAllOperations = false, isAdmin, role } = props;
  const canUseSearch = canUseClientActions(role);
  const canUseCalendar = canUseCalendarWorkspace(role);
  const canUseCalls = canUseCallHistory(role);
  const panelSubtitle =
    role === "dev"
      ? "Panel de desarrollo"
      : role === "owner"
        ? "Panel de owner"
        : role === "manager"
          ? "Panel de gestion"
          : role === "loader"
            ? "Panel de carga"
            : "Panel del agente";

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <PageHeader
        allowOverflow
        icon={<Phone className="h-5 w-5 text-brand" />}
        title={branding.productName}
        subtitle={<span className="text-xs text-muted">{panelSubtitle}</span>}
        supportingContent={<SecurityInfo isAdmin={isAdmin} mode="inline" />}
        meta={
          <DashboardHeaderMenu
            canSeeAllOperations={canSeeAllOperations}
            inProgress={statInProgress}
            loading={opsLoading}
            operations={operations}
            recentCount={recentCalls.length}
            role={role}
            selectedOperationId={selectedOperationId}
            selectedTenantId={selectedTenantId}
            tenants={tenants}
            today={statToday}
            onSelectOperation={selectOperation}
            onSelectTenant={selectTenant}
            onSignOut={handleSignOut}
          />
        }
      />

      <main className="flex-1 w-full">
        <PageStage tone="brand">
          <AnimatePresence mode="wait">
            {opsError ? (
              <motion.div
                key="op-error"
                variants={dashboardFadeUp}
                initial="initial"
                animate="animate"
                exit="exit"
                className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
              >
                {opsError}
              </motion.div>
            ) : null}

            {canSeeAllOperations && !opsLoading && !selectedOperationId ? (
              <motion.div
                key="op-warning"
                variants={dashboardFadeUp}
                initial="initial"
                animate="animate"
                exit="exit"
                className="mb-6 rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800"
              >
                Debes seleccionar una operacion para empezar.
              </motion.div>
            ) : null}
          </AnimatePresence>

          <div className="space-y-6">
            <motion.div
              variants={dashboardFadeUp}
              initial="initial"
              animate="animate"
            >
              <DashboardQuickActionsPanel role={role ?? null} mode="rail" />
            </motion.div>

            <motion.div
              variants={dashboardFadeUp}
              initial="initial"
              animate="animate"
            >
              <DashboardStatsPanel
                completed={statCompleted}
                inProgress={statInProgress}
                noAnswer={statNoAnswer}
                today={statToday}
              />
            </motion.div>

            <div className="grid grid-cols-1 gap-6 lg:gap-8 xl:grid-cols-12">
              <div className={canUseCalls ? "space-y-6 xl:col-span-8" : "space-y-6 xl:col-span-12"}>
                <motion.div
                  variants={dashboardFadeUp}
                  initial="initial"
                  animate="animate"
                >
                  {canUseSearch ? (
                    <DashboardSearchPanel
                      degradedMode={degradedMode}
                      loading={loading}
                      onCallStarted={handleCallStarted}
                      onEditClient={handleEditClient}
                      onSearchChange={handleSearchInput}
                      opLocked={opLocked}
                      searchQuery={searchQuery}
                      searchResults={searchResults}
                    />
                  ) : (
                    <section className="rounded-[1.5rem] border border-border bg-surface shadow-soft p-6 sm:p-7">
                      <h2 className="text-base font-semibold tracking-tight text-ink">
                        Acceso de carga
                      </h2>
                      <p className="mt-2 text-sm text-muted">
                        Este perfil esta orientado a carga y preparacion de datos.
                        Las acciones comerciales y de contacto no se muestran aqui.
                      </p>
                    </section>
                  )}
                </motion.div>

                {canUseCalendar ? (
                  <motion.div
                    variants={dashboardFadeUp}
                    initial="initial"
                    animate="animate"
                  >
                    <DashboardCalendarPanel />
                  </motion.div>
                ) : null}
              </div>

              {canUseCalls ? (
                <div className="space-y-6 xl:col-span-4">
                  <motion.div
                    variants={dashboardFadeUp}
                    initial="initial"
                    animate="animate"
                  >
                    <DashboardRecentCallsPanel
                      callsLoading={callsLoading}
                      degradedMode={degradedMode}
                      recentCalls={recentCalls}
                    />
                  </motion.div>
                </div>
              ) : null}
            </div>
          </div>
        </PageStage>
      </main>

      <AppFooter note="Panel principal, operaciones activas y accesos del equipo." />

      <EditClientModal
        client={selectedClient}
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={handleClientSaved}
        isAdmin={isAdmin}
      />
    </div>
  );
}
