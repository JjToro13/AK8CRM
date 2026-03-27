import {
  Shield,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
  MessageSquare,
  Settings,
  Users,
  Trash2,
} from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../../lib/supabase";

interface SecurityInfoProps {
  isAdmin: boolean;
}

type AppRole = "dev" | "super_admin" | "admin" | "agent" | null;

function roleLabel(role: AppRole, isAdmin: boolean) {
  if (role === "dev") return "Developer";
  if (role === "super_admin") return "Super Admin";
  if (role === "admin") return "Administrador";
  if (role === "agent") return "Agente";
  return isAdmin ? "Administrador" : "Agente";
}

function roleDotClass(role: AppRole, isAdmin: boolean) {
  if (role === "dev") return "bg-purple-500";
  if (role === "super_admin") return "bg-emerald-500";
  if (role === "admin") return "bg-green-500";
  if (role === "agent") return "bg-brand";
  return isAdmin ? "bg-green-500" : "bg-brand";
}

export default function SecurityInfo({ isAdmin }: SecurityInfoProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [userName, setUserName] = useState<string>("");
  const [role, setRole] = useState<AppRole>(null);

  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const { data, error } = await supabase.rpc("my_agent");
        if (error) throw error;

        const agent = Array.isArray(data) ? data[0] : data;
        if (!agent) return;

        setUserName(agent.name || "Usuario");
        setRole((agent.role as AppRole) ?? null);
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

  return (
    <div className="rounded-[1.5rem] border border-border bg-surface shadow-soft p-6 sm:p-7">
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
              className="space-y-4 pt-4 border-t border-border"
            >
              <div>
                <h3 className="text-sm font-semibold text-ink mb-2">Permisos de {label}:</h3>
                <ul className="text-sm text-muted space-y-1">
                  {isAdmin ? (
                    <>
                      <li className="flex items-center">
                        <Users className="h-3 w-3 text-green-600 mr-2" />
                        Acceso a datos de clientes segun tu operacion
                      </li>
                      <li className="flex items-center">
                        <Lock className="h-3 w-3 text-green-600 mr-2" />
                        Puede ver datos completos (segun RLS)
                      </li>
                      <li className="flex items-center">
                        <Settings className="h-3 w-3 text-green-600 mr-2" />
                        Gestion de clientes (crear, editar, eliminar) segun permisos
                      </li>
                      <li className="flex items-center">
                        <MessageSquare className="h-3 w-3 text-green-600 mr-2" />
                        Anadir y editar comentarios
                      </li>
                      <li className="flex items-center">
                        <Trash2 className="h-3 w-3 text-green-600 mr-2" />
                        Eliminar clientes (si aplica)
                      </li>
                      <li className="flex items-center">
                        <Lock className="h-3 w-3 text-green-600 mr-2" />
                        Importar / Exportar listas (si aplica)
                      </li>
                    </>
                  ) : (
                    <>
                      <li className="flex items-center">
                        <Users className="h-3 w-3 text-brand mr-2" />
                        Ver datos de clientes asignados
                      </li>
                      <li className="flex items-center">
                        <Lock className="h-3 w-3 text-red-600 mr-2" />
                        Acceso restringido a datos sensibles
                      </li>
                      <li className="flex items-center">
                        <MessageSquare className="h-3 w-3 text-brand mr-2" />
                        Anadir y editar comentarios de clientes asignados
                      </li>
                      <li className="flex items-center">
                        <Settings className="h-3 w-3 text-brand mr-2" />
                        Cambiar estado/color de clientes
                      </li>
                      <li className="flex items-center">
                        <Trash2 className="h-3 w-3 text-red-600 mr-2" />
                        No puede eliminar clientes
                      </li>
                    </>
                  )}
                </ul>
              </div>

              <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-3">
                <div className="flex items-start">
                  <AlertTriangle className="h-4 w-4 text-yellow-700 mr-2 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-yellow-900">Seguridad de Datos</h4>
                    <p className="text-xs text-yellow-800/80 mt-1">
                      Los datos estan protegidos por RLS y segmentados por operacion. Solo
                      perfiles autorizados pueden acceder a informacion completa.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-brand/20 bg-brand/5 p-3">
                <div className="flex items-start">
                  <Shield className="h-4 w-4 text-brand mr-2 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-ink">Llamadas Enmascaradas</h4>
                    <p className="text-xs text-muted mt-1">
                      Las llamadas se realizan a traves de un numero proxy para proteger la
                      privacidad de agentes y clientes.
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
