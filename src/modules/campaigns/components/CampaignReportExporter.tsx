// campaignReportExporter.tsx - Exportar reportes de campañas a CSV o XLSX (con resumen)
// ✅ Compatible con tipificación nueva (status_code) y legacy (status_color)
// ✅ Exporta tipificacion_codigo + tipificacion
// ✅ Premium modal (overlay blur + panel soft) + framer-motion

import { useEffect, useMemo, useState } from "react";
import { Download, FileSpreadsheet, FileText, Filter, X } from "lucide-react";
import LoadingSpinner from "../../../shared/components/feedback/LoadingSpinner";
import { supabase } from "../../../lib/supabase";
import { createPortal } from "react-dom";
import { AnimatePresence, LazyMotion, domAnimation, m } from "framer-motion";
import {
  getStatusCode,
  getStatusText,
  resolveClientStatus,
} from "../../../lib/utils";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../../../shared/components/ui/Select";
import {
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "../../../shared/components/layout/ModalLayout";

type ExportFormat = "csv" | "xlsx";
type ExportScope = "all" | "available" | "assigned";

type CampaignOption = {
  id: string;
  prefix: string;
  name: string;
  total: number;
  available: number;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  campaigns: CampaignOption[];
  defaultCampaignId?: string;
  selectedOperationId?: string | null;
};

// Base row fields (fijos) + columnas dinámicas comentario_1..comentario_N
type BaseClientRow = {
  serial: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  country: string;
  source: string;
  funnel: string;
  deposit_amount: any;
  net_deposit: any;
  user_balance: any;
  investment_date: any;

  tipificacion_codigo: string;
  tipificacion: string;
  attempts: number;

  call_attempts: number;
  last_call_at: string;

  comments_count: number;

  assigned_to: string;
  created_at: string;
};

type ClientRow = BaseClientRow & Record<string, any>;

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function normalizeFilenamePart(s: string) {
  return (s || "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "_");
}

function downloadBlob(blob: Blob, filename: string) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function escapeCsvValue(value: string, sep: string) {
  if (value.includes(sep) || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function isoDateOnly(v: any) {
  if (!v) return "";
  const s = String(v);
  return s.includes("T") ? s.split("T")[0] : s;
}

function toNumberOrEmpty(v: any) {
  if (v === null || v === undefined || v === "") return "";
  const n =
    typeof v === "number" ? v : parseFloat(String(v).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : "";
}

function formatDateTimeShort(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;

  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

function buildSummary(rows: ClientRow[]) {
  const total = rows.length;
  const assigned = rows.filter((r) => r.assigned_to !== "Sin asignar").length;
  const unassigned = total - assigned;

  const byTip: Record<string, number> = {};
  const byTipCode: Record<string, number> = {};
  const byAgent: Record<string, number> = {};
  let attemptsSum = 0;
  let attemptsCount = 0;

  for (const r of rows) {
    const tip = (r.tipificacion || "").toString().trim() || "Sin tipificación";
    const tipCode = (r.tipificacion_codigo || "").toString().trim() || "—";

    byTip[tip] = (byTip[tip] ?? 0) + 1;
    byTipCode[tipCode] = (byTipCode[tipCode] ?? 0) + 1;

    const ag =
      (r.assigned_to || "Sin asignar").toString().trim() || "Sin asignar";
    byAgent[ag] = (byAgent[ag] ?? 0) + 1;

    const a = Number(r.attempts ?? 0);
    if (Number.isFinite(a)) {
      attemptsSum += a;
      attemptsCount += 1;
    }
  }

  const attemptsAvg = attemptsCount
    ? +(attemptsSum / attemptsCount).toFixed(2)
    : 0;

  const tipTable = Object.entries(byTip)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => ({
      Tipificación: k,
      Cantidad: v,
      Porcentaje: total ? +((v / total) * 100).toFixed(2) : 0,
    }));

  const tipCodeTable = Object.entries(byTipCode)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => ({
      Código: k,
      Cantidad: v,
      Porcentaje: total ? +((v / total) * 100).toFixed(2) : 0,
    }));

  const agentTable = Object.entries(byAgent)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => ({
      Agente: k,
      Cantidad: v,
      Porcentaje: total ? +((v / total) * 100).toFixed(2) : 0,
    }));

  return { total, assigned, unassigned, attemptsAvg, tipTable, tipCodeTable, agentTable };
}

const overlayV = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.18 } },
  exit: { opacity: 0, transition: { duration: 0.18 } },
} as const;

