// Login.tsx
import { useEffect, useMemo, useState } from "react";
import {
  Eye,
  EyeOff,
  LogIn,
  Shield,
  CheckCircle2,
  UserRound,
} from "lucide-react";
import { supabase, auth } from "../../../lib/supabase";
import LoadingSpinner from "../../../shared/components/feedback/LoadingSpinner";
import { AnimatePresence, motion } from "framer-motion";
import AppFooter from "../../../shared/components/layout/AppFooter";
import { useBranding } from "../../../shared/branding/BrandingProvider";
import Field from "../../../shared/components/ui/Field";
import Input from "../../../shared/components/ui/Input";

type LoginMode = "agent" | "admin";
type DetectedRole = "agent" | "admin" | null;

const ADMIN_EMAILS = new Set([
  "sorush.admin@ext.call-master.com",
  "irin.sadmin@call-master.com",
  "developer@call-master.com",
  "neton@call-master.com",
]);

const AGENT_EMAILS = new Set([
  "simiel.agent@ext.call-master.com",
]);

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function detectRoleFromEmail(email: string): DetectedRole {
  const normalized = normalizeEmail(email);

  if (!normalized) return null;
  if (ADMIN_EMAILS.has(normalized)) return "admin";
  if (AGENT_EMAILS.has(normalized)) return "agent";

  return null;
}

async function validateProfile() {
  const { data, error } = await supabase.rpc("my_agent");
  if (error) {
    return { profile: null, error };
  }

  const profile = Array.isArray(data) ? data[0] : data;
  return { profile: profile ?? null, error: null };
}

