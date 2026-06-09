import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import QRCode from "qrcode";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  Phone,
  Plus,
  RefreshCw,
  Settings,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { Link } from "react-router-dom";
import AppFooter from "../../../shared/components/layout/AppFooter";
import PageHeader, {
  pageHeaderActionClassName,
} from "../../../shared/components/layout/PageHeader";
import PageStage from "../../../shared/components/layout/PageStage";
import LoadingSpinner from "../../../shared/components/feedback/LoadingSpinner";
import { dashboard } from "../../dashboard/services/dashboard.service";
import { admin } from "../services/admin.service";
import type {
  AdminOperationOption,
  AdminTenantOption,
  OperationDeletePreview,
  Operation2faEnrollment,
  OperationSecuritySettings,
  TenantClientStatusDefinition,
  TenantAdminSettings,
} from "../types/admin.types";
import { notify } from "../../../shared/lib/notify";
import { cn } from "../../../lib/utils";

type PrivacyToggleProps = {
  checked: boolean;
  description: string;
  disabled?: boolean;
  icon: typeof Phone;
  label: string;
  onChange: (checked: boolean) => void;
};

function PrivacyToggle({
  checked,
  description,
  disabled = false,
  icon: Icon,
  label,
  onChange,
}: PrivacyToggleProps) {
  return (
    <div className="rounded-[1.25rem] border border-border bg-surface2 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-brand/15 bg-brand/[0.08] text-brand">
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-ink">{label}</div>
            <p className="mt-1 text-sm leading-6 text-muted">{description}</p>
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={checked}
          disabled={disabled}
          onClick={() => onChange(!checked)}
          title={checked ? "Oculto" : "Visible"}
          className={cn(
            "relative h-9 w-16 shrink-0 rounded-full border transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/18 disabled:cursor-not-allowed disabled:opacity-60",
            checked
              ? "border-brand/35 bg-brand"
              : "border-white/70 bg-white/80",
          )}
        >
          <span
            className={cn(
              "absolute top-1 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-[0_8px_18px_rgba(15,23,42,0.16)] transition",
              checked ? "left-8" : "left-1",
            )}
          >
            {checked ? (
              <EyeOff className="h-4 w-4 text-brand" />
            ) : (
              <Eye className="h-4 w-4 text-slate-500" />
            )}
          </span>
        </button>
      </div>
    </div>
  );
}

