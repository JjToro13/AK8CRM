// CampaignManagement.tsx - Gestionar campañas (import/export por campaña, nombre, lock, delete, refresh)

import { useEffect, useMemo, useState } from "react";
import {
  Trash2,
  Users,
  Calendar,
  AlertCircle,
  Lock,
  Unlock,
  Pencil,
  RefreshCw,
  Download,
  Upload,
  X,
  FileSpreadsheet,
  FileText,
  Filter,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import LoadingSpinner from "./LoadingSpinner";
import { supabase } from "../lib/supabase";
import ImportClientsModal from "./ImportClientsModal";

type CampaignRow = {
  prefix: string;
  display_name: string | null;
  created_at: string | null;
  updated_at: string | null;
  is_locked?: boolean;
  locked_at?: string | null;
  locked_by?: string | null;
};

type StatsRow = {
  prefix: string;
  total_clients: number;
  assigned_clients: number;
  available_clients: number;
  min_serial: string | null;
  max_serial: string | null;
};

type ViewRow = {
  prefix: string;
  name: string;
  total: number;
  assigned: number;
  available: number;
  minSerial: string | null;
  maxSerial: string | null;
  importedAt: string | null;
  isLocked: boolean;
  lockedAt: string | null;
  lockedBy: string | null;
};

type ExportFormat = "csv" | "xlsx";
type ExportScope = "all" | "available" | "assigned";

export default function CampaignManagement() {
  const { isAdmin } = useAuth();

  const [campaigns, setCampaigns] = useState<ViewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [togglingLock, setTogglingLock] = useState<string | null>(null);
  const [error, setError] = useState("");

  // ✅ Import modal
  const [showImportModal, setShowImportModal] = useState(false);

  // Edit name modal
  const [editOpen, setEditOpen] = useState(false);
  const [editPrefix, setEditPrefix] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [savingName, setSavingName] = useState(false);

  // Export modal
  const [exportOpen, setExportOpen] = useState(false);
  const [exportPrefix, setExportPrefix] = useState<string>("");
  const [exportFormat, setExportFormat] = useState<ExportFormat>("csv");
  const [exportScope, setExportScope] = useState<ExportScope>("all");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (isAdmin) loadCampaigns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const totals = useMemo(() => {
    const totalClients = campaigns.reduce((a, c) => a + (c.total || 0), 0);
    const totalAssigned = campaigns.reduce((a, c) => a + (c.assigned || 0), 0);
    const totalAvailable = campaigns.reduce(
      (a, c) => a + (c.available || 0),
      0,
    );
    return { totalClients, totalAssigned, totalAvailable };
  }, [campaigns]);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      setError("");

      const { data: campData, error: campErr } = await supabase
        .from("campaigns")
        .select("prefix, display_name, created_at, updated_at, imported_at, is_locked, locked_at, locked_by")
        .order("prefix", { ascending: true });

      if (campErr) {
        console.error(campErr);
        setError("Error cargando campañas (tabla campaigns)");
        return;
      }

      const meta = (campData ?? []) as CampaignRow[];

      const { data: statsData, error: statsErr } =
        await supabase.rpc("get_campaign_stats");
      if (statsErr) {
        console.error(statsErr);
        setError("Error cargando estadísticas (RPC get_campaign_stats)");
        return;
      }

      const stats = (
        Array.isArray(statsData) ? (statsData as any[]) : []
      ) as StatsRow[];
      const statsMap = new Map<string, StatsRow>();
      stats.forEach((s) => statsMap.set(s.prefix, s));

      const prefixes = new Set<string>();
      meta.forEach((c) => prefixes.add(c.prefix));
      stats.forEach((s) => prefixes.add(s.prefix));

      const merged: ViewRow[] = Array.from(prefixes)
        .sort((a, b) => a.localeCompare(b))
        .map((prefix) => {
          const m = meta.find((x) => x.prefix === prefix);
          const s = statsMap.get(prefix);

          const total = Number(s?.total_clients ?? 0);
          const assigned = Number(s?.assigned_clients ?? 0);
          const available = Number(s?.available_clients ?? 0);

          const name = (m?.display_name?.trim() ||
            `Campaña ${prefix}`) as string;

          return {
            prefix,
            name,
            total,
            assigned,
            available,
            minSerial: s?.min_serial ?? null,
            maxSerial: s?.max_serial ?? null,
            importedAt: (m as any)?.imported_at ?? m?.updated_at ?? m?.created_at ?? null,
            isLocked: Boolean(m?.is_locked ?? false),
            lockedAt: (m?.locked_at ?? null) as any,
            lockedBy: (m?.locked_by ?? null) as any,
          };
        });

      setCampaigns(merged);

      if (!exportPrefix && merged.length > 0) setExportPrefix(merged[0].prefix);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Error inesperado cargando campañas");
    } finally {
      setLoading(false);
    }
  };

  const syncNow = async () => {
    if (syncing) return;
    setSyncing(true);
    await loadCampaigns();
    setSyncing(false);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderSerialRange = (minS: string | null, maxS: string | null) => {
    if (!minS && !maxS) return "—";
    if (minS && !maxS) return `${minS}`;
    if (!minS && maxS) return `${maxS}`;
    return `${minS} - ${maxS}`;
  };

  // -----------------------
  // ACTIONS
  // -----------------------
  const handleDeleteCampaign = async (prefix: string, assigned: number) => {
    const extraWarn =
      assigned > 0
        ? `\n\n⚠️ OJO: Hay ${assigned} clientes asignados en esta campaña.`
        : "";
    const ok = confirm(
      `¿Eliminar la campaña ${prefix}? Se eliminarán TODOS los clientes con serial ${prefix}****. Esta acción NO se puede deshacer.${extraWarn}`,
    );
    if (!ok) return;

    try {
      setDeleting(prefix);
      setError("");

      const { error: delClientsErr, count: deletedCount } = await supabase
        .from("clients")
        .delete({ count: "exact" })
        .like("serial", `${prefix}%`);

      if (delClientsErr) {
        console.error(delClientsErr);
        setError(
          `Error eliminando clientes de campaña ${prefix}: ${delClientsErr.message}`,
        );
        return;
      }

      const { error: delCampErr } = await supabase
        .from("campaigns")
        .delete()
        .eq("prefix", prefix);
      if (delCampErr)
        console.warn("No se pudo borrar campaigns row:", delCampErr);

      console.log(
        `Campaña ${prefix} eliminada. Clientes borrados:`,
        deletedCount,
      );
      await loadCampaigns();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || `Error inesperado eliminando campaña ${prefix}`);
    } finally {
      setDeleting(null);
    }
  };

  const handleToggleLock = async (row: ViewRow) => {
    try {
      setTogglingLock(row.prefix);
      setError("");

      const user = (await supabase.auth.getUser())?.data?.user;
      const nextLocked = !row.isLocked;

      const payload: any = {
        is_locked: nextLocked,
        locked_at: nextLocked ? new Date().toISOString() : null,
        locked_by: nextLocked ? (user?.id ?? null) : null,
        updated_at: new Date().toISOString(),
      };

      const { error: upErr } = await supabase
        .from("campaigns")
        .update(payload)
        .eq("prefix", row.prefix);
      if (upErr) {
        console.error(upErr);
        setError(
          `No se pudo ${nextLocked ? "bloquear" : "desbloquear"} la campaña: ${upErr.message}`,
        );
        return;
      }

      await loadCampaigns();
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Error cambiando bloqueo");
    } finally {
      setTogglingLock(null);
    }
  };

  const openEditName = (row: ViewRow) => {
    setEditPrefix(row.prefix);
    setEditName(
      row.name.startsWith("Campaña ") && row.name.endsWith(row.prefix)
        ? ""
        : row.name,
    );
    setEditOpen(true);
  };

  const saveName = async () => {
    if (!editPrefix) return;

    const value = editName.trim();
    const display_name = value ? value : null;

    try {
      setSavingName(true);
      setError("");

      const { error: upErr } = await supabase
        .from("campaigns")
        .update({ display_name, updated_at: new Date().toISOString() })
        .eq("prefix", editPrefix);

      if (upErr) {
        console.error(upErr);
        setError(`No se pudo actualizar nombre: ${upErr.message}`);
        return;
      }

      setEditOpen(false);
      setEditPrefix(null);
      setEditName("");
      await loadCampaigns();
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Error guardando nombre");
    } finally {
      setSavingName(false);
    }
  };

  // -----------------------
  // EXPORT
  // -----------------------
  const openExport = (pref?: string) => {
    const next = pref || exportPrefix || campaigns?.[0]?.prefix || "";
    setExportPrefix(next);
    setExportFormat("csv");
    setExportScope("all");
    setExportOpen(true);
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const escapeCsvValue = (value: string, sep: string) => {
    if (value.includes(sep) || value.includes('"') || value.includes("\n")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const exportCampaign = async () => {
    if (!exportPrefix) return;
    setExporting(true);
    setError("");

    try {
      const camp = campaigns.find((c) => c.prefix === exportPrefix);
      const campaignLabelSafe = (camp?.name || `Campaña_${exportPrefix}`)
        .replace(/[^\w\s-]/g, "")
        .trim()
        .replace(/\s+/g, "_");

      let q = supabase
        .from("clients")
        .select(
          "serial, first_name, last_name, email, phone_number, country, source, funnel, deposit_amount, net_deposit, user_balance, investment_date, status_color, attempts, assigned_to, created_at",
        )
        .like("serial", `${exportPrefix}%`)
        .order("serial", { ascending: true });

      if (exportScope === "available") q = q.is("assigned_to", null);
      if (exportScope === "assigned") q = q.not("assigned_to", "is", null);

      const { data, error: qErr } = await q;
      if (qErr) throw qErr;

      const rows = (data ?? []).map((r: any) => ({
        serial: r.serial ?? "",
        first_name: r.first_name ?? "",
        last_name: r.last_name ?? "",
        email: r.email ?? "",
        phone_number: r.phone_number ?? "",
        country: r.country ?? "",
        source: r.source ?? "",
        funnel: r.funnel ?? "",
        deposit_amount: r.deposit_amount ?? "",
        net_deposit: r.net_deposit ?? "",
        user_balance: r.user_balance ?? "",
        investment_date: r.investment_date ?? "",
        status_color: r.status_color ?? "",
        attempts: r.attempts ?? 0,
        assigned_to: r.assigned_to ?? "",
        created_at: r.created_at ?? "",
      }));

      if (exportFormat === "csv") {
        const SEP = ";";
        const headers = [
          "serial",
          "first_name",
          "last_name",
          "email",
          "phone_number",
          "country",
          "source",
          "funnel",
          "deposit_amount",
          "net_deposit",
          "user_balance",
          "investment_date",
          "status_color",
          "attempts",
          "assigned_to",
          "created_at",
        ];

        const csvRows = [
          headers,
          ...rows.map((r) => headers.map((h) => String((r as any)[h] ?? ""))),
        ].map((row) => row.map((v) => escapeCsvValue(v, SEP)).join(SEP));

        const bom = "\uFEFF";
        const blob = new Blob([bom + csvRows.join("\r\n")], {
          type: "text/csv;charset=utf-8;",
        });

        const filename = `campaign_${exportPrefix}_${campaignLabelSafe}_${exportScope}_${
          new Date().toISOString().split("T")[0]
        }.csv`;
        downloadBlob(blob, filename);
      } else {
        const XLSX = await import("xlsx");
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, `Campaign_${exportPrefix}`);

        const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
        const blob = new Blob([out], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });

        const filename = `campaign_${exportPrefix}_${campaignLabelSafe}_${exportScope}_${
          new Date().toISOString().split("T")[0]
        }.xlsx`;
        downloadBlob(blob, filename);
      }

      setExportOpen(false);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Error exportando campaña");
    } finally {
      setExporting(false);
    }
  };

  // ✅ Import callback
  const handleImportSuccess = async () => {
    // refresca stats + campaigns
    await loadCampaigns();
    setShowImportModal(false);
  };

  if (!isAdmin) {
    return (
      <div className="card bg-gray-50 border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
          <Users className="w-5 h-5 mr-2 text-gray-600" />
          Gestión de Campañas
        </h2>
        <p className="text-sm text-gray-600">
          Disponible solo para administradores.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner
            size="lg"
            text="Cargando campañas..."
            fullScreen={false}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-2">
          {/* Import */}
          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="btn-secondary flex items-center"
            title="Importar nueva campaña (Excel)"
          >
            <Upload className="w-4 h-4" />
            <span className="ml-2 hidden sm:inline">Importar</span>
          </button>

          {/* Export */}
          <button
            type="button"
            onClick={() => openExport()}
            className="btn-secondary flex items-center"
            title="Exportar campaña"
            disabled={campaigns.length === 0}
          >
            <Download className="w-4 h-4" />
            <span className="ml-2 hidden sm:inline">Exportar</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Totales */}
          <div className="flex gap-3 text-sm">
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
              <div className="text-xs text-gray-500">Total</div>
              <div className="font-semibold text-gray-900">
                {totals.totalClients}
              </div>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
              <div className="text-xs text-blue-700">Asignados</div>
              <div className="font-semibold text-blue-900">
                {totals.totalAssigned}
              </div>
            </div>
            <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2">
              <div className="text-xs text-green-700">Disponibles</div>
              <div className="font-semibold text-green-900">
                {totals.totalAvailable}
              </div>
            </div>
          </div>

          {/* Sync */}
          <button
            type="button"
            onClick={syncNow}
            disabled={syncing}
            className="btn-secondary flex items-center"
            title="Actualizar / sincronizar"
          >
            {syncing ? (
              <LoadingSpinner size="sm" text="" fullScreen={false} />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            <span className="ml-2 hidden sm:inline">Actualizar</span>
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="card bg-red-50 border-red-200">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Campañas activas
        </h3>

        {campaigns.length === 0 ? (
          <div className="text-center py-8">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No hay campañas
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Aparecerán al importar listas.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prefijo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Serial (rango)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Asignados
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Disponibles
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Importación
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>

              <tbody className="bg-white divide-y divide-gray-200">
                {campaigns.map((c) => (
                  <tr key={c.prefix} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 font-mono">
                        {c.prefix}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {c.name}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                      {renderSerialRange(c.minSerial, c.maxSerial)}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {c.total.toLocaleString()}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-blue-800">
                        {c.assigned.toLocaleString()}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-2 py-1 text-green-800">
                        {c.available.toLocaleString()}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(c.importedAt)}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {c.isLocked ? (
                        <span className="inline-flex items-center rounded-full border border-gray-300 bg-gray-100 px-2 py-1 text-gray-700">
                          <Lock className="w-3.5 h-3.5 mr-1" />
                          Bloqueada
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2 py-1 text-gray-700">
                          <Unlock className="w-3.5 h-3.5 mr-1" />
                          Activa
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        {/* Export this campaign */}
                        <button
                          type="button"
                          onClick={() => openExport(c.prefix)}
                          className="text-emerald-600 hover:text-emerald-800"
                          title="Exportar esta campaña"
                        >
                          <Download className="h-4 w-4" />
                        </button>

                        {/* Sync */}
                        <button
                          type="button"
                          onClick={syncNow}
                          className="text-gray-600 hover:text-gray-900"
                          title="Actualizar"
                          disabled={syncing}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </button>

                        {/* Edit name */}
                        <button
                          type="button"
                          onClick={() => openEditName(c)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Editar nombre"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>

                        {/* Lock/unlock */}
                        <button
                          type="button"
                          onClick={() => handleToggleLock(c)}
                          className="text-gray-700 hover:text-gray-900"
                          title={
                            c.isLocked
                              ? "Desbloquear campaña"
                              : "Bloquear campaña"
                          }
                          disabled={togglingLock === c.prefix}
                        >
                          {togglingLock === c.prefix ? (
                            <LoadingSpinner
                              size="sm"
                              text=""
                              fullScreen={false}
                            />
                          ) : c.isLocked ? (
                            <Unlock className="h-4 w-4" />
                          ) : (
                            <Lock className="h-4 w-4" />
                          )}
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteCampaign(c.prefix, c.assigned)
                          }
                          className="text-red-600 hover:text-red-900"
                          title="Eliminar campaña"
                          disabled={deleting === c.prefix}
                        >
                          {deleting === c.prefix ? (
                            <LoadingSpinner
                              size="sm"
                              text=""
                              fullScreen={false}
                            />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="card bg-blue-50 border-blue-200">
        <h3 className="text-sm font-medium text-blue-800 mb-2 flex items-center">
          <Calendar className="w-4 h-4 mr-2" />
          Nota
        </h3>
        <div className="text-sm text-blue-700 space-y-1">
          <p>
            • Cada lista importada crea una nueva campaña con un prefijo único
            (A, B, C, etc.)
          </p>
          <p>
            • Los clientes se numeran secuencialmente: A0001, A0002, A0003...
          </p>
          <p>• El rango de serial se calcula con min/max real.</p>
          <p>• Cada campaña puede contener hasta 9,999 clientes</p>
          <p>
            • El “Nombre” es una etiqueta para identificar la campaña fácilmente
          </p>
          <p>
            • Al eliminar una campaña, se eliminan TODOS los clientes de esa
            campaña
          </p>
          <p>
            • “Bloqueada” impide usarla para nuevas asignaciones/importaciones.
          </p>
        </div>
      </div>

      {/* Edit name modal */}
      {editOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-[70] flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setEditOpen(false)}
        >
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-semibold text-gray-900">
                Editar nombre de campaña {editPrefix ? `(${editPrefix})` : ""}
              </h3>
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="text-gray-400 hover:text-gray-700"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Nombre (display_name)
              </label>
              <input
                className="input-field"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Ej: Reactivación MX / VIP Feb"
              />
              <p className="text-xs text-gray-500">
                Si lo dejas vacío, volverá al nombre por defecto “Campaña{" "}
                {editPrefix}”.
              </p>
            </div>

            <div className="px-5 py-4 border-t flex justify-end gap-2">
              <button
                className="btn-secondary"
                onClick={() => setEditOpen(false)}
                disabled={savingName}
              >
                Cancelar
              </button>
              <button
                className="btn-primary"
                onClick={saveName}
                disabled={savingName}
              >
                {savingName ? (
                  <LoadingSpinner size="sm" text="" fullScreen={false} />
                ) : (
                  "Guardar"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export modal */}
      {exportOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-[80] flex items-center justify-center p-4"
          onClick={(e) =>
            e.target === e.currentTarget && !exporting && setExportOpen(false)
          }
        >
          <div className="bg-white rounded-xl w-full max-w-lg shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div className="flex items-center gap-2">
                <Download className="w-5 h-5 text-gray-700" />
                <h3 className="font-semibold text-gray-900">
                  Exportar campaña
                </h3>
              </div>
              <button
                type="button"
                onClick={() => !exporting && setExportOpen(false)}
                className="text-gray-400 hover:text-gray-700"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ¿Qué campaña quieres exportar?
                </label>
                <select
                  className="input-field"
                  value={exportPrefix}
                  onChange={(e) => setExportPrefix(e.target.value)}
                  disabled={exporting}
                >
                  {campaigns.map((c) => (
                    <option key={c.prefix} value={c.prefix}>
                      {c.prefix} — {c.name} ({c.total} total / {c.available}{" "}
                      disp.)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 items-center gap-2">
                  <Filter className="w-4 h-4" />
                  ¿Qué clientes exportar?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    disabled={exporting}
                    onClick={() => setExportScope("all")}
                    className={[
                      "btn-secondary",
                      exportScope === "all" ? "ring-2 ring-gray-300" : "",
                    ].join(" ")}
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    disabled={exporting}
                    onClick={() => setExportScope("available")}
                    className={[
                      "btn-secondary",
                      exportScope === "available"
                        ? "ring-2 ring-green-300"
                        : "",
                    ].join(" ")}
                  >
                    Disponibles
                  </button>
                  <button
                    type="button"
                    disabled={exporting}
                    onClick={() => setExportScope("assigned")}
                    className={[
                      "btn-secondary",
                      exportScope === "assigned" ? "ring-2 ring-blue-300" : "",
                    ].join(" ")}
                  >
                    Asignados
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  “Disponibles” = assigned_to IS NULL · “Asignados” =
                  assigned_to NOT NULL
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ¿En qué formato?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={exporting}
                    onClick={() => setExportFormat("csv")}
                    className={[
                      "btn-secondary flex items-center justify-center",
                      exportFormat === "csv" ? "ring-2 ring-gray-300" : "",
                    ].join(" ")}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    CSV
                  </button>
                  <button
                    type="button"
                    disabled={exporting}
                    onClick={() => setExportFormat("xlsx")}
                    className={[
                      "btn-secondary flex items-center justify-center",
                      exportFormat === "xlsx" ? "ring-2 ring-gray-300" : "",
                    ].join(" ")}
                  >
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    XLSX
                  </button>
                </div>
              </div>
            </div>

            <div className="px-5 py-4 border-t flex justify-end gap-2">
              <button
                className="btn-secondary"
                onClick={() => setExportOpen(false)}
                disabled={exporting}
              >
                Cancelar
              </button>
              <button
                className="btn-primary flex items-center"
                onClick={exportCampaign}
                disabled={exporting || !exportPrefix}
              >
                {exporting ? (
                  <LoadingSpinner
                    size="sm"
                    text="Exportando..."
                    fullScreen={false}
                  />
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Exportar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Import modal */}
      <ImportClientsModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImportSuccess}
      />
    </div>
  );
}