export default function LoginPage() {
  const { branding } = useBranding();
  const [mode, setMode] = useState<LoginMode>("agent");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const detectedRole = useMemo(() => detectRoleFromEmail(email), [email]);

  useEffect(() => {
    if (detectedRole && detectedRole !== mode) {
      setMode(detectedRole);
      setError("");
    }
  }, [detectedRole, mode]);

  const isAdmin = mode === "admin";
  const effectiveRole: LoginMode = detectedRole ?? mode;
  const ui = useMemo(() => {
    if (isAdmin) {
      return {
        badgeTitle: branding.productName,
        badgeSubtitle: "Acceso para administradores",
        title: "Admin Login",
        subtitle:
          "Inicia sesión para administrar operaciones, agentes, campañas y reportes.",
        heroKicker: "Control total.",
        heroTitle: (
          <>
            Administra. Audita.
            <br />
            Optimiza.
          </>
        ),
        heroText:
          "Acceso seguro para administradores, con validación de permisos y estado de cuenta.",
        tipTitle: "Tip",
        tipText:
          "Usa roles bien definidos. Mantén permisos mínimos necesarios para reducir errores operativos.",
        chipText: "Datos seguros y cifrados",
        bannerText:
          "Zona administrativa. Verifica tus permisos antes de realizar cambios críticos.",
      };
    }

    return {
      badgeTitle: branding.productName,
      badgeSubtitle: "Acceso para agentes",
      title: "Login",
      subtitle:
        "Inicia sesión para gestionar tus clientes, comentarios y seguimientos.",
      heroKicker: "Trabaja más rápido.",
      heroTitle: (
        <>
          Llama. Registra.
          <br />
          Cierra.
        </>
      ),
      heroText:
        "Un login limpio y profesional para tus agentes, con una interfaz moderna inspirada en el mockup que te gustó.",
      tipTitle: "Tip",
      tipText:
        "Usa comentarios claros y consistentes: facilita el seguimiento y mejora el cierre. Un buen registro es clave para el éxito de tus ventas.",
      chipText: "Datos seguros y cifrados",
      bannerText:
        "Actualización aplicada correctamente. Si detectas alguna anomalía en el sistema, por favor repórtala al administrador.",
    };
  }, [branding.productName, isAdmin]);

  const toggleMode = () => {
    setError("");
    setMode((m) => (m === "agent" ? "admin" : "agent"));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { error: signInErr } = await auth.signIn(email.trim(), password);
      if (signInErr) {
        setError(signInErr.message);
        return;
      }

      const { profile, error: profileError } = await validateProfile();

      if (profileError) {
        console.error("Error validando perfil con my_agent:", profileError);
      }

      if (!profile) {
        await supabase.auth.signOut({ scope: "local" });
        setError("No se pudo validar tu acceso. Contacta al administrador.");
        return;
      }

      if (profile.is_active === false) {
        await supabase.auth.signOut({ scope: "local" });
        setError("Tu cuenta está desactivada. Contacta al administrador.");
        return;
      }

      // ✅ OK: App.tsx redirige
    } catch (err) {
      console.error(err);
      setError("Error inesperado. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const leftColClass = isAdmin ? "lg:order-2" : "lg:order-1";
  const rightColClass = isAdmin ? "lg:order-1" : "lg:order-2";

  const dir = isAdmin ? -1 : 1;

  const panelVariants = {
    initial: { opacity: 0, x: 28 * dir, filter: "blur(6px)" },
    animate: {
      opacity: 1,
      x: 0,
      filter: "blur(0px)",
      transition: { type: "spring", stiffness: 260, damping: 26 },
    },
    exit: {
      opacity: 0,
      x: -22 * dir,
      filter: "blur(6px)",
      transition: { duration: 0.18, ease: "easeInOut" },
    },
  } as const;

  const heroVariants = {
    initial: { opacity: 0, x: -24 * dir, filter: "blur(8px)" },
    animate: {
      opacity: 1,
      x: 0,
      filter: "blur(0px)",
      transition: { type: "spring", stiffness: 220, damping: 28 },
    },
    exit: {
      opacity: 0,
      x: 18 * dir,
      filter: "blur(8px)",
      transition: { duration: 0.18, ease: "easeInOut" },
    },
  } as const;

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-6xl rounded-[2.5rem] border border-border bg-surface2 shadow-soft2 p-2 sm:p-2.5 lg:p-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 overflow-hidden rounded-[1.75rem] sm:rounded-[2.1rem] bg-surface shadow-soft border border-border isolate">
          {/* LEFT (Form) */}
          <div className={`p-8 sm:p-10 lg:p-12 ${leftColClass}`}>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleMode}
                className="group h-11 w-11 rounded-2xl bg-brand/10 flex items-center justify-center
                           hover:bg-brand/15 transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20"
                aria-label={
                  isAdmin
                    ? "Cambiar a login de agentes"
                    : "Cambiar a login de administradores"
                }
                title={isAdmin ? "Cambiar a agentes" : "Cambiar a administradores"}
              >
                <motion.span
                  key={mode}
                  initial={{ rotate: -10, scale: 0.95, opacity: 0.7 }}
                  animate={{ rotate: 0, scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 18 }}
                  className="inline-flex"
                >
                  {isAdmin ? (
                    <Shield className="h-5 w-5 text-brand" />
                  ) : (
                    <LogIn className="h-5 w-5 text-brand" />
                  )}
                </motion.span>
              </button>

              <div className="leading-tight">
                <div className="text-sm font-semibold text-ink">{ui.badgeTitle}</div>
                <div className="text-xs text-muted">{ui.badgeSubtitle}</div>
              </div>

              <div className="ml-auto hidden sm:flex">
                <button
                  type="button"
                  onClick={toggleMode}
                  className="relative inline-flex items-center rounded-full border border-border bg-surface px-1 py-1 text-xs text-muted shadow-[0_8px_20px_rgba(17,24,39,0.06)]
                             hover:shadow-[0_12px_26px_rgba(17,24,39,0.09)] transition"
                  aria-label="Cambiar modo de login"
                >
                  <span className="relative z-10 px-3 py-1.5">Agente</span>
                  <span className="relative z-10 px-3 py-1.5">Admin</span>

                  <motion.span
                    className="absolute top-1 bottom-1 w-[calc(50%-0.25rem)] rounded-full bg-brand/10 border border-brand/20"
                    animate={{ x: isAdmin ? "100%" : "0%" }}
                    transition={{ type: "spring", stiffness: 260, damping: 24 }}
                    style={{ left: "0.25rem" }}
                  />
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={mode}
                variants={panelVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <h1 className="mt-10 text-3xl font-semibold tracking-tight text-ink">
                  {ui.title}
                </h1>
                <p className="mt-2 text-sm text-muted max-w-sm">{ui.subtitle}</p>

                <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                  <Field label="Email">
                    <Input
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (error) setError("");
                      }}
                      placeholder="tu@email.com"
                    />

                    <div className="mt-2 min-h-[24px]">
                      {detectedRole && (
                        <div
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium border ${
                            detectedRole === "admin"
                              ? "border-brand/20 bg-brand/10 text-brand"
                              : "border-emerald-200 bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {detectedRole === "admin" ? (
                            <Shield className="h-3.5 w-3.5" />
                          ) : (
                            <UserRound className="h-3.5 w-3.5" />
                          )}
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Detectado como{" "}
                          {detectedRole === "admin"
                            ? "admin / sadmin / developer"
                            : "agent"}
                        </div>
                      )}
                    </div>
                  </Field>

                  <Field label="Password">

                    <div className="relative mt-2">
                      <Input
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pr-12"
                        placeholder="••••••••"
                      />

                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 px-4 flex items-center text-muted hover:text-ink transition"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={
                          showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                        }
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </Field>

                  {error && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                      <p className="text-sm text-red-600">{error}</p>
                    </div>
                  )}

                  <button type="submit" disabled={loading} className="auth-pill">
                    {loading ? (
                      <LoadingSpinner size="sm" text="" fullScreen={false} />
                    ) : (
                      <span className="inline-flex items-center justify-center gap-2">
                        {effectiveRole === "admin" ? (
                          <Shield className="h-4 w-4" />
                        ) : (
                          <LogIn className="h-4 w-4" />
                        )}
                        {effectiveRole === "admin" ? "Entrar como admin" : "Login"}
                      </span>
                    )}
                  </button>

                  <div className="relative py-3">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-surface px-3 text-muted">
                        {isAdmin ? "¿Sin permisos?" : "¿No tienes acceso?"}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-muted text-center mt-1 max-w-xs mx-auto">
                    {isAdmin
                      ? "Contacta a un super admin para habilitar tu cuenta o ajustar permisos."
                      : "Contacta a tu administrador para habilitar tu cuenta."}
                  </p>
                </form>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* RIGHT (Hero) */}
          <div className={`hidden lg:block relative ${rightColClass}`}>
            <div className="absolute inset-0 hero-animated-bg" />

            <motion.div
              className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-brand/18 blur-3xl pointer-events-none"
              animate={{ x: [0, 10, 0], y: [0, -8, 0] }}
              transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-brand/22 blur-3xl pointer-events-none"
              animate={{ x: [0, -12, 0], y: [0, 10, 0] }}
              transition={{ duration: 7.5, repeat: Infinity, ease: "easeInOut" }}
            />

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={`hero-${mode}`}
                variants={heroVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="relative h-full p-12 grid grid-rows-[auto_1fr_auto] gap-8"
              >
                <div className="flex items-start justify-between">
                  <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 shadow-[0_20px_60px_rgba(0,0,0,0.25)] max-w-[460px]">
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-200">
                      <span className="relative inline-flex h-2.5 w-2.5">
                        <span className="absolute inset-0 rounded-full bg-emerald-400/25 blur-[6px] animate-blink-glow" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.65)] animate-blink-glow" />
                      </span>
                      Call Master • Centralita | ONLINE
                    </div>

                    <p className="mt-1 text-xs text-white/75 leading-relaxed">
                      {ui.bannerText}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col justify-center">
                  <p className="text-white/70 text-sm">{ui.heroKicker}</p>
                  <h2 className="mt-3 text-4xl font-semibold tracking-tight text-white">
                    {ui.heroTitle}
                  </h2>
                  <p className="mt-4 text-sm text-white/70 max-w-md leading-relaxed">
                    {ui.heroText}
                  </p>

                  <div className="mt-10 max-w-md rounded-3xl border border-white/15 bg-white/[0.08] backdrop-blur-md p-6 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
                    <div className="text-white/90 text-sm font-semibold">
                      {ui.tipTitle}
                    </div>
                    <p className="mt-2 text-sm text-white/70">{ui.tipText}</p>
                  </div>
                </div>

                <div className="flex items-end justify-end">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-3 py-1 text-xs text-white/75 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
                    <span className="relative inline-flex h-2.5 w-2.5">
                      <span className="absolute inset-0 rounded-full bg-emerald-400/25 blur-[6px] animate-blink-glow" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.65)] animate-blink-glow" />
                    </span>
                    {ui.chipText}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
          </div>
        </div>
      </div>

      <AppFooter note="Acceso seguro para agentes y administradores." />
    </div>
  );
}
