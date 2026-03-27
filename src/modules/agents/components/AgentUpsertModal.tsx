// AgentUpsertModal.tsx - Modal premium para crear/editar agentes
// ✅ Portal + am:submodal (apaga modal padre)
// ✅ Overlay blur + panel premium alineado a Dashboard Modal
// ✅ ESC + click afuera
// ✅ UI premium (bg-surface, bg-surface2, rounded 2xl, pill buttons)

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Save,
  AlertCircle,
  UserPlus,
  Copy,
  Shield,
  KeyRound,
} from "lucide-react";
import { Agent, getAgentRoleLabel, supabase } from "../../../lib/supabase";
import { appEnv, buildSupabaseFunctionUrl } from "../../../config/env";
import LoadingSpinner from "../../../shared/components/feedback/LoadingSpinner";
import { useAuth } from "../../../hooks/useAuth";
import { notify } from "../../../shared/lib/notify";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../shared/components/ui/Select";
import Field from "../../../shared/components/ui/Field";
import Input from "../../../shared/components/ui/Input";
import {
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalPanel,
  modalPrimaryActionClassName,
  modalSecondaryActionClassName,
} from "../../../shared/components/layout/ModalLayout";

type Mode = "create" | "edit";

type Props = {
  mode: Mode;
  agent: Agent | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
};

type RoleOption = "agent" | "admin" | "super_admin";

function getAssignableRoles(viewerRole: Agent["role"] | null | undefined): RoleOption[] {
  switch (viewerRole) {
    case "dev":
      return ["agent", "admin", "super_admin"];
    case "super_admin":
      return ["agent", "admin"];
    case "admin":
      return ["agent"];
    default:
      return [];
  }
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function normUsername(v: string) {
  return v
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9_]/g, "");
}