const panelV = {
  initial: { opacity: 0, y: 16, scale: 0.985, filter: "blur(10px)" },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: { type: "spring", stiffness: 240, damping: 22 },
  },
  exit: {
    opacity: 0,
    y: 10,
    scale: 0.99,
    filter: "blur(10px)",
    transition: { duration: 0.18 },
  },
} as const;

export default function CampaignReportExporter({
  isOpen,
  onClose,
  campaigns,
  defaultCampaignId,
  selectedOperationId,
}: Props) {
  const [exportCampaignId, setExportCampaignId] = useState<string>(
    defaultCampaignId || campaigns?.[0]?.id || "",
  );
  const [exportFormat, setExportFormat] = useState<ExportFormat>("csv");
  const [exportScope, setExportScope] = useState<ExportScope>("all");
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    const next = defaultCampaignId || exportCampaignId || campaigns?.[0]?.id || "";
    if (next && next !== exportCampaignId) setExportCampaignId(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, defaultCampaignId, campaigns]);

  const selectedCampaign = useMemo(
    () => campaigns.find((c) => c.id === exportCampaignId),
    [campaigns, exportCampaignId],
  );

  const canExport = Boolean(exportCampaignId) && campaigns.length > 0;

  const fetchAgentNameMap = async (agentIds: string[]) => {
    const map = new Map<string, string>();
    const ids = Array.from(new Set(agentIds.filter(Boolean)));
    if (ids.length === 0) return map;

    const { data, error } = await supabase.rpc("agent_name_map", {
      p_agent_ids: ids,
    });

    if (error) {
      console.warn("[export] agent_name_map failed:", error.message);
      return map;
    }

    const rows = Array.isArray(data) ? data : [];
    rows.forEach((r: any) => {
      const id = r.id as string;
      const label = (r.label ?? "").toString().trim();
      if (id && label) map.set(id, label);
    });

    return map;
  };

  const fetchCallsInfo = async (clientIds: string[]) => {
    const ids = Array.from(new Set(clientIds.filter(Boolean)));
    const lastCallMap = new Map<string, { created_at: string }>();
    const callCountMap = new Map<string, number>();

    if (ids.length === 0) return { lastCallMap, callCountMap };

    const { data: callsData, error: callsErr } = await supabase
      .from("calls")
      .select("client_id, created_at")
      .in("client_id", ids)
      .order("created_at", { ascending: false })
      .limit(10000);

    if (callsErr) {
      console.warn("[export] calls lookup failed:", callsErr.message);
    } else {
      for (const c of callsData ?? []) {
        const cid = c.client_id as string;
        if (!cid) continue;

        if (!lastCallMap.has(cid)) {
          lastCallMap.set(cid, { created_at: (c.created_at ?? "").toString() });
        }

        callCountMap.set(cid, (callCountMap.get(cid) ?? 0) + 1);
      }
    }

    return { lastCallMap, callCountMap };
  };

  const fetchCommentsInfo = async (clientIds: string[]) => {
    const ids = Array.from(new Set(clientIds.filter(Boolean)));

    const allCommentsMap = new Map<
      string,
      { comment: string; created_at: string; agent_id: string | null }[]
    >();
    const commentCountMap = new Map<string, number>();

    if (ids.length === 0) return { allCommentsMap, commentCountMap };

    const { data: commData, error: commErr } = await supabase
      .from("client_comments")
      .select("client_id, agent_id, comment, created_at")
      .in("client_id", ids)
      .order("created_at", { ascending: true })
      .limit(10000);

    if (commErr) {
      console.warn("[export] client_comments lookup failed:", commErr.message);
      return { allCommentsMap, commentCountMap };
    }

    for (const c of commData ?? []) {
      const cid = c.client_id as string;
      if (!cid) continue;

      const entry = {
        comment: (c.comment ?? "").toString(),
        created_at: (c.created_at ?? "").toString(),
        agent_id: (c.agent_id ?? null) as any,
      };

      const arr = allCommentsMap.get(cid) ?? [];
      arr.push(entry);
      allCommentsMap.set(cid, arr);

      commentCountMap.set(cid, (commentCountMap.get(cid) ?? 0) + 1);
    }

    return { allCommentsMap, commentCountMap };
  };

  const exportNow = async () => {
    if (!canExport) return;

    setExporting(true);
    setError("");

    try {
      const exportPrefix = selectedCampaign?.prefix || "";
      const campLabel = selectedCampaign?.name || `Campaña ${exportPrefix}`;
      const campaignLabelSafe = normalizeFilenamePart(campLabel);

      let q = supabase
        .from("clients")
        .select(
          "id, serial, first_name, last_name, email, phone_number, country, source, funnel, deposit_amount, net_deposit, user_balance, investment_date, status_color, status_code, attempts, assigned_to, created_at",
        )
        .eq("campaign_id", exportCampaignId)
        .order("serial", { ascending: true });

      if (selectedOperationId) {
        q = q.eq("operation_id", selectedOperationId);
      }

      if (exportScope === "available") q = q.is("assigned_to", null);
      if (exportScope === "assigned") q = q.not("assigned_to", "is", null);

      const { data, error: qErr } = await q;
      if (qErr) throw qErr;

      const clients = (data ?? []) as any[];
      const clientIds = clients.map((c) => c.id).filter(Boolean) as string[];

      const { lastCallMap, callCountMap } = await fetchCallsInfo(clientIds);
      const { allCommentsMap, commentCountMap } =
        await fetchCommentsInfo(clientIds);

      const maxComments =
        commentCountMap.size > 0
          ? Math.max(...Array.from(commentCountMap.values()))
          : 0;

      const assignedIds = Array.from(
        new Set(clients.map((c) => c.assigned_to).filter(Boolean)),
      ) as string[];

      const commentAgentIds = Array.from(
        new Set(
          Array.from(allCommentsMap.values())
            .flatMap((arr) => arr.map((v) => v.agent_id))
            .filter(Boolean),
        ),
      ) as string[];

      const agentNameMap = await fetchAgentNameMap([
        ...assignedIds,
        ...commentAgentIds,
      ]);

      const commentHeaders = Array.from(
        { length: maxComments },
        (_, i) => `comentario_${i + 1}`,
      );

      const rows: ClientRow[] = clients.map((c) => {
        const cid = c.id as string;

        const lastCallAtIso = cid
          ? (lastCallMap.get(cid)?.created_at ?? "")
          : "";
        const lastCallAt = formatDateTimeShort(lastCallAtIso);
        const callAttempts = cid ? (callCountMap.get(cid) ?? 0) : 0;

        const resolvedStatus = resolveClientStatus({
          status_code: c.status_code ?? null,
          status_color: c.status_color ?? null,
        });

        const tipificacionCodigo = getStatusCode({
          status_code: c.status_code ?? null,
          status_color: c.status_color ?? null,
        });

        const tipificacion = getStatusText({
          status_code: c.status_code ?? null,
          status_color: c.status_color ?? null,
        });

        const assignedLabel = c.assigned_to
          ? (agentNameMap.get(c.assigned_to) ?? String(c.assigned_to))
          : "Sin asignar";

        const commentsCount = cid ? (commentCountMap.get(cid) ?? 0) : 0;
        const commentsArr = cid ? (allCommentsMap.get(cid) ?? []) : [];

        const commentCols: Record<string, string> = {};
        for (let i = 0; i < maxComments; i++) {
          const it = commentsArr[i];
          if (!it) {
            commentCols[`comentario_${i + 1}`] = "";
            continue;
          }

          const by = it.agent_id
            ? (agentNameMap.get(it.agent_id) ?? String(it.agent_id))
            : "—";
          const when = formatDateTimeShort((it.created_at ?? "").toString());
          const text = (it.comment ?? "")
            .toString()
            .replace(/\s+/g, " ")
            .trim();
          commentCols[`comentario_${i + 1}`] = `${when} | ${by}: ${text}`;
        }

        const base: BaseClientRow = {
          serial: c.serial ?? "",
          first_name: c.first_name ?? "",
          last_name: c.last_name ?? "",
          email: c.email ?? "",
          phone_number: c.phone_number ?? "",
          country: c.country ?? "",
          source: c.source ?? "",
          funnel: c.funnel ?? "",
          deposit_amount: toNumberOrEmpty(c.deposit_amount),
          net_deposit: toNumberOrEmpty(c.net_deposit),
          user_balance: toNumberOrEmpty(c.user_balance),
          investment_date: isoDateOnly(c.investment_date),

          tipificacion_codigo: tipificacionCodigo,
          tipificacion: tipificacion || resolvedStatus.label,
          attempts: c.attempts ?? 0,

          call_attempts: callAttempts,
          last_call_at: lastCallAt,

          comments_count: commentsCount,

          assigned_to: assignedLabel,
          created_at: formatDateTimeShort(c.created_at ?? ""),
        };

        return { ...base, ...commentCols };
      });

      const datePart = new Date().toISOString().split("T")[0];
      const filenameBase = `campaign_${exportPrefix}_${campaignLabelSafe}_${exportScope}_${datePart}`;

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
        "tipificacion_codigo",
        "tipificacion",
        "attempts",
        "call_attempts",
        "last_call_at",
        "comments_count",
        ...commentHeaders,
        "assigned_to",
        "created_at",
      ];

      if (exportFormat === "csv") {
        const SEP = ";";
        const csvRows = [
          headers,
          ...rows.map((r) => headers.map((h) => String((r as any)[h] ?? ""))),
        ].map((row) => row.map((v) => escapeCsvValue(v, SEP)).join(SEP));

        const bom = "\uFEFF";
        const blob = new Blob([bom + csvRows.join("\r\n")], {
          type: "text/csv;charset=utf-8;",
        });

        downloadBlob(blob, `${filenameBase}.csv`);
        onClose();
        return;
      }

      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();

      const aoa: any[][] = [headers];
      for (const r of rows) {
        aoa.push(headers.map((h) => (r as any)[h] ?? ""));
      }
      const ws1 = XLSX.utils.aoa_to_sheet(aoa);

      ws1["!freeze"] = { xSplit: 0, ySplit: 1 };
      ws1["!autofilter"] = { ref: ws1["!ref"] || "A1:A1" };

      const cols: { wch: number }[] = [
        { wch: 10 }, // serial
        { wch: 14 }, // first_name
        { wch: 18 }, // last_name
        { wch: 24 }, // email
        { wch: 16 }, // phone
        { wch: 14 }, // country
        { wch: 18 }, // source
        { wch: 14 }, // funnel
        { wch: 14 }, // deposit_amount
        { wch: 14 }, // net_deposit
        { wch: 14 }, // user_balance
        { wch: 14 }, // investment_date
        { wch: 16 }, // tipificacion_codigo
        { wch: 24 }, // tipificacion
        { wch: 10 }, // attempts
        { wch: 12 }, // call_attempts
        { wch: 18 }, // last_call_at
        { wch: 12 }, // comments_count
      ];
      for (let i = 0; i < maxComments; i++) cols.push({ wch: 60 });
      cols.push({ wch: 22 }); // assigned_to
      cols.push({ wch: 18 }); // created_at

      ws1["!cols"] = cols;
      XLSX.utils.book_append_sheet(wb, ws1, `Campaign_${exportPrefix}`);

      const summary = buildSummary(rows);
      const meta = [
        ["Métrica", "Valor"],
        ["Campaña", campLabel],
        ["Prefijo", exportPrefix],
        ["Scope", exportScope],
        ["Total leads", summary.total],
        ["Asignados", summary.assigned],
        ["Sin asignar", summary.unassigned],
        ["Intentos promedio (clients.attempts)", summary.attemptsAvg],
        ["Generado", formatDateTimeShort(new Date().toISOString())],
        ["Máx. comentarios (columnas)", maxComments],
      ];

      const ws2 = XLSX.utils.aoa_to_sheet(meta);
      ws2["!freeze"] = { xSplit: 0, ySplit: 1 };
      ws2["!cols"] = [
        { wch: 26 },
        { wch: 34 },
        { wch: 18 },
        { wch: 2 },
        { wch: 22 },
        { wch: 12 },
        { wch: 22 },
      ];

      XLSX.utils.sheet_add_json(ws2, summary.tipTable, { origin: "A13" });
      XLSX.utils.sheet_add_json(ws2, summary.tipCodeTable, { origin: "E13" });
      XLSX.utils.sheet_add_json(ws2, summary.agentTable, { origin: "I13" });

      XLSX.utils.book_append_sheet(wb, ws2, "Resumen");

      const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([out], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      downloadBlob(blob, `${filenameBase}.xlsx`);
      onClose();
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Error exportando campaña");
    } finally {
      setExporting(false);
    }
  };

  if (!isOpen) return null;

  const pillBtn =
    "inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-ink/80 " +
    "hover:bg-surface2 transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/15 disabled:opacity-50 disabled:cursor-not-allowed";

  const pillPrimary =
    "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-soft " +
    "bg-gradient-to-r from-brand via-brand-600 to-brand-700 hover:brightness-105 active:brightness-95 " +
    "transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20 disabled:opacity-50 disabled:cursor-not-allowed";

  const segBtn = (active: boolean) =>
    cn(
      "rounded-full px-4 py-2 text-sm font-semibold transition border",
      active
        ? "bg-brand/10 border-brand/20 text-ink"
        : "bg-surface border-border text-ink/70 hover:bg-surface2",
    );

  return createPortal(
    <LazyMotion features={domAnimation}>
      <AnimatePresence mode="wait">
        <m.div
        className="fixed inset-0 z-[90] p-4 sm:p-6 flex items-center justify-center"
        variants={overlayV}
        initial="initial"
        animate="animate"
        exit="exit"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget && !exporting) onClose();
        }}
        >
          <div className="absolute inset-0 bg-black/45 backdrop-blur-[3px]" />

          <m.div
          className="relative w-full max-w-lg rounded-[1.5rem] border border-border bg-surface shadow-soft2 overflow-hidden"
          variants={panelV}
          initial="initial"
          animate="animate"
          exit="exit"
          >
          <div className="hidden">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-brand/10 flex items-center justify-center">
                <Download className="w-5 h-5 text-brand" />
              </div>
              <div>
                <div className="text-base sm:text-lg font-semibold text-ink">
                  Exportar reporte de campaña
                </div>
                <div className="text-xs text-muted">CSV o XLSX con resumen</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => !exporting && onClose()}
              className="h-10 w-10 rounded-2xl border border-border bg-surface hover:bg-surface2 transition flex items-center justify-center text-muted hover:text-ink"
              aria-label="Cerrar"
              disabled={exporting}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <ModalHeader
            icon={<Download className="w-5 h-5 text-brand" />}
            title="Exportar reporte de campaña"
            description="CSV o XLSX con resumen"
            onClose={() => !exporting && onClose()}
            closeDisabled={exporting}
          />

          <ModalBody className="space-y-5">
            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div>
              <div className="block text-sm font-semibold text-ink/80 mb-2">
                Campaña
              </div>
              <Select
                value={exportCampaignId}
                onValueChange={(v) => setExportCampaignId(v)}
                disabled={exporting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una campaña" />
                </SelectTrigger>

                <SelectContent>
                  {campaigns.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.prefix} — {c.name} ({c.total} total / {c.available} disp.)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-ink/80 mb-2">
                <Filter className="w-4 h-4" />
                Alcance
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={exporting}
                  onClick={() => setExportScope("all")}
                  className={segBtn(exportScope === "all")}
                >
                  Todos
                </button>
                <button
                  type="button"
                  disabled={exporting}
                  onClick={() => setExportScope("available")}
                  className={segBtn(exportScope === "available")}
                >
                  Disponibles
                </button>
                <button
                  type="button"
                  disabled={exporting}
                  onClick={() => setExportScope("assigned")}
                  className={segBtn(exportScope === "assigned")}
                >
                  Asignados
                </button>
              </div>

              <br />

              <div className="rounded-2xl border border-border bg-surface2 px-4 py-3 text-xs text-muted leading-relaxed">
                <span className="font-semibold text-ink/70">Todos</span>:
                incluye clientes{" "}
                <span className="font-semibold text-ink/70">asignados</span> y{" "}
                <span className="font-semibold text-ink/70">disponibles</span>.
                <br />
                <span className="font-semibold text-ink/70">Disponibles</span>:
                aún{" "}
                <span className="font-semibold text-ink/70">
                  sin agente asignado
                </span>
                .
                <br />
                <span className="font-semibold text-ink/70">Asignados</span>:{" "}
                <span className="font-semibold text-ink/70">
                  con agente asignado
                </span>
                .
              </div>
            </div>

            <div>
              <div className="block text-sm font-semibold text-ink/80 mb-2">
                Formato
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={exporting}
                  onClick={() => setExportFormat("csv")}
                  className={cn(
                    pillBtn,
                    "justify-center",
                    exportFormat === "csv" &&
                      "ring-4 ring-brand/10 border-brand/20",
                  )}
                >
                  <FileText className="w-4 h-4" />
                  CSV
                </button>

                <button
                  type="button"
                  disabled={exporting}
                  onClick={() => setExportFormat("xlsx")}
                  className={cn(
                    pillBtn,
                    "justify-center",
                    exportFormat === "xlsx" &&
                      "ring-4 ring-brand/10 border-brand/20",
                  )}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  XLSX (con resumen)
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-surface2 px-4 py-3 text-xs text-muted">
              Consejo: el XLSX incluye resumen por tipificación, por código de
              tipificación y por agente, además de columnas dinámicas para
              comentarios.
            </div>
          </ModalBody>

          <ModalFooter className="justify-end gap-2">
            <button
              className={pillBtn}
              onClick={onClose}
              disabled={exporting}
              type="button"
            >
              Cancelar
            </button>

            <button
              className={pillPrimary}
              onClick={exportNow}
              disabled={exporting || !canExport}
              type="button"
            >
              {exporting ? (
                <LoadingSpinner
                  size="sm"
                  text="Exportando..."
                  fullScreen={false}
                />
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Exportar
                </>
              )}
            </button>
          </ModalFooter>
          </m.div>
        </m.div>
      </AnimatePresence>
    </LazyMotion>,
    document.body,
  );
}
