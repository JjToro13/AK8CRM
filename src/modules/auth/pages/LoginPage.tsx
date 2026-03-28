import { useEffect, useMemo, useState, type FocusEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Eye, EyeOff, KeyRound, Mail } from "lucide-react";
import { auth } from "../services/auth.service";
import { supabase } from "../../../integrations/supabase/client";
import AppFooter from "../../../shared/components/layout/AppFooter";

type TenantFlavor = "neutral" | "light" | "shade";
type AccessRole = "developer" | "owner" | "manager" | "loader" | "agent";

type ContextState = {
  tenant: TenantFlavor;
  role: AccessRole;
  tenantSlug: string | null;
};

type TenantTheme = {
  pageBg1: string;
  pageBg2: string;
  pageGlow: string;
  cardBg: string;
  cardShadow: string;
  buttonFrom: string;
  buttonTo: string;
  buttonGlow: string;
  skyTop: string;
  skyBottom: string;
  mountainBack: string;
  mountainFront: string;
  riverFill: string;
  riverBorder: string;
  cloud: string;
  panelChip: string;
};

type RoleCopy = {
  eyebrow: string;
  title: string;
  summary: string;
};

const ROLE_COPY: Record<AccessRole, RoleCopy> = {
  developer: {
    eyebrow: "Centro de control",
    title: "Visibilidad general y continuidad operativa.",
    summary:
      "Una entrada sobria para supervisar actividad, consistencia y estructura desde un solo lugar.",
  },
  owner: {
    eyebrow: "Direccion comercial",
    title: "Coordinacion clara para personas, seguimiento y actividad.",
    summary:
      "Pensado para mantener ritmo, continuidad y una vision ordenada del trabajo diario.",
  },
  manager: {
    eyebrow: "Operacion activa",
    title: "Seguimiento continuo con foco en cartera y actividad.",
    summary:
      "Una interfaz clara para revisar avance, coordinar prioridades y sostener la operacion.",
  },
  loader: {
    eyebrow: "Base preparada",
    title: "Carga ordenada y consistencia desde el inicio.",
    summary:
      "El entorno privilegia limpieza, velocidad y control de la informacion de entrada.",
  },
  agent: {
    eyebrow: "Flujo comercial",
    title: "Clientes, seguimiento y accion en un mismo espacio.",
    summary:
      "Acceso directo al trabajo del dia con foco en ejecucion y menos ruido visual.",
  },
};