export default function AdminPanelPage() {
  const tenantStatusColorOptions = [
    { value: "slate", label: "Slate" },
    { value: "sky", label: "Sky" },
    { value: "emerald", label: "Emerald" },
    { value: "blue", label: "Blue" },
    { value: "rose", label: "Rose" },
    { value: "amber", label: "Amber" },
    { value: "yellow", label: "Yellow" },
    { value: "violet", label: "Violet" },
    { value: "zinc", label: "Zinc" },
  ] as const;
  const [tenants, setTenants] = useState<AdminTenantOption[]>([]);
  const [operations, setOperations] = useState<AdminOperationOption[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [selectedOperationId, setSelectedOperationId] = useState<string | null>(
    null,
  );
  const [settings, setSettings] = useState<TenantAdminSettings | null>(null);
  const [securitySettings, setSecuritySettings] =
    useState<OperationSecuritySettings | null>(null);
  const [securityLoading, setSecurityLoading] = useState(false);
  const [securitySaving, setSecuritySaving] = useState(false);
  const [setupData, setSetupData] = useState<Operation2faEnrollment | null>(null);
  const [setupCode, setSetupCode] = useState("");
  const [setupQrDataUrl, setSetupQrDataUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newOperationName, setNewOperationName] = useState("");
  const [newOperationSlug, setNewOperationSlug] = useState("");
  const [deletePreview, setDeletePreview] =
    useState<OperationDeletePreview | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [tenantStatuses, setTenantStatuses] = useState<TenantClientStatusDefinition[]>([]);
  const [statusesLoading, setStatusesLoading] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [newStatusCode, setNewStatusCode] = useState("");
  const [newStatusLabel, setNewStatusLabel] = useState("");
  const [newStatusDescription, setNewStatusDescription] = useState("");
  const [newStatusColor, setNewStatusColor] = useState("slate");
  const [error, setError] = useState("");

  const selectedTenant = useMemo(
    () => tenants.find((tenant) => tenant.id === selectedTenantId) ?? null,
    [selectedTenantId, tenants],
  );

  const selectedTenantName =
    selectedTenant?.product_name?.trim() ||
    selectedTenant?.name ||
    "Tenant seleccionado";

  const selectedTenantOperations = useMemo(
    () =>
      operations.filter((operation) => operation.tenant_id === selectedTenantId),
    [operations, selectedTenantId],
  );

  const selectedOperation = useMemo(
    () =>
      selectedTenantOperations.find(
        (operation) => operation.id === selectedOperationId,
      ) ?? null,
    [selectedOperationId, selectedTenantOperations],
  );
  const operationLimitReached = selectedTenantOperations.length >= 3;
const operationLimitMessage =
    "Este tenant alcanzo el limite de 3 operaciones. Comunicate con el administrador para establecer nuevos limites de bases de datos y de procesamiento de informacion.";
  const changeWarning =
    "Cambios en proceso: algunas funciones pueden dar resultados no deseados mientras se termina la estabilizacion.";
  const adminInputClassName =
    "mt-2 h-11 w-full rounded-2xl border border-border bg-surface px-3 text-sm font-medium text-ink outline-none transition placeholder:text-muted/60 focus:border-brand/40 focus:ring-4 focus:ring-brand/15 disabled:cursor-not-allowed disabled:opacity-60";

  const loadTenantStatuses = useCallback(async (tenantId: string | null) => {
    if (!tenantId) {
      setTenantStatuses([]);
      return;
    }

    setStatusesLoading(true);
    const { data, error: statusesError } = await admin.listTenantClientStatuses(
      tenantId,
    );
    setStatusesLoading(false);

    if (statusesError) {
      setError(statusesError.message);
      setTenantStatuses([]);
      return;
    }

    setTenantStatuses(data ?? []);
  }, []);

  const loadPanel = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const tenantsResult = await dashboard.getVisibleTenants();

      if (tenantsResult.error) {
        setError(tenantsResult.error.message);
        setTenants([]);
        setSelectedTenantId(null);
        return;
      }

      const nextTenants = tenantsResult.data ?? [];
      setTenants(nextTenants);

      setSelectedTenantId((currentTenantId) =>
        nextTenants.find((tenant) => tenant.id === currentTenantId)?.id ??
        nextTenants[0]?.id ??
        null,
      );

      const operationsResult = await dashboard.getOperationsByTenant(null);

      if (operationsResult.error) {
        setError(operationsResult.error.message);
        setOperations([]);
        return;
      }

      setOperations(operationsResult.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadOperationSettings = useCallback(async (operationId: string | null) => {
    if (!operationId) {
      setSettings(null);
      return;
    }

    setError("");
    const { data, error: settingsError } =
      await admin.getOperationSettings(operationId);

    if (settingsError) {
      setError(settingsError.message);
      setSettings(null);
      return;
    }

    setSettings(data);
  }, []);

  const loadOperationSecuritySettings = useCallback(
    async (operationId: string | null) => {
      if (!operationId) {
        setSecuritySettings(null);
        setSetupData(null);
        setSetupCode("");
        return;
      }

      setSecurityLoading(true);
      const { data, error: securityError } =
        await admin.getOperationSecuritySettings(operationId);

      setSecurityLoading(false);

      if (securityError) {
        setError(securityError.message);
        setSecuritySettings(null);
        return;
      }

      setSecuritySettings(data);
    },
    [],
  );

  useEffect(() => {
    void loadPanel();
  }, [loadPanel]);

  useEffect(() => {
    setSelectedOperationId((currentOperationId) =>
      selectedTenantOperations.find(
        (operation) => operation.id === currentOperationId,
      )?.id ??
      selectedTenantOperations[0]?.id ??
      null,
    );
  }, [selectedTenantOperations]);

  useEffect(() => {
    void loadOperationSettings(selectedOperationId);
  }, [loadOperationSettings, selectedOperationId]);

  useEffect(() => {
    void loadOperationSecuritySettings(selectedOperationId);
  }, [loadOperationSecuritySettings, selectedOperationId]);

  useEffect(() => {
    void loadTenantStatuses(selectedTenantId);
  }, [loadTenantStatuses, selectedTenantId]);

  useEffect(() => {
    setDeleteOpen(false);
    setDeletePreview(null);
    setDeleteConfirmation("");
  }, [selectedOperationId]);

  useEffect(() => {
    let cancelled = false;

    if (!setupData?.otpauth_uri) {
      setSetupQrDataUrl("");
      return;
    }

    QRCode.toDataURL(setupData.otpauth_uri, {
      errorCorrectionLevel: "M",
      margin: 2,
      scale: 6,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    })
      .then((dataUrl) => {
        if (!cancelled) {
          setSetupQrDataUrl(dataUrl);
        }
      })
      .catch((qrError) => {
        console.error("[operation-2fa] QR error:", qrError);
        if (!cancelled) {
          setSetupQrDataUrl("");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [setupData?.otpauth_uri]);

  const updatePrivacy = async (next: {
    maskPhoneNumbers?: boolean;
    maskEmails?: boolean;
  }) => {
    if (!selectedOperationId || !settings) return;

    const nextPhone =
      next.maskPhoneNumbers ?? settings.client_phone_masked ?? false;
    const nextEmail = next.maskEmails ?? settings.client_email_masked ?? false;

    setSaving(true);
    setError("");

    const { data, error: updateError } = await admin.updateClientPrivacy({
      operationId: selectedOperationId,
      maskPhoneNumbers: nextPhone,
      maskEmails: nextEmail,
    });

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      notify.error("No se pudo guardar la privacidad de la operacion");
      return;
    }

    setSettings((current) =>
      current
        ? {
            ...current,
            client_phone_masked:
              data?.client_phone_masked ?? current.client_phone_masked,
            client_email_masked:
              data?.client_email_masked ?? current.client_email_masked,
          }
        : current,
    );
    notify.success("Privacidad actualizada");
    window.dispatchEvent(new CustomEvent("cm:operation-settings-changed"));
  };

  const handleOperationNameChange = (value: string) => {
    setNewOperationName(value);

    if (!newOperationSlug.trim()) {
      setNewOperationSlug(
        value
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9_-]+/g, "-")
          .replace(/^-+|-+$/g, ""),
      );
    }
  };

  const handleCreateOperation = async (event: FormEvent) => {
    event.preventDefault();

    if (!selectedTenantId) return;

    if (operationLimitReached) {
      setError(operationLimitMessage);
      notify.error("Limite de operaciones alcanzado");
      return;
    }

    setCreating(true);
    setError("");

    const { data, error: createError } = await admin.createOperation({
      tenantId: selectedTenantId,
      name: newOperationName,
      slug: newOperationSlug,
    });

    setCreating(false);

    if (createError) {
      const message = String(createError.message ?? "");
      const isLimitError =
        message.toLowerCase().includes("operation limit reached") ||
        message.toLowerCase().includes("limite") ||
        message.toLowerCase().includes("limit");

      setError(isLimitError ? operationLimitMessage : createError.message);
      notify.error(
        isLimitError
          ? "Limite de operaciones alcanzado"
          : "No se pudo crear la operacion",
      );
      return;
    }

    if (data) {
      setOperations((current) => [...current, data]);
      setSelectedOperationId(data.id);
      setNewOperationName("");
      setNewOperationSlug("");
      notify.success("Operacion creada");
    }
  };

  const handleStart2faEnrollment = async () => {
    if (!selectedOperationId) return;

    setSecuritySaving(true);
    setError("");

    const { data, error: startError } =
      await admin.startOperation2faEnrollment(selectedOperationId);

    setSecuritySaving(false);

    if (startError || !data) {
      setError(startError?.message ?? "No se pudo preparar el autenticador");
      notify.error("No se pudo preparar el autenticador");
      return;
    }

    setSetupData(data);
    setSetupCode("");
    notify.success("Autenticador listo para confirmar");
    void loadOperationSecuritySettings(selectedOperationId);
  };

  const handleConfirm2faEnrollment = async (event: FormEvent) => {
    event.preventDefault();

    if (!selectedOperationId || !setupData) return;

    setSecuritySaving(true);
    setError("");

    const { error: confirmError } = await admin.confirmOperation2faEnrollment({
      operationId: selectedOperationId,
      setupId: setupData.setup_id,
      code: setupCode,
    });

    setSecuritySaving(false);

    if (confirmError) {
      setError(confirmError.message);
      notify.error("Codigo invalido o expirado");
      return;
    }

    setSetupData(null);
    setSetupCode("");
    setSetupQrDataUrl("");
    notify.success("Autenticador activado");
    void loadOperationSecuritySettings(selectedOperationId);
  };

  const handleDisable2fa = async () => {
    if (!selectedOperationId) return;

    setSecuritySaving(true);
    setError("");

    const { error: disableError } =
      await admin.disableOperation2fa(selectedOperationId);

    setSecuritySaving(false);

    if (disableError) {
      setError(disableError.message);
      notify.error("No se pudo desactivar 2FA");
      return;
    }

    setSetupData(null);
    setSetupCode("");
    setSetupQrDataUrl("");
    notify.success("Autenticador desactivado");
    void loadOperationSecuritySettings(selectedOperationId);
  };

  const handleOpenDeleteOperation = async () => {
    if (!selectedOperationId) return;

    setDeleteLoading(true);
    setError("");

    const { data, error: previewError } =
      await admin.getOperationDeletePreview(selectedOperationId);

    setDeleteLoading(false);

    if (previewError || !data) {
      setError(previewError?.message ?? "No se pudo preparar la eliminacion");
      notify.error("No se pudo preparar la eliminacion");
      return;
    }

    setDeletePreview(data);
    setDeleteConfirmation("");
    setDeleteOpen(true);
  };

  const handleDeleteOperation = async (event: FormEvent) => {
    event.preventDefault();

    if (!selectedOperationId || !deletePreview) return;

    setDeleteLoading(true);
    setError("");

    const { error: deleteError } = await admin.deleteOperation({
      operationId: selectedOperationId,
      confirmation: deleteConfirmation,
    });

    setDeleteLoading(false);

    if (deleteError) {
      const hint = "hint" in deleteError ? String(deleteError.hint ?? "") : "";
      setError(hint || deleteError.message);
      notify.error("No se pudo eliminar la operacion");
      return;
    }

    const deletedOperationId = selectedOperationId;
    setOperations((current) =>
      current.filter((operation) => operation.id !== deletedOperationId),
    );
    setDeleteOpen(false);
    setDeletePreview(null);
    setDeleteConfirmation("");
    notify.success("Operacion eliminada");
    window.dispatchEvent(new CustomEvent("cm:operation-settings-changed"));
  };

  const handleCreateTenantStatus = async (event: FormEvent) => {
    event.preventDefault();

    if (!selectedTenantId) return;

    setStatusSaving(true);
    setError("");

    const { error: createError } = await admin.createTenantClientStatus({
      tenantId: selectedTenantId,
      code: newStatusCode.trim().toUpperCase(),
      label: newStatusLabel.trim(),
      description: newStatusDescription.trim(),
      colorToken: newStatusColor,
    });

    setStatusSaving(false);

    if (createError) {
      setError(createError.message);
      notify.error("No se pudo crear la tipificacion");
      return;
    }

    setNewStatusCode("");
    setNewStatusLabel("");
    setNewStatusDescription("");
    setNewStatusColor("slate");
    notify.success("Tipificacion creada");
    void loadTenantStatuses(selectedTenantId);
    window.dispatchEvent(new CustomEvent("cm:operation-settings-changed"));
  };

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <PageHeader
        icon={<Settings className="h-5 w-5 text-brand" />}
        title="Panel de Administrador"
        subtitle={<span className="text-xs text-muted">Control por tenant</span>}
        actions={
          <>
            <Link to="/dashboard" className={pageHeaderActionClassName}>
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Link>
            <button
              type="button"
              className={pageHeaderActionClassName}
              onClick={() => void loadPanel()}
              disabled={loading || saving}
            >
              {loading ? (
                <LoadingSpinner size="sm" text="" fullScreen={false} />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Recargar
            </button>
          </>
        }
        meta={
          <div className="inline-flex items-center gap-2 rounded-full border border-brand/15 bg-brand/[0.08] px-4 py-2 text-xs font-semibold text-brand">
            <ShieldCheck className="h-4 w-4" />
            Owner scope
          </div>
        }
      />

      <main className="w-full flex-1">
        <PageStage tone="brand" contentClassName="space-y-6">
          {error ? (
            <div className="rounded-[1.25rem] border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
              {error}
            </div>
          ) : null}

          <div className="rounded-[1.25rem] border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
            {changeWarning}
          </div>

          {loading ? (
            <div className="rounded-[1.5rem] border border-border bg-surface p-8">
              <LoadingSpinner
                size="sm"
                text="Cargando administracion..."
                fullScreen={false}
              />
            </div>
          ) : (
            <div className="grid gap-6 xl:grid-cols-[minmax(17rem,22rem)_1fr]">
              <section className="rounded-[1.5rem] border border-border bg-surface p-4 shadow-soft">
                <div className="px-1">
                  <div className="inline-flex items-center rounded-full border border-brand/15 bg-brand/[0.06] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
                    Tenants visibles
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted">
                    Selecciona el tenant que quieres administrar dentro de tu
                    alcance.
                  </p>
                </div>

                <div className="mt-4 space-y-2">
                  {tenants.map((tenant) => {
                    const tenantName =
                      tenant.product_name?.trim() || tenant.name || tenant.slug;
                    const selected = tenant.id === selectedTenantId;

                    return (
                      <button
                        key={tenant.id}
                        type="button"
                        onClick={() => setSelectedTenantId(tenant.id)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-[1.1rem] border px-3 py-3 text-left transition",
                          selected
                            ? "border-brand/30 bg-brand/[0.1]"
                            : "border-transparent bg-surface2 hover:border-brand/18",
                        )}
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-brand/15 bg-brand/[0.08] text-brand">
                          <Building2 className="h-4 w-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-ink">
                            {tenantName}
                          </span>
                          <span className="block truncate text-xs text-muted">
                            {tenant.slug}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-[1.5rem] border border-border bg-surface p-5 shadow-soft sm:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="inline-flex items-center rounded-full border border-brand/15 bg-brand/[0.06] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
                      Operacion seleccionada
                    </div>
                    <h2 className="mt-4 text-xl font-semibold tracking-tight text-ink">
                      {selectedOperation?.name ?? selectedTenantName}
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                      Estos toggles se guardan por operacion. Un owner solo
                      puede cambiar operaciones de su tenant; developer puede
                      administrar todos los tenants visibles.
                    </p>
                  </div>

                  <div className="rounded-[1.25rem] border border-border bg-surface2 px-4 py-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                      Tenant
                    </div>
                    <div className="mt-2 max-w-[12rem] truncate text-sm font-semibold text-ink">
                      {selectedTenantName} · {selectedTenantOperations.length}/3
                    </div>
                  </div>
                </div>

                <div className="mt-6 rounded-[1.25rem] border border-brand/25 bg-brand/[0.08] p-4 shadow-[0_18px_50px_rgba(37,99,235,0.08)]">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-brand/25 bg-brand text-white">
                        <CheckCircle2 className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
                          Activa ahora
                        </div>
                        <div className="mt-1 truncate text-lg font-semibold text-ink">
                          {selectedOperation?.name ?? "Sin operacion"}
                        </div>
                        <div className="truncate text-xs font-medium text-muted">
                          {selectedOperation?.slug ?? "Selecciona una operacion"}
                        </div>
                      </div>
                    </div>
                    <div className="inline-flex w-fit items-center rounded-full border border-brand/20 bg-surface px-3 py-1 text-xs font-semibold text-brand">
                      Los cambios afectan solo esta operacion
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(15rem,20rem)_1fr]">
                  <div className="rounded-[1.25rem] border border-border bg-surface2 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                      Operaciones
                    </div>
                    <div className="mt-3 space-y-2">
                      {selectedTenantOperations.map((operation) => {
                        const selected = operation.id === selectedOperationId;

                        return (
                          <button
                            key={operation.id}
                            type="button"
                            onClick={() => setSelectedOperationId(operation.id)}
                            className={cn(
                              "flex w-full items-center justify-between gap-3 rounded-[1rem] border px-3 py-3 text-left transition",
                              selected
                                ? "border-brand/55 bg-brand/[0.14] shadow-[inset_0_0_0_1px_rgba(96,165,250,0.2)]"
                                : "border-white/55 bg-surface hover:border-brand/18",
                            )}
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-ink">
                                {operation.name}
                              </span>
                              <span className="block truncate text-xs text-muted">
                                {operation.slug}
                              </span>
                            </span>
                            {selected ? (
                              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-brand/25 bg-brand/[0.12] px-2 py-1 text-[11px] font-semibold text-brand">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Seleccionada
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                      {selectedTenantOperations.length === 0 ? (
                        <span className="text-sm text-muted">
                          No hay operaciones visibles.
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <form
                    onSubmit={handleCreateOperation}
                    className="rounded-[1.25rem] border border-border bg-surface2 p-4"
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                      <Plus className="h-4 w-4 text-brand" />
                      Crear operacion
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <label className="block">
                        <span className="text-xs font-semibold text-muted">
                          Nombre
                        </span>
                        <input
                          type="text"
                          value={newOperationName}
                          onChange={(event) =>
                            handleOperationNameChange(event.target.value)
                          }
                          className={adminInputClassName}
                          placeholder="AK8 Light operation"
                          disabled={creating || !selectedTenantId}
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs font-semibold text-muted">
                          Slug
                        </span>
                        <input
                          type="text"
                          value={newOperationSlug}
                          onChange={(event) =>
                            setNewOperationSlug(event.target.value)
                          }
                          className={adminInputClassName}
                          placeholder="ak8-light-operation"
                          disabled={creating || !selectedTenantId}
                        />
                      </label>
                    </div>
                    {operationLimitReached ? (
                      <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-900">
                        {operationLimitMessage}
                      </p>
                    ) : null}
                    <button
                      type="submit"
                      disabled={
                        creating ||
                        operationLimitReached ||
                        !selectedTenantId ||
                        !newOperationName.trim() ||
                        !newOperationSlug.trim()
                      }
                      className="mt-4 inline-flex min-h-[42px] items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {creating ? (
                        <LoadingSpinner size="sm" text="" fullScreen={false} />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                      Crear operacion
                    </button>
                  </form>
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-[1.25rem] border border-border bg-surface2 p-4 lg:col-span-2">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="text-sm font-semibold text-ink">
                          Tipificaciones del tenant
                        </div>
                        <p className="mt-1 text-sm leading-6 text-muted">
                          Las globales permanecen visibles para todos. Las que crees
                          aqui solo aplican al tenant{" "}
                          <span className="font-semibold text-ink">
                            {selectedTenantName}
                          </span>
                          .
                        </p>
                      </div>

                      <div className="rounded-full border border-brand/15 bg-brand/[0.08] px-3 py-1 text-xs font-semibold text-brand">
                        {statusesLoading
                          ? "Cargando..."
                          : `${tenantStatuses.length} tipificaciones visibles`}
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {tenantStatuses.map((status) => (
                        <div
                          key={status.id}
                          className="rounded-full border border-border bg-surface px-3 py-2 text-xs"
                        >
                          <span className="font-semibold text-ink">
                            {status.code}
                          </span>
                          {" · "}
                          <span className="text-muted">{status.label}</span>
                          {" · "}
                          <span
                            className={cn(
                              "font-semibold",
                              status.is_global ? "text-brand" : "text-ink/70",
                            )}
                          >
                            {status.is_global ? "Global" : "Tenant"}
                          </span>
                        </div>
                      ))}
                    </div>

                    <form
                      onSubmit={handleCreateTenantStatus}
                      className="mt-5 rounded-[1.1rem] border border-border bg-surface p-4"
                    >
                      <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                        <Plus className="h-4 w-4 text-brand" />
                        Crear tipificacion para este tenant
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <label className="block">
                          <span className="text-xs font-semibold text-muted">
                            Codigo
                          </span>
                          <input
                            type="text"
                            value={newStatusCode}
                            onChange={(event) =>
                              setNewStatusCode(
                                event.target.value
                                  .toUpperCase()
                                  .replace(/[^A-Z0-9_]/g, ""),
                              )
                            }
                            className={adminInputClassName}
                            placeholder="EX: VC"
                            maxLength={20}
                            disabled={statusSaving || !selectedTenantId}
                          />
                        </label>

                        <label className="block">
                          <span className="text-xs font-semibold text-muted">
                            Nombre
                          </span>
                          <input
                            type="text"
                            value={newStatusLabel}
                            onChange={(event) =>
                              setNewStatusLabel(event.target.value)
                            }
                            className={adminInputClassName}
                            placeholder="Ej. Volver a contactar"
                            disabled={statusSaving || !selectedTenantId}
                          />
                        </label>

                        <label className="block">
                          <span className="text-xs font-semibold text-muted">
                            Color
                          </span>
                          <select
                            value={newStatusColor}
                            onChange={(event) => setNewStatusColor(event.target.value)}
                            className={adminInputClassName}
                            disabled={statusSaving || !selectedTenantId}
                          >
                            {tenantStatusColorOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="block">
                          <span className="text-xs font-semibold text-muted">
                            Descripcion
                          </span>
                          <input
                            type="text"
                            value={newStatusDescription}
                            onChange={(event) =>
                              setNewStatusDescription(event.target.value)
                            }
                            className={adminInputClassName}
                            placeholder="Que representa esta tipificacion"
                            disabled={statusSaving || !selectedTenantId}
                          />
                        </label>
                      </div>

                      <button
                        type="submit"
                        disabled={
                          statusSaving ||
                          !selectedTenantId ||
                          !newStatusCode.trim() ||
                          !newStatusLabel.trim()
                        }
                        className="mt-4 inline-flex min-h-[42px] items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {statusSaving ? (
                          <LoadingSpinner size="sm" text="" fullScreen={false} />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                        Crear tipificacion
                      </button>
                    </form>
                  </div>

                  <PrivacyToggle
                    checked={Boolean(settings?.client_phone_masked)}
                    description="Oculta parcialmente los numeros cuando se muestran en vistas operativas."
                    disabled={saving || !settings || !selectedOperationId}
                    icon={Phone}
                    label="Ofuscar telefonos"
                    onChange={(checked) =>
                      void updatePrivacy({ maskPhoneNumbers: checked })
                    }
                  />
                  <PrivacyToggle
                    checked={Boolean(settings?.client_email_masked)}
                    description="Oculta parcialmente los correos cuando se muestran en fichas y resultados."
                    disabled={saving || !settings || !selectedOperationId}
                    icon={Mail}
                    label="Ofuscar correos"
                    onChange={(checked) =>
                      void updatePrivacy({ maskEmails: checked })
                    }
                  />
                </div>

                <div className="mt-6 rounded-[1.25rem] border border-border bg-surface2 p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-brand/15 bg-brand/[0.08] text-brand">
                      {settings?.client_phone_masked ||
                      settings?.client_email_masked ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </span>
                    <div>
                      <div className="text-sm font-semibold text-ink">
                        Estado actual
                      </div>
                      <p className="mt-1 text-sm text-muted">
                        {settings?.client_phone_masked ? (
                          <EyeOff className="mr-1 inline h-4 w-4 text-brand" />
                        ) : (
                          <Eye className="mr-1 inline h-4 w-4 text-muted" />
                        )}
                        Telefonos{" "}
                        {settings?.client_phone_masked ? "ofuscados" : "visibles"}
                        {" · "}
                        {settings?.client_email_masked ? (
                          <EyeOff className="mr-1 inline h-4 w-4 text-brand" />
                        ) : (
                          <Eye className="mr-1 inline h-4 w-4 text-muted" />
                        )}
                        Correos{" "}
                        {settings?.client_email_masked ? "ofuscados" : "visibles"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 rounded-[1.25rem] border border-border bg-surface2 p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-brand/15 bg-brand/[0.08] text-brand">
                        <KeyRound className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-ink">
                          Seguridad de operacion
                        </div>
                        <p className="mt-1 text-sm leading-6 text-muted">
                          Autenticador TOTP compatible con Google Authenticator.
                          El secret es compartido por esta operacion y debe
                          quedar bajo control del owner.
                        </p>
                        <p className="mt-2 text-xs font-semibold text-muted">
                          Estado:{" "}
                          {securityLoading
                            ? "cargando..."
                            : securitySettings?.totp_enabled
                              ? "activo"
                              : "inactivo"}
                          {securitySettings?.totp_rotated_at
                            ? ` · rotado ${new Date(
                                securitySettings.totp_rotated_at,
                              ).toLocaleDateString()}`
                            : ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void handleStart2faEnrollment()}
                        disabled={
                          securitySaving || securityLoading || !selectedOperationId
                        }
                        className="inline-flex min-h-[42px] items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-ink/82 transition hover:border-brand/24 hover:bg-surface2 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {securitySaving ? (
                          <LoadingSpinner size="sm" text="" fullScreen={false} />
                        ) : (
                          <KeyRound className="h-4 w-4 text-brand" />
                        )}
                        {securitySettings?.totp_enabled
                          ? "Regenerar autenticador"
                          : "Configurar autenticador"}
                      </button>

                      {securitySettings?.totp_enabled ? (
                        <button
                          type="button"
                          onClick={() => void handleDisable2fa()}
                          disabled={securitySaving || securityLoading}
                          className="inline-flex min-h-[42px] items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Desactivar
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {setupData ? (
                    <form
                      onSubmit={handleConfirm2faEnrollment}
                      className="mt-5 rounded-[1.1rem] border border-brand/18 bg-surface p-4"
                    >
                      <div className="text-sm font-semibold text-ink">
                        Confirmar Google Authenticator
                      </div>
                      <p className="mt-2 text-sm leading-6 text-muted">
                        Escanea el QR con Google Authenticator o agrega la clave
                        manual. Luego ingresa el codigo de 6 digitos.
                      </p>
                      <div className="mt-4 grid gap-4 md:grid-cols-[12rem_1fr]">
                        <div className="flex h-48 w-48 items-center justify-center rounded-3xl border border-border bg-white p-3 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                          {setupQrDataUrl ? (
                            <img
                              src={setupQrDataUrl}
                              alt="QR de Google Authenticator"
                              className="h-full w-full"
                            />
                          ) : (
                            <LoadingSpinner
                              size="sm"
                              text="Generando QR..."
                              fullScreen={false}
                            />
                          )}
                        </div>

                        <div>
                          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                            Clave manual
                          </div>
                          <div className="mt-2 rounded-2xl border border-border bg-surface2 px-3 py-2 font-mono text-sm font-semibold tracking-[0.14em] text-ink">
                            {setupData.secret}
                          </div>
                          <p className="mt-2 text-xs leading-5 text-muted">
                            Conserva esta clave solo mientras configuras el
                            autenticador. Al confirmar, no volvera a mostrarse.
                          </p>
                        </div>
                      </div>
                      <details className="mt-3 text-xs text-muted">
                        <summary className="cursor-pointer font-semibold text-ink/70">
                          Ver URI otpauth
                        </summary>
                        <div className="mt-2 break-all rounded-2xl border border-border bg-surface2 p-3 font-mono">
                          {setupData.otpauth_uri}
                        </div>
                      </details>
                      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={setupCode}
                          onChange={(event) => setSetupCode(event.target.value)}
                          className="h-11 w-full rounded-2xl border border-border bg-surface px-3 text-sm font-semibold tracking-[0.2em] text-ink outline-none transition placeholder:text-muted/60 focus:border-brand/40 focus:ring-4 focus:ring-brand/15 disabled:cursor-not-allowed disabled:opacity-60 sm:max-w-[14rem]"
                          placeholder="000000"
                          maxLength={6}
                          disabled={securitySaving}
                        />
                        <button
                          type="submit"
                          disabled={securitySaving || setupCode.trim().length !== 6}
                          className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Confirmar y activar
                        </button>
                      </div>
                    </form>
                  ) : null}
                </div>

                <div className="mt-6 rounded-[1.25rem] border border-red-400/30 bg-red-500/[0.08] p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-red-400/30 bg-surface text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-ink">
                          Eliminar operacion
                        </div>
                        <p className="mt-1 text-sm leading-6 text-muted">
                          Revisa dependencias antes de borrar. Si existen
                          campanas, clientes o citas, se eliminan junto con la
                          operacion despues de confirmar la frase exacta.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => void handleOpenDeleteOperation()}
                      disabled={deleteLoading || !selectedOperationId}
                      className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-full border border-red-400/40 bg-surface px-4 py-2 text-sm font-semibold text-red-500 transition hover:bg-red-500/[0.1] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {deleteLoading ? (
                        <LoadingSpinner size="sm" text="" fullScreen={false} />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      Preparar eliminacion
                    </button>
                  </div>

                  {deleteOpen && deletePreview ? (
                    <form
                      onSubmit={handleDeleteOperation}
                      className="mt-5 rounded-[1.1rem] border border-red-400/30 bg-surface p-4"
                    >
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-ink">
                            Confirmacion requerida
                          </div>
                          <p className="mt-1 text-sm leading-6 text-muted">
                            Esta accion es irreversible para{" "}
                            <span className="font-semibold">
                              {deletePreview.operation_name}
                            </span>
                            . Campanas: {deletePreview.campaign_count};
                            clientes: {deletePreview.client_count}; citas:{" "}
                            {deletePreview.scheduled_call_count}.
                          </p>
                          {deletePreview.assigned_agent_count > 0 ? (
                            <p className="mt-2 rounded-2xl border border-red-400/30 bg-red-500/[0.08] px-3 py-2 text-xs font-semibold leading-5 text-red-500">
                              Hay {deletePreview.assigned_agent_count} agente(s)
                              asignados como base a esta operacion. Muevelos o
                              desactivalos antes de eliminarla.
                            </p>
                          ) : null}
                          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-red-500">
                            Escribe exactamente
                          </p>
                          <div className="mt-2 break-all rounded-2xl border border-red-400/30 bg-red-500/[0.08] px-3 py-2 font-mono text-sm font-semibold text-ink">
                            {deletePreview.confirmation_phrase}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-col gap-3 lg:flex-row">
                        <input
                          type="text"
                          value={deleteConfirmation}
                          onChange={(event) =>
                            setDeleteConfirmation(event.target.value)
                          }
                          className="h-11 w-full rounded-2xl border border-red-400/30 bg-surface px-3 text-sm font-semibold text-ink outline-none transition placeholder:text-muted/60 focus:border-red-400 focus:ring-4 focus:ring-red-400/15 disabled:cursor-not-allowed disabled:opacity-60"
                          placeholder={deletePreview.confirmation_phrase}
                          disabled={
                            deleteLoading || deletePreview.assigned_agent_count > 0
                          }
                        />
                        <button
                          type="submit"
                          disabled={
                            deleteLoading ||
                            deletePreview.assigned_agent_count > 0 ||
                            deleteConfirmation.trim() !==
                              deletePreview.confirmation_phrase
                          }
                          className="inline-flex min-h-[42px] shrink-0 items-center justify-center gap-2 rounded-full bg-red-700 px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Trash2 className="h-4 w-4" />
                          Eliminar definitivamente
                        </button>
                      </div>
                    </form>
                  ) : null}
                </div>
              </section>
            </div>
          )}
        </PageStage>
      </main>

      <AppFooter note="Administracion de tenant, privacidad y operaciones visibles." />
    </div>
  );
}
