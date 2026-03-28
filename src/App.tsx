import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { MotionConfig } from "framer-motion";
import { Toaster } from "sileo";
import { useAuth } from "./hooks/useAuth";
import { useEffect, useState } from "react";

import LoadingSpinner from "./shared/components/feedback/LoadingSpinner";
import MaintenanceGate from "./shared/components/guards/MaintenanceGate";
import AgentManagementPage from "./modules/agents/pages/AgentManagementPage";
import LoginPage from "./modules/auth/pages/LoginPage";
import CalendarPage from "./modules/calendar/pages/CalendarPage";
import CallHistoryPage from "./modules/calls/pages/CallHistoryPage";
import CampaignManagementPage from "./modules/campaigns/pages/CampaignManagementPage";
import ClientManagementPage from "./modules/clients/pages/ClientManagementPage";
import DashboardPage from "./modules/dashboard/pages/DashboardPage";
import {
  canAccessAgentWorkspace,
  canAccessCampaignWorkspace,
  canUseCalendarWorkspace,
  canUseCallHistory,
} from "./lib/supabase";
import { useBranding } from "./shared/branding/BrandingProvider";
import { resolveTenantBranding } from "./shared/branding/tenant-branding";
import { dashboard } from "./modules/dashboard/services/dashboard.service";
import type { BrandPreset } from "./shared/branding/brand-presets";

const BRANDING_CACHE_KEY_PREFIX = "crm.branding-cache.";
const BRANDING_MAX_WAIT_MS = 1500;

function getBrandingCacheKey(operationId: string) {
  return `${BRANDING_CACHE_KEY_PREFIX}${operationId}`;
}

function readCachedBranding(operationId: string): BrandPreset | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(getBrandingCacheKey(operationId));
    if (!raw) return null;
    return JSON.parse(raw) as BrandPreset;
  } catch {
    return null;
  }
}

function writeCachedBranding(operationId: string, branding: BrandPreset) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(
      getBrandingCacheKey(operationId),
      JSON.stringify(branding),
    );
  } catch {
    // noop
  }
}

function ProtectedRoute({
  isAllowed,
  redirectTo = "/login",
  children,
}: {
  isAllowed: boolean;
  redirectTo?: string;
  children: React.ReactNode;
}) {
  if (!isAllowed) return <Navigate to={redirectTo} replace />;
  return <>{children}</>;
}

export default function App() {
  const { clearBrandPresetOverride, setAutoBranding } = useBranding();
  const [brandingReady, setBrandingReady] = useState(true);
  const {
    user,
    loading,
    isAdmin,
    canSeeAllOperations,
    operationReady,
    activeOperationId,
    operationId,
    role,
  } = useAuth();
  const canAccessAgents = !!user && canAccessAgentWorkspace(role);
  const canAccessCampaigns = !!user && canAccessCampaignWorkspace(role);
  const canAccessCalls = !!user && canUseCallHistory(role);
  const canAccessCalendar = !!user && canUseCalendarWorkspace(role);

  useEffect(() => {
    if (role !== "dev") {
      clearBrandPresetOverride();
    }
  }, [clearBrandPresetOverride, role]);

  useEffect(() => {
    if (!user) {
      setAutoBranding(null);
      setBrandingReady(true);
      return;
    }

    const targetOperationId = canSeeAllOperations
      ? activeOperationId
      : (operationId ?? null);

    if (!targetOperationId) {
      setAutoBranding(null);
      setBrandingReady(true);
      return;
    }

    let cancelled = false;
    const cachedBranding = readCachedBranding(targetOperationId);

    if (cachedBranding) {
      setAutoBranding(cachedBranding);
      setBrandingReady(true);
    } else {
      setBrandingReady(false);
    }

    const waitTimer = window.setTimeout(() => {
      if (!cancelled) {
        setBrandingReady(true);
      }
    }, BRANDING_MAX_WAIT_MS);

    const syncBranding = async () => {
      const { data, error } = await dashboard.getOperationBrandingContextById(
        targetOperationId,
      );

      if (cancelled) return;

      if (error) {
        console.error("Error resolviendo branding de operacion:", error);
        setAutoBranding(null);
        setBrandingReady(true);
        return;
      }

      const resolvedBranding = resolveTenantBranding({
        operationSlug: data?.operation?.slug ?? null,
        settings: data?.tenantSettings ?? null,
      });

      setAutoBranding(resolvedBranding);
      writeCachedBranding(targetOperationId, resolvedBranding);
      setBrandingReady(true);
    };

    void syncBranding();

    return () => {
      cancelled = true;
      window.clearTimeout(waitTimer);
    };
  }, [
    activeOperationId,
    canSeeAllOperations,
    operationId,
    setAutoBranding,
    setBrandingReady,
    user,
  ]);

  if (loading || (user && !brandingReady)) return <LoadingSpinner />;

  return (
    <MotionConfig reducedMotion="user">
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <MaintenanceGate>
          <div className="min-h-screen bg-bg">
          <Toaster
            position="top-center"
            theme="light"
            offset={{ top: 20 }}
            options={{ duration: 2600, roundness: 28 }}
          />
          <Routes>
            <Route
              path="/login"
              element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />}
            />

            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute isAllowed={!!user}>
                  <DashboardPage
                    isAdmin={isAdmin}
                    canSeeAllOperations={canSeeAllOperations}
                    operationReady={operationReady}
                    role={role}
                  />
                </ProtectedRoute>
              }
            />

            <Route
              path="/calendar"
              element={
                <ProtectedRoute
                  isAllowed={canAccessCalendar}
                  redirectTo={user ? "/dashboard" : "/login"}
                >
                  <CalendarPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/calls"
              element={
                <ProtectedRoute
                  isAllowed={canAccessCalls}
                  redirectTo={user ? "/dashboard" : "/login"}
                >
                  <CallHistoryPage isAdmin={isAdmin} />
                </ProtectedRoute>
              }
            />

            <Route
              path="/clients"
              element={
                <ProtectedRoute isAllowed={!!user}>
                  <ClientManagementPage
                    isAdmin={isAdmin}
                    canSeeAllOperations={canSeeAllOperations}
                    operationReady={operationReady}
                    activeOperationId={
                      canSeeAllOperations ? activeOperationId : null
                    }
                  />
                </ProtectedRoute>
              }
            />

            <Route
              path="/agents"
              element={
                <ProtectedRoute
                  isAllowed={canAccessAgents}
                  redirectTo={user ? "/dashboard" : "/login"}
                >
                  <AgentManagementPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/campaigns"
              element={
                <ProtectedRoute
                  isAllowed={canAccessCampaigns}
                  redirectTo={user ? "/dashboard" : "/login"}
                >
                  <CampaignManagementPage />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          </div>
        </MaintenanceGate>
      </Router>
    </MotionConfig>
  );
}
