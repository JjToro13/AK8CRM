import {
  createElement,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../integrations/supabase/client";

export type AppRole =
  | "dev"
  | "owner"
  | "manager"
  | "loader"
  | "agent"
  | null;

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;

  role: AppRole;
  isAdmin: boolean;
  canSeeAllOperations: boolean;

  operationId: string | null;
  activeOperationId: string | null;
  operationReady: boolean;
}

type AuthContextValue = AuthState & {
  signOut: () => Promise<{ error: unknown }>;
};

const PRESENCE_HEARTBEAT_MS = 90_000;
const AUTH_DEBUG = false;
const dlog = (...a: any[]) => AUTH_DEBUG && console.log("[AUTH]", ...a);
const dwarn = (...a: any[]) => AUTH_DEBUG && console.warn("[AUTH]", ...a);
const derr = (...a: any[]) => AUTH_DEBUG && console.error("[AUTH]", ...a);

const AuthContext = createContext<AuthContextValue | null>(null);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function rpcWithRetry<T>(
  fn: () => Promise<{ data: T; error: any }>,
  label: string,
  tries = 3,
) {
  let lastErr: any = null;

  for (let i = 1; i <= tries; i++) {
    try {
      const res = await fn();
      if (!res?.error) return res;
      lastErr = res.error;

      const code = res.error?.code;
      const status = res.error?.status;
      dwarn(`${label} attempt ${i} error`, {
        code,
        status,
        msg: res.error?.message,
      });

      if (i < tries) await sleep(250 * i);
    } catch (e) {
      lastErr = e;
      dwarn(`${label} attempt ${i} threw`, e);
      if (i < tries) await sleep(250 * i);
    }
  }

  return { data: null as any, error: lastErr };
}

