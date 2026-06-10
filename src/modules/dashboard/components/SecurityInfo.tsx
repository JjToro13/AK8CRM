import { Shield, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { AgentRole } from "../../../shared/types/crm";
import { getAgentRoleLabel } from "../../../shared/types/crm";
import { cn } from "../../../lib/utils";
import { useAuth } from "../../../hooks/useAuth";
import {
  dashboardCardClass,
  dashboardSubTextClass,
  dashboardTitleClass,
} from "./dashboardUi";

interface SecurityInfoProps {
  isAdmin: boolean;
  mode?: "card" | "inline" | "menu";
  menuStats?: {
    today: number;
    inProgress: number;
    recent: number;
  };
}

function roleLabel(role: AgentRole | null, isAdmin: boolean) {
  if (role) return getAgentRoleLabel(role);
  return isAdmin ? "Gestion" : "Usuario";
}

function roleDotClass(role: AgentRole | null, isAdmin: boolean) {
  if (role === "dev") return "bg-purple-500";
  if (role === "owner") return "bg-emerald-500";
  if (role === "manager") return "bg-green-500";
  if (role === "loader") return "bg-amber-500";
  if (role === "agent") return "bg-brand";
  return isAdmin ? "bg-green-500" : "bg-brand";
}

function scopeLabel(role: AgentRole | null, isAdmin: boolean) {
  if (role === "dev") return "Multi-tenant";
  if (role === "owner") return "Tenant";
  if (role === "manager") return "Operacion";
  if (role === "loader") return "Carga";
  if (role === "agent") return "Comercial";
  return isAdmin ? "Gestion" : "Workspace";
}

export default function SecurityInfo({
  isAdmin,
  mode = "card",
  menuStats,
}: SecurityInfoProps) {
  const { user, role: authRole } = useAuth();
  const [showDetails, setShowDetails] = useState(false);
  const role = authRole as AgentRole | null;
  const userName =
    user?.user_metadata?.name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Usuario";

  const label = roleLabel(role, isAdmin);
  const dot = roleDotClass(role, isAdmin);
  const scope = scopeLabel(role, isAdmin);
  const permissionItems =
    role === "dev"
      ? [
          "Acceso multi-tenant",
          "Control de usuarios",
          "Auditoria operativa",
        ]
      : role === "owner"
        ? [
            "Control total del tenant",
            "Cambio de operacion visible",
            "Creacion de equipos",
          ]
        : role === "manager"
          ? [
              "Scope de operacion activa",
              "Revision comercial",
              "Sin acceso critico",
            ]
          : role === "loader"
            ? [
                "Carga y preparacion de datos",
                "Sin flujos administrativos",
                "Visibilidad restringida",
              ]
            : [
                "Seguimiento comercial",
                "Acceso protegido por RLS",
                "Sin administracion critica",
              ];

  if (mode === "inline") {
    return (
      <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-[11px] text-muted shadow-[0_10px_28px_rgba(17,24,39,0.06)]">
        <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
        <span className="font-semibold text-ink/85">{userName || "Usuario"}</span>
        <span className="text-muted">/</span>
        <span className="font-medium text-muted">{label}</span>
        <span className="crm-security-chip rounded-full border border-white/72 bg-white/60 px-2.5 py-1 font-semibold text-brand/80">
          {scope}
        </span>
      </div>
    );
  }

  if (mode === "menu") {
    return (
      <div className="crm-security-menu-card rounded-[1.25rem] border border-white/82 bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(255,255,255,0.68))] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
          Sesion activa
        </div>

        <div className="mt-2 flex items-center gap-3">
          <div className={`h-3 w-3 rounded-full ${dot}`} />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-ink">
              {userName || "Usuario"}
            </div>
            <div className="mt-1 text-xs text-muted">
              {label} / {scope}
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="crm-security-menu-stat rounded-[1rem] border border-white/84 bg-white/82 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
              Hoy
            </div>
            <div className="mt-1 text-sm font-semibold text-ink">
              {menuStats?.today ?? 0}
            </div>
          </div>

          <div className="crm-security-menu-stat rounded-[1rem] border border-white/84 bg-white/82 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
              En curso
            </div>
            <div className="mt-1 text-sm font-semibold text-ink">
              {menuStats?.inProgress ?? 0}
            </div>
          </div>

          <div className="crm-security-menu-stat rounded-[1rem] border border-white/84 bg-white/82 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
              Reciente
            </div>
            <div className="mt-1 text-sm font-semibold text-ink">
              {menuStats?.recent ?? 0}
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="crm-security-chip rounded-full border border-white/84 bg-white/78 px-2.5 py-1 text-[11px] text-ink/78">
            {permissionItems[0]}
          </span>
        </div>
      </div>
    );
  }

  return (
    <section className={cn(dashboardCardClass, "overflow-hidden")}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center rounded-full border border-brand/15 bg-brand/[0.06] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
            Identidad activa
          </div>
          <h2 className={cn(dashboardTitleClass, "mt-4")}>Seguridad y alcance</h2>
          <p className={cn(dashboardSubTextClass, "mt-1")}>
            Lectura compacta del perfil y del alcance efectivo actual.
          </p>
        </div>

        <button
          onClick={() => setShowDetails((current) => !current)}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-2 text-xs font-semibold text-brand transition hover:bg-surface2"
        >
          {showDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {showDetails ? "Ocultar" : "Ver"} detalle
        </button>
      </div>

      <div className="mt-5 rounded-[1.35rem] border border-border bg-surface2/50 p-4">
        <div className="flex items-center gap-3">
          <div className={`h-3 w-3 rounded-full ${dot}`} />
          <div className="min-w-0">
            <div className="truncate text-base font-semibold text-ink">
              {userName || "Usuario"}
            </div>
            <div className="mt-1 text-sm text-muted">
              {label} / {scope}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {permissionItems.map((item) => (
            <span
              key={item}
              className="crm-security-chip rounded-full border border-white/72 bg-white/58 px-3 py-1.5 text-xs text-ink/78"
            >
              {item}
            </span>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {showDetails ? (
          <motion.div
            initial={{ opacity: 0, y: 8, filter: "blur(6px)" }}
            animate={{
              opacity: 1,
              y: 0,
              filter: "blur(0px)",
              transition: { type: "spring", stiffness: 240, damping: 22 },
            }}
            exit={{
              opacity: 0,
              y: 8,
              filter: "blur(6px)",
              transition: { duration: 0.18 },
            }}
            className="mt-4 grid gap-3 lg:grid-cols-2"
          >
            <div className="rounded-[1.25rem] border border-yellow-200/90 bg-yellow-50/90 p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-yellow-700" />
                <div>
                  <h3 className="text-sm font-semibold text-yellow-900">
                    Seguridad de datos
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-yellow-800/80">
                    Los datos se segmentan por tenant, operacion y RLS. La vista
                    y la capacidad de accion cambian segun el rol activo.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[1.25rem] border border-brand/18 bg-brand/[0.06] p-4">
              <div className="flex items-start gap-2">
                <Shield className="mt-0.5 h-4 w-4 text-brand" />
                <div>
                  <h3 className="text-sm font-semibold text-ink">
                    Alcance operativo
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-muted">
                    El sistema protege configuracion, carga y ejecucion comercial
                    como superficies separadas para evitar cruces no deseados.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