export default function AgentUpsertModal({
  mode,
  agent,
  isOpen,
  onClose,
  onSaved,
}: Props) {
  const isEdit = mode === "edit";
  const { activeOperationId, operationId, role: viewerRole } = useAuth();
  const effectiveOperationId = activeOperationId ?? operationId ?? null;
  const assignableRoles = useMemo(
    () => getAssignableRoles(viewerRole),
    [viewerRole],
  );

  const [name, setName] = useState("");
  const [role, setRole] = useState<RoleOption>("agent");
  const [isActive, setIsActive] = useState(true);
  const [useSadminSuffix, setUseSadminSuffix] = useState(true);

  // create-only
  const [username, setUsername] = useState("");
  const [tempPassword, setTempPassword] = useState("");

  // slug para preview correo
  const [operationSlug, setOperationSlug] = useState<string>("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const title = isEdit ? "Editar agente" : "Crear agente";

  // estilos premium
  const pillBtn =
    "inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-ink/80 " +
    "hover:bg-surface2 transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/15 disabled:opacity-50 disabled:cursor-not-allowed";

  // cargar slug al abrir (solo create)
  useEffect(() => {
    if (!isOpen) return;

    setOperationSlug("");
    setError("");
    setSaving(false);

    const run = async () => {
      if (isEdit) return;
      if (!effectiveOperationId) return;

      const { data, error } = await supabase.rpc("operation_slug", {
        p_operation_id: effectiveOperationId,
      });

      if (error) {
        console.warn("[operation_slug] error:", error);
        setOperationSlug("");
        return;
      }

      setOperationSlug(String(data ?? "").trim());
    };

    void run();
  }, [isOpen, isEdit, effectiveOperationId]);

  // set values al abrir
  useEffect(() => {
    if (!isOpen) return;

    setError("");
    setSaving(false);

    if (isEdit && agent) {
      setName(agent.name ?? "");
      setRole((agent.role as RoleOption) ?? "agent");
      setIsActive(agent.is_active !== false);
      setUseSadminSuffix(true);

      setUsername("");
      setTempPassword("");
    } else {
      setName("");
      setRole(assignableRoles[0] ?? "agent");
      setIsActive(true);
      setUseSadminSuffix(true);

      setUsername("");
      setTempPassword("");
    }
  }, [isOpen, isEdit, agent, assignableRoles]);

  useEffect(() => {
    if (!assignableRoles.includes(role)) {
      setRole(assignableRoles[0] ?? "agent");
    }
  }, [assignableRoles, role]);

  const usernameNorm = useMemo(() => normUsername(username), [username]);
  const usesOperationScopedEmail = role !== "super_admin";
  const superAdminEmailPreview = useMemo(() => {
    if (!usernameNorm || usernameNorm.length < 3) return "";
    const localPart = useSadminSuffix ? `${usernameNorm}.sadmin` : usernameNorm;
    return `${localPart}@call-master.com`;
  }, [usernameNorm, useSadminSuffix]);

  const emailPreview = useMemo(() => {
    if (role === "super_admin") {
      return superAdminEmailPreview;
    }

    const slug = operationSlug.trim();
    if (!slug) return "";
    if (!usernameNorm || usernameNorm.length < 3) return "";
    return `${usernameNorm}.${role}@${slug}.call-master.com`;
  }, [usernameNorm, role, operationSlug, superAdminEmailPreview]);

  const canSubmit = () => {
    if (!name.trim()) return false;

    if (!isEdit) {
      if (usernameNorm.length < 3) return false;
      if (usesOperationScopedEmail) {
        if (!effectiveOperationId) return false;
        if (!operationSlug) return false;
      }

      const pass = tempPassword.trim();
      if (pass.length < 6) return false;
    }

    return true;
  };

  const copyEmail = async () => {
    if (!emailPreview) return;
    try {
      await navigator.clipboard.writeText(emailPreview);
      notify.copied("Email");
    } catch (e) {
      console.warn("No se pudo copiar al portapapeles:", e);
      notify.error("No se pudo copiar el email");
    }
  };

  const save = async () => {
    setError("");

    if (!canSubmit()) {
      if (!isEdit) {
        const pass = tempPassword.trim();
        if (pass.length > 0 && pass.length < 6) {
          setError("La contraseña temporal debe tener mínimo 6 caracteres.");
          return;
        }
      }
      setError("Completa los campos requeridos.");
      return;
    }

    setSaving(true);

    try {
      // EDIT
      if (isEdit) {
        if (!agent?.id) throw new Error("No hay agente seleccionado.");

        const { error: rpcErr } = await supabase.rpc("upsert_agent", {
          p_id: agent.id,
          p_name: name.trim(),
          p_role: role,
          p_is_active: isActive,
        });

        if (rpcErr) throw rpcErr;

        notify.success(
          "Agente actualizado",
          "Los cambios del agente se guardaron correctamente.",
        );
        onSaved();
        return;
      }

      // CREATE (debug fetch)
      const payload = {
        name: name.trim(),
        username: role === "super_admin" ? undefined : usernameNorm,
        email: role === "super_admin" ? emailPreview : undefined,
        role,
        password: tempPassword.trim(),
        is_active: isActive,
        operation_id: usesOperationScopedEmail ? effectiveOperationId : null,
      };

      const { data: sess } = await supabase.auth.getSession();
      const token = sess?.session?.access_token;
      if (!token) throw new Error("No hay sesión activa (token).");

      const res = await fetch(buildSupabaseFunctionUrl("create-agent"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: appEnv.supabase.anonKey,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const txt = await res.text();
      console.log("[create-agent] status:", res.status);
      console.log("[create-agent] raw:", txt);

      let j: any = null;
      try {
        j = txt ? JSON.parse(txt) : null;
      } catch {
        // ignore
      }

      if (!res.ok) {
        if (j?.error) {
          throw new Error(j.details ? `${j.error} — ${j.details}` : j.error);
        }
        throw new Error(txt || `HTTP ${res.status}`);
      }

      if (j?.success === false) {
        throw new Error(
          j.details ? `${j.error} — ${j.details}` : j.error || "No se pudo crear el agente",
        );
      }

      notify.success(
        "Agente creado",
        "El nuevo agente quedó registrado correctamente.",
      );
      onSaved();
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Error guardando agente");
    } finally {
      setSaving(false);
    }
  };

  // click afuera
  const onBackdropMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !saving) onClose();
  };

  // ESC
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose, saving]);

  // apaga modal padre (Dashboard Modal)
  useEffect(() => {
    if (!isOpen) return;

    window.dispatchEvent(
      new CustomEvent("am:submodal", { detail: { open: true } }),
    );

    return () => {
      window.dispatchEvent(
        new CustomEvent("am:submodal", { detail: { open: false } }),
      );
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[120] p-4 sm:p-6 flex items-center justify-center"
      onMouseDown={onBackdropMouseDown}
      role="dialog"
      aria-modal="true"
    >
      {/* overlay premium */}
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[3px]" />

      <ModalPanel className="relative max-w-xl rounded-[1.5rem]">
        <ModalHeader
          icon={
            isEdit ? (
              <Shield className="w-5 h-5 text-brand" />
            ) : (
              <UserPlus className="w-5 h-5 text-brand" />
            )
          }
          title={title}
          description={isEdit ? "Actualiza nombre, rol y estado." : "Crea un usuario y genera su correo."}
          onClose={() => !saving && onClose()}
          closeDisabled={saving}
        />

        <ModalBody className="space-y-5">
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          {!isEdit && usesOperationScopedEmail && !operationSlug && (
            <div className="rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
              No se pudo cargar el <b>slug</b> de la operación. Verifica que tengas
              una operación activa.
            </div>
          )}

          {/* Nombre */}
          <Field label="Nombre" required>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={saving}
              placeholder="Ej: Juan Pérez"
              autoComplete="off"
            />
          </Field>

          {/* Username + correo generado */}
          {!isEdit && (
            <div className="space-y-2">
              <Field label="Apodo (username)" required>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={saving}
                  placeholder="Apodo para generar el correo"
                  autoComplete="off"
                />
              </Field>

              <p className="text-xs text-muted">
                Permitido: letras/números y <span className="font-mono">_</span>{" "}
                (mín 3).
              </p>

              {role === "super_admin" ? (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface2 px-4 py-3 text-sm text-ink/80">
                  <div>
                    <label htmlFor="useSadminSuffix" className="font-semibold">
                      Usar sufijo `.sadmin`
                    </label>
                    <div className="text-xs text-muted mt-1">
                      Activo: `{usernameNorm || "usuario"}.sadmin@call-master.com` <br/> Inactivo: `{usernameNorm || "usuario"}@call-master.com`
                    </div>
                  </div>

                  <input
                    id="useSadminSuffix"
                    type="checkbox"
                    checked={useSadminSuffix}
                    onChange={(e) => setUseSadminSuffix(e.target.checked)}
                    disabled={saving}
                  />
                </div>
              ) : null}

              <div className="mt-2 rounded-2xl border border-border bg-surface2 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[11px] text-muted mb-1">
                      Correo generado
                    </div>
                    <div className="font-mono text-sm text-ink break-all">
                      {emailPreview || "—"}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={copyEmail}
                    disabled={!emailPreview || saving}
                    className={cn(pillBtn, "px-3 py-2")}
                    title="Copiar correo"
                  >
                    <Copy className="w-4 h-4" />
                    <span className="hidden sm:inline">Copiar</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Rol */}
          <Field label="Rol" required>
            <Select
              value={role}
              onValueChange={(value) => setRole(value as RoleOption)}
              disabled={saving}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un rol" />
              </SelectTrigger>

              <SelectContent>
                {assignableRoles.map((roleOption) => (
                  <SelectItem key={roleOption} value={roleOption}>
                    {getAgentRoleLabel(roleOption)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {/* Password */}
          {!isEdit && (
            <div>
            <Field label="Contraseña temporal" required>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-muted absolute left-4 top-1/2 -translate-y-1/2" />
                <Input
                  className="pl-11"
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                  disabled={saving}
                  placeholder="Mínimo 6 caracteres"
                  type="password"
                  autoComplete="new-password"
                  minLength={6}
                />
              </div>

              <p className="text-xs text-muted mt-2">
                El agente podrá cambiarla después de iniciar sesión.
              </p>
            </Field>
            </div>
          )}

          {/* Activo */}
          <div className="rounded-2xl border border-border bg-surface2 p-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-ink/80">Activo</div>
              <div className="text-xs text-muted mt-1">
                Si lo desactivas, no podrá iniciar sesión.
              </div>
            </div>

            <label
              className="inline-flex items-center gap-2 cursor-pointer select-none"
              htmlFor="isActive"
            >
              <input
                id="isActive"
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                disabled={saving}
                aria-label="Cambiar estado activo"
              />
            </label>
          </div>
        </ModalBody>

        <ModalFooter className="gap-2">
          <button type="button" className={modalSecondaryActionClassName} onClick={onClose} disabled={saving}>
            Cancelar
          </button>

          <button
            type="button"
            className={modalPrimaryActionClassName}
            onClick={save}
            disabled={saving || !canSubmit()}
          >
            {saving ? (
              <LoadingSpinner size="sm" text="Guardando..." fullScreen={false} />
            ) : (
              <>
                <Save className="w-4 h-4" />
                Guardar
              </>
            )}
          </button>
        </ModalFooter>
      </ModalPanel>
    </div>,
    document.body,
  );
}