function useProvideAuth(): AuthContextValue {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,

    role: null,
    isAdmin: false,
    canSeeAllOperations: false,

    operationId: null,
    activeOperationId: null,
    operationReady: true,
  });

  const mountedRef = useRef(true);
  const reqIdRef = useRef(0);
  const chainRef = useRef(Promise.resolve());
  const authStateRef = useRef(authState);

  const clearAuthState = () => {
    setAuthState({
      user: null,
      session: null,
      loading: false,
      role: null,
      isAdmin: false,
      canSeeAllOperations: false,
      operationId: null,
      activeOperationId: null,
      operationReady: true,
    });
  };

  useEffect(() => {
    authStateRef.current = authState;
  }, [authState]);

  const enqueue = (fn: () => Promise<void>) => {
    chainRef.current = chainRef.current.then(fn).catch((e) => {
      derr("enqueue error", e);
    });
    return chainRef.current;
  };

  useEffect(() => {
    mountedRef.current = true;
    dlog("mount useAuth");

    const loadProfile = async () => {
      dlog("loadProfile -> rpc my_agent");

      const { data, error } = await rpcWithRetry<any>(
        () => supabase.rpc("my_agent") as any,
        "rpc my_agent",
        2,
      );

      dlog("loadProfile <- rpc my_agent", {
        hasData: !!data,
        error: error ?? null,
      });

      if (error) throw error;

      const agent = Array.isArray(data) ? data[0] : data;
      if (!agent) throw new Error("No agent row from my_agent");

      if (agent.is_active === false) {
        await supabase.auth.signOut({ scope: "local" });
        return {
          role: null as AppRole,
          isAdmin: false,
          canSeeAllOperations: false,
          operationId: null as string | null,
          activeOperationId: null as string | null,
        };
      }

      const role = (agent.role as AppRole) ?? null;
      const canSeeAllOperations = role === "dev" || role === "owner";
      const isAdmin =
        role === "manager" || role === "owner" || canSeeAllOperations;

      return {
        role,
        isAdmin,
        canSeeAllOperations,
        operationId: (agent.operation_id as string | null) ?? null,
        activeOperationId: (agent.active_operation_id as string | null) ?? null,
      };
    };

    const ensureActiveOperation = async (
      canSeeAllOperations: boolean,
      dbActiveOperationId: string | null,
    ) => {
      dlog("ensureActiveOperation", {
        canSeeAllOperations,
        dbActiveOperationId,
      });

      if (!canSeeAllOperations) {
        return {
          activeOperationId: null as string | null,
          operationReady: true,
        };
      }

      const saved = localStorage.getItem("cm_selected_operation_id");
      const opId = dbActiveOperationId ?? saved ?? null;

      dlog("ensureActiveOperation -> picked opId", { opId, saved });

      if (!opId) return { activeOperationId: null, operationReady: false };

      const { error } = await rpcWithRetry(
        () =>
          supabase.rpc("set_active_operation", { p_operation_id: opId }) as any,
        "rpc set_active_operation",
        4,
      );

      if (error) {
        derr("set_active_operation error", error);
        return { activeOperationId: null, operationReady: false };
      }

      localStorage.setItem("cm_selected_operation_id", opId);
      return { activeOperationId: opId, operationReady: true };
    };

    const applySession = async (session: Session | null, source: string) => {
      const myReq = ++reqIdRef.current;
      let settledSession = session;

      dlog("applySession", {
        source,
        myReq,
        hasUser: !!session?.user,
        uid: session?.user?.id,
      });

      if (!session?.user) {
        if (!mountedRef.current || myReq !== reqIdRef.current) return;

        setAuthState({
          user: null,
          session: null,
          loading: false,
          role: null,
          isAdmin: false,
          canSeeAllOperations: false,
          operationId: null,
          activeOperationId: null,
          operationReady: true,
        });
        return;
      }

      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError) {
        dwarn("getSession before loadProfile failed", sessionError);
      }

      if (sessionData.session?.user) {
        settledSession = sessionData.session;
      }

      if (!settledSession?.user) {
        if (!mountedRef.current || myReq !== reqIdRef.current) return;
        clearAuthState();
        return;
      }

      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData.user) {
        dwarn("getUser before loadProfile failed", userError);
        await supabase.auth.signOut({ scope: "local" }).catch(() => {});
        localStorage.removeItem("cm_selected_operation_id");

        if (!mountedRef.current || myReq !== reqIdRef.current) return;
        clearAuthState();
        return;
      }

      if (!mountedRef.current || myReq !== reqIdRef.current) return;

      setAuthState((prev) => ({
        ...prev,
        user: userData.user,
        session: settledSession,
        loading: true,
      }));

      try {
        await sleep(50);
        const profile = await loadProfile();
        if (!mountedRef.current || myReq !== reqIdRef.current) return;

        const op = await ensureActiveOperation(
          profile.canSeeAllOperations,
          profile.activeOperationId,
        );
        if (!mountedRef.current || myReq !== reqIdRef.current) return;

        dlog("final auth state", { profile, op });

        setAuthState({
          user: userData.user,
          session: settledSession,
          loading: false,
          role: profile.role,
          isAdmin: profile.isAdmin,
          canSeeAllOperations: profile.canSeeAllOperations,
          operationId: profile.operationId,
          activeOperationId: op.activeOperationId,
          operationReady: op.operationReady,
        });
      } catch (e) {
        derr("applySession error", e);

        await supabase.auth.signOut({ scope: "local" }).catch(() => {});
        localStorage.removeItem("cm_selected_operation_id");
        if (!mountedRef.current || myReq !== reqIdRef.current) return;

        clearAuthState();
      }
    };

    let unsubscribe: (() => void) | null = null;

    const init = async () => {
      dlog("init -> getSession");
      const { data, error } = await supabase.auth.getSession();

      dlog("init <- getSession", {
        hasSession: !!data.session,
        error: error ?? null,
      });

      await enqueue(() => applySession(data.session, "init:getSession"));

      const { data: sub } = supabase.auth.onAuthStateChange(
        (event, session) => {
          dlog("onAuthStateChange", { event, uid: session?.user?.id });

          if (event === "INITIAL_SESSION") return;

          enqueue(() => applySession(session, `onAuth:${event}`));
        },
      );

      unsubscribe = () => sub.subscription.unsubscribe();
    };

    init();

    return () => {
      dlog("unmount useAuth");
      mountedRef.current = false;
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    const onOperationChanged = (event: Event) => {
      const customEvent = event as CustomEvent<{ operationId?: string | null }>;
      const opId = customEvent.detail?.operationId ?? null;

      setAuthState((prev) => ({
        ...prev,
        activeOperationId: opId,
        operationReady: prev.canSeeAllOperations ? !!opId : prev.operationReady,
      }));
    };

    window.addEventListener(
      "cm:operation-changed",
      onOperationChanged as EventListener,
    );

    return () => {
      window.removeEventListener(
        "cm:operation-changed",
        onOperationChanged as EventListener,
      );
    };
  }, []);

  useEffect(() => {
    if (authState.loading || !authState.user) {
      return;
    }

    let heartbeatId: number | null = null;

    const stopHeartbeat = () => {
      if (heartbeatId !== null) {
        window.clearInterval(heartbeatId);
        heartbeatId = null;
      }
    };

    const touchPresence = async () => {
      const { error } = await supabase.rpc("touch_my_presence");
      if (error) {
        dwarn("touch_my_presence error", error);
        const errorStatus = (error as any)?.status;

        if (errorStatus === 401) {
          stopHeartbeat();
          await supabase.auth.signOut({ scope: "local" }).catch(() => {});
          localStorage.removeItem("cm_selected_operation_id");
          if (mountedRef.current) {
            clearAuthState();
          }
        }
      }
    };

    const ensureHeartbeat = () => {
      stopHeartbeat();

      if (document.visibilityState === "hidden") {
        return;
      }

      void touchPresence();

      heartbeatId = window.setInterval(() => {
        if (document.visibilityState !== "hidden") {
          void touchPresence();
        }
      }, PRESENCE_HEARTBEAT_MS);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        ensureHeartbeat();
        return;
      }

      stopHeartbeat();
    };

    const handleFocus = () => {
      if (document.visibilityState === "visible") {
        void touchPresence();
      }
    };

    ensureHeartbeat();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      stopHeartbeat();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [authState.loading, authState.user]);

  const signOut = async () => {
    dlog("signOut called");
    setAuthState((prev) => ({ ...prev, loading: true }));

    if (authState.user) {
      const { error: presenceError } = await supabase.rpc("set_my_presence_offline");
      if (presenceError) {
        dwarn("set_my_presence_offline error", presenceError);
      }
    }

    const { error } = await supabase.auth.signOut({ scope: "local" });
    localStorage.removeItem("cm_selected_operation_id");

    if (error) {
      derr("signOut error", error);
      setAuthState((prev) => ({ ...prev, loading: false }));
      return { error };
    }

    clearAuthState();

    return { error: null };
  };

  return { ...authState, signOut };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const value = useProvideAuth();

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
