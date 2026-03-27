import { AnimatePresence, motion } from "framer-motion";
import { LogOut, Phone } from "lucide-react";
import EditClientModal from "../../../shared/components/client/EditClientModal";
import SecurityInfo from "./SecurityInfo";
import AppFooter from "../../../shared/components/layout/AppFooter";
import PageStage from "../../../shared/components/layout/PageStage";
import BrandPresetSelector from "../../../shared/components/layout/BrandPresetSelector";
import { useBranding } from "../../../shared/branding/BrandingProvider";
import PageHeader, {
  pageHeaderActionClassName,
} from "../../../shared/components/layout/PageHeader";
import { useDashboard } from "../hooks/useDashboard";
import type { DashboardProps } from "../types/dashboard.types";
import DashboardQuickActionsPanel from "./DashboardQuickActionsPanel";
import DashboardCalendarPanel from "../../calendar/components/DashboardCalendarPanel";
import DashboardRecentCallsPanel from "./DashboardRecentCallsPanel";
import DashboardSearchPanel from "./DashboardSearchPanel";
import DashboardStatsPanel from "./DashboardStatsPanel";
import DashboardOperationSelect from "./DashboardOperationSelect";
import DashboardTenantSelect from "./DashboardTenantSelect";
import { dashboardFadeUp } from "./dashboardUi";

export default function DashboardView(props: DashboardProps) {
  const { branding } = useBranding();
  const {
    callsLoading,
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

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <PageHeader
        icon={<Phone className="h-5 w-5 text-brand" />}
        title={branding.productName}
        subtitle={
          <span className="text-xs text-muted">
            {isAdmin ? "Panel de administracion" : "Panel del agente"}
          </span>
        }
        supportingContent={
          <motion.div
            initial={{ opacity: 0, y: 6, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 22,
              delay: 0.05,
            }}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-[11px] text-muted shadow-[0_10px_28px_rgba(17,24,39,0.06)]"
          >
            <span className="relative inline-flex h-2.5 w-2.5">
              <span className="absolute inset-0 rounded-full bg-emerald-400/25 blur-[6px] animate-blink-glow" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.65)] animate-blink-glow" />
            </span>
            <span className="font-semibold text-ink/80">Centralita</span>
            <span className="text-muted">•</span>
            <span className="font-semibold text-emerald-700">ONLINE</span>
          </motion.div>
        }
        meta={
          <div className="flex items-center gap-2 sm:gap-3">
            <BrandPresetSelector enabled={role === "dev"} />

            <DashboardTenantSelect
              enabled={canSeeAllOperations}
              loading={opsLoading}
              tenants={tenants}
              selectedTenantId={selectedTenantId}
              onSelect={selectTenant}
            />

            <DashboardOperationSelect
              enabled={canSeeAllOperations}
              loading={opsLoading}
              operations={operations}
              selectedOperationId={selectedOperationId}
              onSelect={selectOperation}
            />

            <button
              onClick={handleSignOut}
              className={pageHeaderActionClassName}
              type="button"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar Sesion</span>
            </button>
          </div>
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            <div className="lg:col-span-2 space-y-6">
              <motion.div
                variants={dashboardFadeUp}
                initial="initial"
                animate="animate"
              >
                <DashboardSearchPanel
                  loading={loading}
                  onCallStarted={handleCallStarted}
                  onEditClient={handleEditClient}
                  onSearchChange={handleSearchInput}
                  opLocked={opLocked}
                  searchQuery={searchQuery}
                  searchResults={searchResults}
                />
              </motion.div>

              <motion.div
                variants={dashboardFadeUp}
                initial="initial"
                animate="animate"
              >
                <DashboardCalendarPanel />
              </motion.div>

              <motion.div
                variants={dashboardFadeUp}
                initial="initial"
                animate="animate"
              >
                <DashboardRecentCallsPanel
                  callsLoading={callsLoading}
                  recentCalls={recentCalls}
                />
              </motion.div>
            </div>

            <div className="space-y-6">
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

              <motion.div
                variants={dashboardFadeUp}
                initial="initial"
                animate="animate"
              >
                <SecurityInfo isAdmin={isAdmin} />
              </motion.div>

              <motion.div
                variants={dashboardFadeUp}
                initial="initial"
                animate="animate"
              >
                <DashboardQuickActionsPanel isAdmin={isAdmin} />
              </motion.div>
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
