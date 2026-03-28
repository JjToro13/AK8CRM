import {
  Shield,
  Eye,
  EyeOff,
  AlertTriangle,
  Users,
} from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../../lib/supabase";
import type { AgentRole } from "../../../shared/types/crm";
import { getAgentRoleLabel } from "../../../shared/types/crm";

interface SecurityInfoProps {
  isAdmin: boolean;
}

function roleLabel(role: AgentRole | null, isAdmin: boolean) {
  if (role) return getAgentRoleLabel(role);
  return isAdmin ? "Gestión" : "Usuario";
}

function roleDotClass(role: AgentRole | null, isAdmin: boolean) {
  if (role === "dev") return "bg-purple-500";
  if (role === "owner") return "bg-emerald-500";
  if (role === "manager") return "bg-green-500";
  if (role === "loader") return "bg-amber-500";
  if (role === "agent") return "bg-brand";
  return isAdmin ? "bg-green-500" : "bg-brand";
}

export default function SecurityInfo({ isAdmin }: SecurityInfoProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [userName, setUserName] = useState<string>("");
  const [role, setRole] = useState<AgentRole | null>(null);

  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const { data, error } = await supabase.rpc("my_agent");
        if (error) throw error;

        const agent = Array.isArray(data) ? data[0] : data;
        if (!agent) return;

        setUserName(agent.name || "Usuario");
        setRole((agent.role as AgentRole) ?? null);
      } catch (error) {
        console.error("Error cargando info de seguridad:", error);

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user?.user_metadata?.name) setUserName(user.user_metadata.name);
        else setUserName(user?.email?.split("@")[0] || "Usuario");
      }
    };

    loadUserInfo();
  }, []);

  const label = roleLabel(role, isAdmin);
  const dot = roleDotClass(role, isAdmin);
  const permissionItems =
    role === "dev"
      ? [
          "Acceso multi-tenant y cambio de operación activo.",
          "Gestión completa de usuarios y configuraciones críticas.",
          "Puede auditar datos operativos y resolver incidencias.",
        ]
      : role === "owner"
        ? [
            "Control total dentro de su tenant.",
            "Puede cambiar entre operaciones visibles de su tenant.",
            "Puede crear managers, loaders y agentes del tenant.",
          ]
        : role === "manager"
          ? [
              "Opera dentro de su operación activa.",
              "Puede revisar cartera, asignaciones y seguimiento comercial.",
              "No puede crear usuarios ni salir de su scope operativo.",
            ]
          : role === "loader"
            ? [
                "Acceso limitado a carga y preparación de datos.",
                "No debe operar flujos administrativos ni de asignación.",
                "Visibilidad restringida según el alcance de su operación.",
              ]
            : [
                "Gestiona clientes y seguimiento dentro de su scope.",
                "Acceso restringido a datos sensibles según RLS.",
                "No puede administrar usuarios ni configuraciones críticas.",
              ];

  return (
    <div className="crm-shell-card rounded-[1.5rem] border border-border bg-surface p-6 shadow-soft sm:p-7">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-brand" />
          <h2 className="text-base sm:text-lg font-semibold tracking-tight text-ink">
            Informacion de Seguridad
          </h2>
        </div>

        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-brand hover:opacity-90 text-sm font-semibold inline-flex items-center gap-2 transition"
        >
          {showDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {showDetails ? "Ocultar" : "Mostrar"} detalles
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full mr-3 ${dot}`} />
          <div>
            {userName && <div className="text-sm font-semibold text-ink">{userName}</div>}
            <span className="text-sm font-medium text-muted">{label}</span>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {showDetails && (
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
              className="space-y-4 border-t border-border pt-4"
            >
              <div>
                <h3 className="text-sm font-semibold text-ink mb-2">Permisos de {label}:</h3>
                <ul className="text-sm text-muted space-y-1">
                  {permissionItems.map((item) => (
                    <li key={item} className="flex items-center">
                      <Users className="h-3 w-3 text-brand mr-2" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-yellow-200/90 bg-yellow-50/90 p-3 backdrop-blur-sm">
                <div className="flex items-start">
                  <AlertTriangle className="h-4 w-4 text-yellow-700 mr-2 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-yellow-900">Seguridad de Datos</h4>
                    <p className="text-xs text-yellow-800/80 mt-1">
                      Los datos estan protegidos por RLS y segmentados por tenant y
                      operacion. Solo perfiles autorizados pueden acceder a
                      informacion completa.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-brand/20 bg-brand/10 p-3 backdrop-blur-sm">
                <div className="flex items-start">
                  <Shield className="h-4 w-4 text-brand mr-2 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-ink">Alcance Operativo</h4>
                    <p className="text-xs text-muted mt-1">
                      El acceso visual y operativo se ajusta al rol activo para
                      mantener separadas gestion, carga y ejecucion comercial.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
