import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  Copy,
  KeyRound,
  Save,
  Shield,
  UserPlus,
} from "lucide-react";
import { appEnv, buildSupabaseFunctionUrl } from "../../../config/env";
import { useAuth } from "../../../hooks/useAuth";
import { Agent, getAgentRoleLabel, supabase } from "../../../lib/supabase";
import {
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalPanel,
  modalPrimaryActionClassName,
  modalSecondaryActionClassName,
} from "../../../shared/components/layout/ModalLayout";
import LoadingSpinner from "../../../shared/components/feedback/LoadingSpinner";
import { notify } from "../../../shared/lib/notify";
import Field from "../../../shared/components/ui/Field";
import Input from "../../../shared/components/ui/Input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../shared/components/ui/Select";

type Mode = "create" | "edit";
type Props = {
  mode: Mode;
  agent: Agent | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
};

type RoleOption = Agent["role"];

function getAssignableRoles(
  viewerRole: Agent["role"] | null | undefined,
  mode: Mode,
  currentRole: Agent["role"] | null | undefined,
): RoleOption[] {
  switch (viewerRole) {
    case "dev":
      if (mode === "edit" && currentRole === "dev") {
        return ["dev", "owner", "manager", "loader", "agent"];
      }
      return ["owner", "manager", "loader", "agent"];
    case "owner":
      return ["manager", "loader", "agent"];
    default:
      return [];
  }
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function normUsername(value: string) {
  return value
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
    () => getAssignableRoles(viewerRole, mode, agent?.role),
    [agent?.role, mode, viewerRole],
  );

  const [name, setName] = useState("");
  const [role, setRole] = useState<RoleOption>("agent");
  const [isActive, setIsActive] = useState(true);
  const [username, setUsername] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [tenantSlug, setTenantSlug] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const title = isEdit ? "Editar usuario" : "Crear usuario";
  const pillBtn =
    "inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-ink/80 " +
    "hover:bg-surface2 transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/15 disabled:opacity-50 disabled:cursor-not-allowed";

  useEffect(() => {
    if (!isOpen) return;

    setTenantSlug("");
    setError("");
    setSaving(false);

    const run = async () => {
      if (isEdit || !effectiveOperationId) return;

      const { data: operationData, error: operationError } = await supabase
        .from("operations")
        .select("tenant_id")
        .eq("id", effectiveOperationId)
        .maybeSingle();

      if (operationError) {
        console.warn("[operations] error:", operationError);
        return;
      }

      const targetTenantId = operationData?.tenant_id ?? null;
      if (!targetTenantId) return;

      const { data: tenantData, error: tenantError } = await supabase
        .from("tenants")
        .select("slug")
        .eq("id", targetTenantId)
        .maybeSingle();

      if (tenantError) {
        console.warn("[tenants] error:", tenantError);
        return;
      }

      setTenantSlug(String(tenantData?.slug ?? "").trim());
    };

    void run();
  }, [effectiveOperationId, isEdit, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    setError("");
    setSaving(false);

    if (isEdit && agent) {
      setName(agent.name ?? "");
      setRole(agent.role ?? "agent");
      setIsActive(agent.is_active !== false);
      setUsername("");
      setTempPassword("");
      return;
    }

    setName("");
    setRole(assignableRoles[0] ?? "agent");
    setIsActive(true);
    setUsername("");
    setTempPassword("");
  }, [agent, assignableRoles, isEdit, isOpen]);

  useEffect(() => {
    if (!assignableRoles.includes(role)) {
      setRole(assignableRoles[0] ?? "agent");
    }
  }, [assignableRoles, role]);

  const usernameNorm = useMemo(() => normUsername(username), [username]);
  const requiresOperationContext = role !== "dev";

  const emailPreview = useMemo(() => {
    if (isEdit) return agent?.email ?? "";
    if (!usernameNorm || usernameNorm.length < 3) return "";
    if (!requiresOperationContext || !tenantSlug.trim()) return "";
    return `${usernameNorm}.${role}@${tenantSlug.trim()}.ak8crm.com`;
  }, [agent?.email, isEdit, requiresOperationContext, role, tenantSlug, usernameNorm]);

  const canSubmit = () => {
    if (!name.trim()) return false;
    if (assignableRoles.length === 0) return false;

    if (!isEdit) {
      if (usernameNorm.length < 3) return false;
      if (requiresOperationContext && (!effectiveOperationId || !tenantSlug)) {
        return false;
      }

      if (tempPassword.trim().length < 6) return false;
    }

    return true;
  };

  const copyEmail = async () => {
    if (!emailPreview) return;

    try {
      await navigator.clipboard.writeText(emailPreview);
      notify.copied("Email");
    } catch (copyError) {
      console.warn("No se pudo copiar el email:", copyError);
      notify.error("No se pudo copiar el email");
    }
  };

  const save = async () => {
    setError("");

    if (!canSubmit()) {
      if (!isEdit && tempPassword.trim().length > 0 && tempPassword.trim().length < 6) {
        setError("La contrasena temporal debe tener minimo 6 caracteres.");
        return;
      }

      setError("Completa los campos requeridos.");
      return;
    }

    setSaving(true);

    try {
      if (isEdit) {
        if (!agent?.id) throw new Error("No hay usuario seleccionado.");

        const { error: rpcError } = await supabase.rpc("upsert_agent", {
          p_id: agent.id,
          p_name: name.trim(),
          p_role: role,
          p_is_active: isActive,
        });

        if (rpcError) throw rpcError;

        notify.success(
          "Usuario actualizado",
          "Los cambios del usuario se guardaron correctamente.",
        );
        onSaved();
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("No hay una sesion activa.");

      const payload = {
        name: name.trim(),
        username: usernameNorm,
        role,
        password: tempPassword.trim(),
        is_active: isActive,
        operation_id: requiresOperationContext ? effectiveOperationId : null,
      };

      const response = await fetch(buildSupabaseFunctionUrl("create-agent"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: appEnv.supabase.anonKey,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const raw = await response.text();
      let json: any = null;

      try {
        json = raw ? JSON.parse(raw) : null;
      } catch {
        json = null;
      }

      if (!response.ok || json?.success === false) {
        const details = json?.details ? ` - ${json.details}` : "";
        throw new Error(json?.error ? `${json.error}${details}` : raw || `HTTP ${response.status}`);
      }

      notify.success(
        "Usuario creado",
        "El nuevo usuario quedo registrado correctamente.",
      );
      onSaved();
    } catch (saveError: any) {
      console.error(saveError);
      setError(saveError?.message || "Error guardando usuario");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) {
        onClose();
      }
    };

    if (!isOpen) return;

    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    window.dispatchEvent(
      new CustomEvent("am:submodal", { detail: { open: true } }),
    );

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
      window.dispatchEvent(
        new CustomEvent("am:submodal", { detail: { open: false } }),
      );
    };
  }, [isOpen, onClose, saving]);

  const onBackdropMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (saving) return;
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6"
      onMouseDown={onBackdropMouseDown}
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[3px]" />

      <ModalPanel className="relative max-w-xl rounded-[1.5rem]">
        <ModalHeader
          icon={
            isEdit ? (
              <Shield className="h-5 w-5 text-brand" />
            ) : (
              <UserPlus className="h-5 w-5 text-brand" />
            )
          }
          title={title}
          description={
            isEdit
              ? "Actualiza nombre, rol y estado del usuario."
              : "Crea un usuario nuevo y genera su correo por tenant."
          }
          onClose={() => !saving && onClose()}
          closeDisabled={saving}
        />

        <ModalBody className="space-y-5">
          {error ? (
            <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4" />
              <span className="font-semibold">{error}</span>
            </div>
          ) : null}

          {!isEdit && requiresOperationContext && !tenantSlug ? (
            <div className="rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
              No se pudo cargar el tenant de la operacion activa. Verifica que
              tengas una operacion seleccionada.
            </div>
          ) : null}

          <Field label="Nombre" required>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={saving}
              placeholder="Ej: Juan Perez"
              autoComplete="off"
            />
          </Field>

          {!isEdit ? (
            <div className="space-y-2">
              <Field label="Username" required>
                <Input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  disabled={saving}
                  placeholder="Alias para generar el correo"
                  autoComplete="off"
                />
              </Field>

              <p className="text-xs text-muted">
                Permitido: letras, numeros y <span className="font-mono">_</span>.
                Minimo 3 caracteres.
              </p>

              <div className="rounded-2xl border border-border bg-surface2 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-1 text-[11px] text-muted">
                      Correo generado
                    </div>
                    <div className="break-all font-mono text-sm text-ink">
                      {emailPreview || "-"}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={copyEmail}
                    disabled={!emailPreview || saving}
                    className={cn(pillBtn, "px-3 py-2")}
                    title="Copiar correo"
                  >
                    <Copy className="h-4 w-4" />
                    <span className="hidden sm:inline">Copiar</span>
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          <Field label="Rol" required>
            <Select
              value={role}
              onValueChange={(value) => setRole(value as RoleOption)}
              disabled={saving || assignableRoles.length === 0}
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

          {!isEdit ? (
            <Field label="Contrasena temporal" required>
              <div className="relative">
                <KeyRound className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <Input
                  className="pl-11"
                  value={tempPassword}
                  onChange={(event) => setTempPassword(event.target.value)}
                  disabled={saving}
                  placeholder="Minimo 6 caracteres"
                  type="password"
                  autoComplete="new-password"
                  minLength={6}
                />
              </div>

              <p className="mt-2 text-xs text-muted">
                El usuario podra cambiarla despues de iniciar sesion.
              </p>
            </Field>
          ) : null}

          <div className="flex items-center justify-between rounded-2xl border border-border bg-surface2 p-4">
            <div>
              <div className="text-sm font-semibold text-ink/80">Activo</div>
              <div className="mt-1 text-xs text-muted">
                Si lo desactivas, no podra iniciar sesion.
              </div>
            </div>

            <label
              className="inline-flex cursor-pointer select-none items-center gap-2"
              htmlFor="isActive"
            >
              <input
                id="isActive"
                type="checkbox"
                checked={isActive}
                onChange={(event) => setIsActive(event.target.checked)}
                disabled={saving}
                aria-label="Cambiar estado activo"
              />
            </label>
          </div>
        </ModalBody>

        <ModalFooter className="gap-2">
          <button
            type="button"
            className={modalSecondaryActionClassName}
            onClick={onClose}
            disabled={saving}
          >
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
                <Save className="h-4 w-4" />
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
