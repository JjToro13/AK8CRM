import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  BACKEND_PRESSURE_EVENT,
  getBackendIssueMessage,
  isBackendPressureError,
  type BackendPressureSignal,
} from "./backend-health";

const AUTO_DEGRADE_FAILURE_THRESHOLD = 3;
const AUTO_RECOVERY_SUCCESS_THRESHOLD = 2;
const MANUAL_OVERRIDE_STORAGE_KEY = "crm.backend.manual-degraded";

type BackendHealthContextValue = {
  isDegraded: boolean;
  isManualDegraded: boolean;
  shouldReduceLoad: boolean;
  consecutiveFailures: number;
  recoverySuccesses: number;
  lastIssueMessage: string | null;
  reportBackendIssue: (error: unknown, source?: string) => void;
  reportBackendSuccess: (source?: string) => void;
  setManualDegraded: (value: boolean) => void;
  resetBackendHealth: () => void;
};

const BackendHealthContext = createContext<BackendHealthContextValue | null>(
  null,
);

function readManualOverride() {
  if (typeof window === "undefined") return false;

  try {
    return window.sessionStorage.getItem(MANUAL_OVERRIDE_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function BackendHealthProvider({ children }: { children: ReactNode }) {
  const [manualDegraded, setManualDegradedState] = useState(readManualOverride);
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);
  const [recoverySuccesses, setRecoverySuccesses] = useState(0);
  const [autoDegraded, setAutoDegraded] = useState(false);
  const [lastIssueMessage, setLastIssueMessage] = useState<string | null>(null);

  const setManualDegraded = useCallback((value: boolean) => {
    setManualDegradedState(value);

    try {
      if (value) {
        window.sessionStorage.setItem(MANUAL_OVERRIDE_STORAGE_KEY, "1");
      } else {
        window.sessionStorage.removeItem(MANUAL_OVERRIDE_STORAGE_KEY);
      }
    } catch {
      //
    }
  }, []);

  const reportBackendIssue = useCallback((error: unknown) => {
    if (!isBackendPressureError(error)) {
      return;
    }

    setLastIssueMessage(getBackendIssueMessage(error));
    setRecoverySuccesses(0);
    setConsecutiveFailures((current) => {
      const next = current + 1;
      if (next >= AUTO_DEGRADE_FAILURE_THRESHOLD) {
        setAutoDegraded(true);
      }
      return next;
    });
  }, []);

  const reportBackendSuccess = useCallback(() => {
    setLastIssueMessage(null);
    setConsecutiveFailures(0);

    setRecoverySuccesses((current) => {
      if (!autoDegraded) {
        return 0;
      }

      const next = current + 1;
      if (next >= AUTO_RECOVERY_SUCCESS_THRESHOLD) {
        setAutoDegraded(false);
        return 0;
      }

      return next;
    });
  }, [autoDegraded]);

  const resetBackendHealth = useCallback(() => {
    setConsecutiveFailures(0);
    setRecoverySuccesses(0);
    setAutoDegraded(false);
    setLastIssueMessage(null);
  }, []);

  useEffect(() => {
    const handleSignal = (event: Event) => {
      const customEvent = event as CustomEvent<BackendPressureSignal>;
      const detail = customEvent.detail;

      if (detail?.kind !== "failure") return;

      reportBackendIssue({
        message: detail.message,
        status: detail.status,
        code: detail.reason,
      });
    };

    window.addEventListener(
      BACKEND_PRESSURE_EVENT,
      handleSignal as EventListener,
    );

    return () => {
      window.removeEventListener(
        BACKEND_PRESSURE_EVENT,
        handleSignal as EventListener,
      );
    };
  }, [reportBackendIssue]);

  const value = useMemo<BackendHealthContextValue>(
    () => ({
      isDegraded: manualDegraded || autoDegraded,
      isManualDegraded: manualDegraded,
      shouldReduceLoad: manualDegraded || autoDegraded,
      consecutiveFailures,
      recoverySuccesses,
      lastIssueMessage,
      reportBackendIssue,
      reportBackendSuccess,
      setManualDegraded,
      resetBackendHealth,
    }),
    [
      autoDegraded,
      consecutiveFailures,
      lastIssueMessage,
      manualDegraded,
      recoverySuccesses,
      reportBackendIssue,
      reportBackendSuccess,
      resetBackendHealth,
      setManualDegraded,
    ],
  );

  return (
    <BackendHealthContext.Provider value={value}>
      {children}
    </BackendHealthContext.Provider>
  );
}

export function useBackendHealth() {
  const context = useContext(BackendHealthContext);

  if (!context) {
    throw new Error(
      "useBackendHealth must be used inside BackendHealthProvider",
    );
  }

  return context;
}