const PANEL_KEYWORDS: Record<AccessRole, string[]> = {
  developer: ["Supervision", "Control", "Estructura"],
  owner: ["Equipo", "Seguimiento", "Operacion"],
  manager: ["Cartera", "Actividad", "Prioridades"],
  loader: ["Carga", "Base", "Consistencia"],
  agent: ["Clientes", "Agenda", "Seguimiento"],
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function inferRoleFromLocalPart(localPart: string, normalizedEmail: string): AccessRole {
  if (
    normalizedEmail === "developer@ak8crm.com" ||
    localPart.endsWith(".developer") ||
    localPart.endsWith(".dev")
  ) {
    return "developer";
  }

  if (localPart.endsWith(".owner")) return "owner";
  if (localPart.endsWith(".manager")) return "manager";
  if (localPart.endsWith(".loader")) return "loader";

  return "agent";
}

function buildContext(email: string): ContextState {
  const normalized = normalizeEmail(email);
  const localPart = normalized.split("@")[0] ?? "";
  const domain = normalized.split("@")[1] ?? "";
  const role = inferRoleFromLocalPart(localPart, normalized);

  if (!normalized || !isValidEmail(normalized)) {
    return {
      tenant: "neutral",
      role,
      tenantSlug: null,
    };
  }

  if (normalized === "developer@ak8crm.com") {
    return {
      tenant: "neutral",
      role: "developer",
      tenantSlug: null,
    };
  }

  if (!domain.endsWith(".ak8crm.com") || domain === "ak8crm.com") {
    return {
      tenant: "neutral",
      role,
      tenantSlug: null,
    };
  }

  const domainScope = domain.replace(/\.ak8crm\.com$/, "") || null;
  const tenant =
    domainScope === "shade" || domainScope?.includes("shade")
      ? "shade"
      : domainScope === "light" || domainScope?.includes("light")
        ? "light"
        : "neutral";

  return {
    tenant,
    role,
    tenantSlug: tenant === "neutral" ? null : tenant,
  };
}

function collapseAutofillSelection(event: FocusEvent<HTMLInputElement>) {
  const input = event.currentTarget;

  requestAnimationFrame(() => {
    const isFullySelected =
      input.selectionStart === 0 &&
      input.selectionEnd === input.value.length &&
      input.value.length > 0;

    if (isFullySelected) {
      input.setSelectionRange(input.value.length, input.value.length);
    }
  });
}

function getTenantTheme(tenant: TenantFlavor): TenantTheme {
  if (tenant === "light") {
    return {
      pageBg1: "#eef4ea",
      pageBg2: "#dcead8",
      pageGlow: "rgba(140, 201, 152, 0.26)",
      cardBg: "#07110d",
      cardShadow: "rgba(22, 53, 29, 0.18)",
      buttonFrom: "#6fcf97",
      buttonTo: "#8ee4af",
      buttonGlow: "rgba(126, 226, 169, 0.3)",
      skyTop: "#dff3e6",
      skyBottom: "#c8e4d0",
      mountainBack: "#b9d9a8",
      mountainFront: "#6ea28a",
      riverFill: "#f0f4ea",
      riverBorder: "#9cc58f",
      cloud: "#f5f7fb",
      panelChip: "#7fd49f",
    };
  }

  if (tenant === "shade") {
    return {
      pageBg1: "#e8edf5",
      pageBg2: "#d7dfeb",
      pageGlow: "rgba(112, 153, 211, 0.24)",
      cardBg: "#061018",
      cardShadow: "rgba(16, 37, 59, 0.2)",
      buttonFrom: "#4b7bec",
      buttonTo: "#6fa8ff",
      buttonGlow: "rgba(88, 147, 255, 0.3)",
      skyTop: "#dce9f7",
      skyBottom: "#bfd3eb",
      mountainBack: "#7e9acb",
      mountainFront: "#466eaa",
      riverFill: "#e8eef7",
      riverBorder: "#87a4cf",
      cloud: "#f5f7fb",
      panelChip: "#6e95eb",
    };
  }

  return {
    pageBg1: "#ece8ef",
    pageBg2: "#ddd7e4",
    pageGlow: "rgba(136, 110, 176, 0.22)",
    cardBg: "#04070e",
    cardShadow: "rgba(0, 0, 0, 0.25)",
    buttonFrom: "#5a67d8",
    buttonTo: "#6f7cf0",
    buttonGlow: "rgba(101, 116, 255, 0.28)",
    skyTop: "#d9dfeb",
    skyBottom: "#bec9dd",
    mountainBack: "#7b8ea8",
    mountainFront: "#4d6487",
    riverFill: "#d8deea",
    riverBorder: "#7d92ad",
    cloud: "#f5f7fb",
    panelChip: "#8d82de",
  };
}

async function validateProfile() {
  const { data, error } = await supabase.rpc("my_agent");

  if (error) {
    return { profile: null, error };
  }

  const profile = Array.isArray(data) ? data[0] : data;
  return { profile: profile ?? null, error: null };
}

function LandscapePanel({
  context,
  theme,
}: {
  context: ContextState;
  theme: TenantTheme;
}) {
  const copy = ROLE_COPY[context.role];
  const keywords = PANEL_KEYWORDS[context.role];

  return (
    <div className="flex h-full w-full items-center justify-center p-[22px]">
      <div
        className="relative min-h-[476px] w-full overflow-hidden rounded-[28px]"
        style={{
          background: `linear-gradient(180deg, ${theme.skyTop} 0%, ${theme.skyBottom} 100%)`,
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(180deg, ${theme.skyTop} 0%, ${theme.skyBottom} 100%)`,
          }}
        />

        <div
          className="absolute right-[38px] top-[26px] h-[30px] w-[86px] rounded-full"
          style={{ background: theme.cloud }}
        >
          <div
            className="absolute left-3 top-[-14px] h-[34px] w-[34px] rounded-full"
            style={{ background: theme.cloud }}
          />
          <div
            className="absolute right-2 top-[-18px] h-[38px] w-[38px] rounded-full"
            style={{ background: theme.cloud }}
          />
        </div>

        <div
          className="absolute left-[14px] top-[78px] h-[16px] w-[40px] rounded-full"
          style={{ background: theme.cloud }}
        >
          <div
            className="absolute left-[5px] top-[-7px] h-[18px] w-[18px] rounded-full"
            style={{ background: theme.cloud }}
          />
          <div
            className="absolute right-[5px] top-[-8px] h-[20px] w-[20px] rounded-full"
            style={{ background: theme.cloud }}
          />
        </div>

        <div
          className="absolute left-[60px] top-[70px] h-[210px] w-[520px] rounded-[50%]"
          style={{
            background: theme.mountainBack,
            transform: "rotate(-7deg)",
          }}
        />
        <div
          className="absolute left-[-16px] top-[122px] h-[220px] w-[560px] rounded-[50%]"
          style={{
            background: theme.mountainFront,
            transform: "rotate(2deg)",
          }}
        />

        {[
          { bottom: 164, height: 170 },
          { bottom: 56, height: 154 },
          { bottom: -36, height: 148 },
        ].map((river) => (
          <div
            key={`${river.bottom}-${river.height}`}
            className="absolute left-[-34px] right-[-34px] rounded-[50%/34%] border-[16px]"
            style={{
              bottom: `${river.bottom}px`,
              height: `${river.height}px`,
              background: theme.riverFill,
              borderColor: theme.riverBorder,
              transform: "rotate(7deg)",
            }}
          />
        ))}

        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.28, delay: 0.08, ease: "easeOut" }}
          className="absolute bottom-5 left-5 w-[292px] max-w-[calc(100%-40px)] rounded-[28px] border border-white/18 p-5 text-white shadow-[0_22px_46px_rgba(0,0,0,0.22)] backdrop-blur-2xl"
          style={{
            background:
              "linear-gradient(180deg, rgba(34,48,78,0.82) 0%, rgba(18,27,43,0.9) 100%)",
          }}
        >
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/86">
            <span
              className="inline-flex h-2.5 w-2.5 rounded-full"
              style={{ background: theme.panelChip }}
            />
            Vista CRM
          </div>

          <div className="mt-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/74">
            {copy.eyebrow}
          </div>

          <h2 className="mt-2 text-[1.45rem] font-semibold leading-tight text-white">
            {copy.title}
          </h2>

          <p className="mt-3 text-sm leading-7 text-white/88">{copy.summary}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            {keywords.map((keyword) => (
              <span
                key={keyword}
                className="rounded-full border border-white/18 bg-white/12 px-3 py-1 text-xs text-white/94"
              >
                {keyword}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 1024 : true,
  );

  const context = useMemo(() => buildContext(email), [email]);
  const theme = useMemo(() => getTenantTheme(context.tenant), [context.tenant]);
  const showPanel = context.tenant !== "neutral";
  const panelOnLeft = context.tenant === "shade";
  const cardOffset = isDesktop && showPanel ? (panelOnLeft ? -96 : 96) : 0;
  const desktopCardWidth = showPanel ? 920 : 520;

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 1024);

    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const footerText = "Acceso seguro a la plataforma comercial.";
  const buttonLabel = "Ingresar";

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { error: signInError } = await auth.signIn(email.trim(), password);

      if (signInError) {
        setError(signInError.message);
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
        setError("Tu cuenta esta desactivada. Contacta al administrador.");
      }
    } catch (submitError) {
      console.error(submitError);
      setError("Error inesperado. Intentalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const formPane = (
    <div className="flex min-w-0 flex-col justify-center px-[46px] py-[78px] text-white lg:w-[540px] lg:flex-none">
      <h1 className="mb-4 text-center text-[42px] font-bold tracking-tight">AK8 CRM</h1>
      <p className="mx-auto mb-8 max-w-[390px] text-center text-sm leading-6 text-white/62">
        Accede a tu espacio de trabajo con una entrada segura, clara y consistente.
      </p>

      <form onSubmit={handleSubmit} className="mx-auto w-full max-w-[390px]">
        <label htmlFor="login-email" className="sr-only">
          Email
        </label>
        <div
          className="mb-[18px] flex h-14 items-center gap-3 rounded-full border-2 px-5 transition"
          style={{
            borderColor: "rgba(255,255,255,0.22)",
            color: "rgba(255,255,255,0.55)",
          }}
        >
          <Mail className="h-4 w-4" />
          <input
            id="login-email"
            type="email"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              if (error) setError("");
            }}
            onFocus={collapseAutofillSelection}
            placeholder="tu@ak8crm.com"
            className="crm-login-input min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-white/42"
          />
        </div>

        <label htmlFor="login-password" className="sr-only">
          Password
        </label>
        <div
          className="mb-5 flex h-14 items-center gap-3 rounded-full border-2 px-5 transition"
          style={{
            borderColor: "rgba(255,255,255,0.22)",
            color: "rgba(255,255,255,0.55)",
          }}
        >
          <KeyRound className="h-4 w-4" />
          <input
            id="login-password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onFocus={collapseAutofillSelection}
            placeholder="Password"
            className="crm-login-input min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-white/42"
          />
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            className="text-white/56 transition hover:text-white"
            aria-label={showPassword ? "Ocultar contrasena" : "Mostrar contrasena"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        {error ? (
          <div className="mb-4 rounded-3xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-full border-none text-lg font-bold text-white transition hover:translate-y-[-2px] disabled:cursor-not-allowed disabled:opacity-70"
          style={{
            background: `linear-gradient(90deg, ${theme.buttonFrom}, ${theme.buttonTo})`,
            boxShadow: `0 0 30px ${theme.buttonGlow}`,
          }}
        >
          <span>{loading ? "Entrando..." : buttonLabel}</span>
          <ArrowRight className="h-4 w-4" />
        </button>

        <p className="mt-5 text-center text-sm text-white/72">
          Si necesitas acceso,{" "}
          <span className="font-semibold text-white">contacta al administrador del sistema</span>
        </p>

        <p className="mt-3 text-center text-xs uppercase tracking-[0.22em] text-white/46">
          {footerText}
        </p>
      </form>
    </div>
  );

  const panel = showPanel ? (
    <AnimatePresence initial={false}>
      <motion.div
        key={`${context.tenant}-${context.role}-${context.tenantSlug ?? "none"}`}
        initial={{ opacity: 0, x: panelOnLeft ? -40 : 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: panelOnLeft ? -28 : 28 }}
        transition={{ duration: 0.32, ease: "easeOut" }}
        className="hidden lg:block lg:w-[380px] lg:flex-none"
      >
        <LandscapePanel context={context} theme={theme} />
      </motion.div>
    </AnimatePresence>
  ) : null;

  return (
    <div
      className="relative flex min-h-screen flex-col overflow-hidden transition-[background] duration-500"
      style={{
        background: `radial-gradient(circle at 50% 88%, ${theme.pageGlow}, transparent 22%), linear-gradient(180deg, ${theme.pageBg1} 0%, ${theme.pageBg2} 100%)`,
      }}
    >
      <style>
        {`
          .crm-login-input:-webkit-autofill,
          .crm-login-input:-webkit-autofill:hover,
          .crm-login-input:-webkit-autofill:focus,
          .crm-login-input:-webkit-autofill:active {
            -webkit-text-fill-color: #ffffff !important;
            caret-color: #ffffff !important;
            box-shadow: 0 0 0 1000px ${theme.cardBg} inset !important;
            transition: background-color 9999s ease-in-out 0s;
          }
        `}
      </style>
      <div
        className="pointer-events-none absolute inset-0 hidden lg:block"
        style={{
          opacity: 0.18,
          backgroundImage:
            "linear-gradient(rgba(18,27,43,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(18,27,43,0.055) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          maskImage: "radial-gradient(circle at center, black 38%, transparent 88%)",
        }}
      />

      <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-10">
        <motion.div
          className="relative mx-auto w-full"
          style={{
            width: isDesktop ? `${desktopCardWidth}px` : "100%",
            maxWidth: "100%",
          }}
          animate={{
            x: cardOffset,
          }}
          transition={{ duration: 0.34, ease: "easeOut" }}
        >
          <div
            className={`overflow-hidden rounded-[34px] transition-all duration-500 ${
              showPanel ? "lg:grid" : "block"
            }`}
            style={{
              minHeight: 520,
              background: theme.cardBg,
              boxShadow: `0 22px 50px ${theme.cardShadow}`,
              gridTemplateColumns: showPanel
                ? panelOnLeft
                  ? "380px 540px"
                  : "540px 380px"
                : undefined,
            }}
          >
            {showPanel && panelOnLeft ? panel : null}
            {formPane}
            {showPanel && !panelOnLeft ? panel : null}
          </div>
        </motion.div>
      </div>

      <AppFooter note="Acceso seguro para usuarios de AK8 CRM." />
    </div>
  );
}
