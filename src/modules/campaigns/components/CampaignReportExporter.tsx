// campaignReportExporter.tsx - Exportar reportes de campañas a CSV o XLSX (con resumen)
// ✅ Compatible con tipificación nueva (status_code) y legacy (status_color)
// ✅ Exporta tipificacion_codigo + tipificacion
// ✅ Premium modal (overlay blur + panel soft) + framer-motion

import { useEffect, useMemo, useState } from "react";
import { Download, FileSpreadsheet, FileText, Filter } from "lucide-react";
import LoadingSpinner from "../../../shared/components/feedback/LoadingSpinner";
import { supabase } from "../../../lib/supabase";
import { createPortal } from "react-dom";
import { AnimatePresence, LazyMotion, domAnimation, m } from "framer-motion";
import {
  TRANSFERRED_CLIENT_STATUS_CODE,
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
  modalPrimaryActionClassName,
  modalSecondaryActionClassName,
} from "../../../shared/components/layout/ModalLayout";
import {
  campaignGhostButtonClass,
  campaignInsetClass,
  campaignModalFooterClass,
  campaignModalHeaderClass,
  campaignModalPanelClass,
} from "./campaignUi";

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
  comentario_reciente: string;

  assigned_to: string;
  created_at: string;
};

type ClientRow = BaseClientRow & Record<string, any>;

type ExportCommentRow = {
  client_id: string | null;
  agent_id: string | null;
  agent_name_snapshot?: string | null;
  comment: string | null;
  created_at: string | null;
};

const QUERY_CHUNK_SIZE = 100;
const QUERY_PAGE_SIZE = 1000;

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function normalizeFilenamePart(s: string) {
  return (s || "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "_");
}

function normalizeWorksheetName(s: string) {
  const cleaned = (s || "Hoja")
    .replace(/[\\/?*[\]:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return (cleaned || "Hoja").slice(0, 31);
}

function makeUniqueWorksheetName(name: string, usedNames: Set<string>) {
  const base = normalizeWorksheetName(name);
  let next = base;
  let suffix = 2;

  while (usedNames.has(next)) {
    const suffixText = ` ${suffix}`;
    next = `${base.slice(0, 31 - suffixText.length)}${suffixText}`;
    suffix += 1;
  }

  usedNames.add(next);
  return next;
}

function chunkArray<T>(items: T[], size: number) {
  if (size <= 0) return [items];
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
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

function getExportScopeLabel(scope: ExportScope) {
  switch (scope) {
    case "assigned":
      return "Asignados";
    case "available":
      return "Disponibles";
    default:
      return "Todos";
  }
}

function round2(value: number) {
  return Number.isFinite(value) ? +value.toFixed(2) : 0;
}

function pct(part: number, total: number) {
  return total ? round2((part / total) * 100) : 0;
}

function safeNumber(value: any) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function normalizeForMatch(value: any) {
  return (value ?? "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getStatusSearchText(row: ClientRow) {
  return `${normalizeForMatch(row.tipificacion_codigo)} ${normalizeForMatch(
    row.tipificacion,
  )}`;
}

function statusMatches(row: ClientRow, patterns: string[]) {
  const text = getStatusSearchText(row);
  return patterns.some((pattern) => text.includes(pattern));
}

function hasUsefulTipificacion(row: ClientRow) {
  const tip = normalizeForMatch(row.tipificacion);
  const code = normalizeForMatch(row.tipificacion_codigo);
  const emptyValues = new Set(["", "—", "-", "sin tipificacion", "sin estado"]);

  return !emptyValues.has(tip) || !emptyValues.has(code);
}

function isTransferredStatus(row: ClientRow) {
  const code = normalizeForMatch(row.tipificacion_codigo);
  if (code === normalizeForMatch(TRANSFERRED_CLIENT_STATUS_CODE)) return true;

  const text = getStatusSearchText(row);
  if (text.includes("no transfer")) return false;

  return text.includes("transfer") || text.includes("ftd");
}

function isNoAnswerStatus(row: ClientRow) {
  const code = normalizeForMatch(row.tipificacion_codigo);
  if (code === "nc") return true;

  return statusMatches(row, [
    "no contesta",
    "no responde",
    "no answer",
    "buzon",
    "voicemail",
    "apagado",
    "ocupado",
  ]);
}

function isInvalidContactStatus(row: ClientRow) {
  const code = normalizeForMatch(row.tipificacion_codigo);
  if (code === "nx" || code === "ne") return true;

  return statusMatches(row, [
    "equivoc",
    "incorrect",
    "invalid",
    "wrong",
    "no existe",
    "fuera de servicio",
    "numero malo",
    "telefono malo",
  ]);
}

function isPendingOrNewStatus(row: ClientRow) {
  const code = normalizeForMatch(row.tipificacion_codigo);
  if (code === "nu") return true;

  return statusMatches(row, [
    "nuevo",
    "sin contacto",
    "sin contactar",
    "pendiente",
    "pending",
  ]);
}

function buildCountTable(
  counts: Record<string, number>,
  labelKey: string,
  total: number,
) {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({
      [labelKey]: label,
      Cantidad: count,
      "%": pct(count, total),
    }));
}

function buildSummary(rows: ClientRow[]) {
  const total = rows.length;
  const assigned = rows.filter((r) => r.assigned_to !== "Sin asignar").length;
  const unassigned = total - assigned;

  const byTip: Record<string, number> = {};
  const byTipCode: Record<string, number> = {};
  const byAgent: Record<string, number> = {};
  const byFunnel: Record<string, number> = {
    Transferidos: 0,
    "Contactados no transferidos": 0,
    "No contesta / no responde": 0,
    "Datos inválidos": 0,
    "Sin trabajar": 0,
    "En proceso / otros": 0,
  };

  const agentStats: Record<
    string,
    {
      leads: number;
      worked: number;
      contacted: number;
      transferred: number;
      calls: number;
      comments: number;
      attempts: number;
    }
  > = {};

  let attemptsSum = 0;
  let attemptsCount = 0;
  let callsSum = 0;
  let commentsSum = 0;
  let worked = 0;
  let contacted = 0;
  let transferred = 0;
  let noAnswer = 0;
  let invalidContacts = 0;
  let withComments = 0;

  for (const row of rows) {
    const tip = (row.tipificacion || "").toString().trim() || "Sin tipificación";
    const tipCode = (row.tipificacion_codigo || "").toString().trim() || "—";
    const agent =
      (row.assigned_to || "Sin asignar").toString().trim() || "Sin asignar";

    byTip[tip] = (byTip[tip] ?? 0) + 1;
    byTipCode[tipCode] = (byTipCode[tipCode] ?? 0) + 1;
    byAgent[agent] = (byAgent[agent] ?? 0) + 1;

    const attempts = safeNumber(row.attempts);
    const calls = safeNumber(row.call_attempts);
    const comments = safeNumber(row.comments_count);
    const hasLastCall = Boolean((row.last_call_at || "").toString().trim());
    const rowNoAnswer = isNoAnswerStatus(row);
    const rowInvalidContact = isInvalidContactStatus(row);
    const rowPendingOrNew = isPendingOrNewStatus(row);
    const rowTransferred = isTransferredStatus(row);
    const hasMeaningfulTip = hasUsefulTipificacion(row) && !rowPendingOrNew;
    const rowWorked =
      attempts > 0 || calls > 0 || comments > 0 || hasLastCall || hasMeaningfulTip;
    const rowContacted =
      rowTransferred || (hasMeaningfulTip && !rowNoAnswer && !rowInvalidContact);

    attemptsSum += attempts;
    attemptsCount += 1;
    callsSum += calls;
    commentsSum += comments;

    if (rowWorked) worked += 1;
    if (rowContacted) contacted += 1;
    if (rowTransferred) transferred += 1;
    if (rowNoAnswer) noAnswer += 1;
    if (rowInvalidContact) invalidContacts += 1;
    if (comments > 0) withComments += 1;

    if (!agentStats[agent]) {
      agentStats[agent] = {
        leads: 0,
        worked: 0,
        contacted: 0,
        transferred: 0,
        calls: 0,
        comments: 0,
        attempts: 0,
      };
    }

    agentStats[agent].leads += 1;
    agentStats[agent].worked += rowWorked ? 1 : 0;
    agentStats[agent].contacted += rowContacted ? 1 : 0;
    agentStats[agent].transferred += rowTransferred ? 1 : 0;
    agentStats[agent].calls += calls;
    agentStats[agent].comments += comments;
    agentStats[agent].attempts += attempts;

    const funnelStage = rowTransferred
      ? "Transferidos"
      : !rowWorked
      ? "Sin trabajar"
      : rowInvalidContact
      ? "Datos inválidos"
      : rowNoAnswer
      ? "No contesta / no responde"
      : rowContacted
      ? "Contactados no transferidos"
      : "En proceso / otros";

    byFunnel[funnelStage] = (byFunnel[funnelStage] ?? 0) + 1;
  }

  const unworked = total - worked;
  const attemptsAvg = attemptsCount ? round2(attemptsSum / attemptsCount) : 0;
  const callsAvg = total ? round2(callsSum / total) : 0;
  const commentsAvg = total ? round2(commentsSum / total) : 0;

  const tipTable = buildCountTable(byTip, "Tipificación", total);
  const tipCodeTable = buildCountTable(byTipCode, "Código", total);
  const agentTable = buildCountTable(byAgent, "Agente", total);

  const funnelLabels = [
    "Transferidos",
    "Contactados no transferidos",
    "No contesta / no responde",
    "Datos inválidos",
    "Sin trabajar",
    "En proceso / otros",
  ];

  const funnelTable = funnelLabels.map((stage) => ({
    Etapa: stage,
    Cantidad: byFunnel[stage] ?? 0,
    "%": pct(byFunnel[stage] ?? 0, total),
  }));

  const agentPerformanceTable = Object.entries(agentStats)
    .filter(([agent]) => agent !== "Sin asignar")
    .sort((a, b) => {
      const aRate = pct(a[1].transferred, a[1].leads);
      const bRate = pct(b[1].transferred, b[1].leads);
      return (
        b[1].transferred - a[1].transferred ||
        bRate - aRate ||
        b[1].contacted - a[1].contacted ||
        b[1].leads - a[1].leads
      );
    })
    .map(([agent, stats]) => ({
      Agente: agent,
      Leads: stats.leads,
      Trabajados: stats.worked,
      Contactados: stats.contacted,
      Transferidos: stats.transferred,
      "% Transfer": pct(stats.transferred, stats.leads),
      Llamadas: stats.calls,
      Comentarios: stats.comments,
    }));

  const kpiTable = [
    {
      "Métrica": "Total leads",
      Valor: total,
      "% total": total ? 100 : 0,
      Lectura: "Base exportada en este alcance",
    },
    {
      "Métrica": "Asignados",
      Valor: assigned,
      "% total": pct(assigned, total),
      Lectura: "Leads con agente responsable",
    },
    {
      "Métrica": "Sin asignar",
      Valor: unassigned,
      "% total": pct(unassigned, total),
      Lectura: "Bolsa disponible o pendiente de reparto",
    },
    {
      "Métrica": "Trabajados",
      Valor: worked,
      "% total": pct(worked, total),
      Lectura: "Tienen intento, llamada, comentario o tipificación útil",
    },
    {
      "Métrica": "Sin trabajar",
      Valor: unworked,
      "% total": pct(unworked, total),
      Lectura: "Sin señales de gestión todavía",
    },
    {
      "Métrica": "Contactados",
      Valor: contacted,
      "% total": pct(contacted, total),
      Lectura: "Tipificación útil distinta a no contacto/dato inválido",
    },
    {
      "Métrica": "Transferidos",
      Valor: transferred,
      "% total": pct(transferred, total),
      Lectura: "Conversión principal de la campaña",
    },
    {
      "Métrica": "No contesta / no responde",
      Valor: noAnswer,
      "% total": pct(noAnswer, total),
      Lectura: "Reintentos o cambio de horario",
    },
    {
      "Métrica": "Datos inválidos",
      Valor: invalidContacts,
      "% total": pct(invalidContacts, total),
      Lectura: "Números equivocados, inválidos o fuera de servicio",
    },
    {
      "Métrica": "Con comentarios",
      Valor: withComments,
      "% total": pct(withComments, total),
      Lectura: "Leads con contexto escrito",
    },
    {
      "Métrica": "Llamadas totales",
      Valor: callsSum,
      "% total": "—",
      Lectura: "Total registrado en calls",
    },
    {
      "Métrica": "Comentarios totales",
      Valor: commentsSum,
      "% total": "—",
      Lectura: "Total registrado en client_comments",
    },
    {
      "Métrica": "Prom. llamadas / lead",
      Valor: callsAvg,
      "% total": "—",
      Lectura: "Carga promedio de llamadas",
    },
    {
      "Métrica": "Prom. intentos / lead",
      Valor: attemptsAvg,
      "% total": "—",
      Lectura: "Promedio del campo attempts",
    },
    {
      "Métrica": "Prom. comentarios / lead",
      Valor: commentsAvg,
      "% total": "—",
      Lectura: "Densidad de seguimiento escrito",
    },
  ];

  const insights: string[] = [];
  const topTip = tipTable[0] as any | undefined;
  const topAgent = agentPerformanceTable[0] as any | undefined;

  if (total === 0) {
    insights.push("No hay leads en el alcance exportado.");
  } else {
    if (topTip) {
      insights.push(
        `La tipificación dominante es "${topTip["Tipificación"]}" (${topTip.Cantidad} leads, ${topTip["%"]}%).`,
      );
    }

    insights.push(
      `${transferred} leads están transferidos (${pct(transferred, total)}% del total).`,
    );

    if (unassigned > 0) {
      insights.push(
        `${unassigned} leads siguen sin agente asignado (${pct(unassigned, total)}%).`,
      );
    }

    if (unworked > 0) {
      insights.push(
        `${unworked} leads no muestran gestión todavía (${pct(unworked, total)}%).`,
      );
    }

    if (noAnswer > 0) {
      insights.push(
        `${noAnswer} leads están en no contesta/no responde (${pct(noAnswer, total)}%); conviene reintentar por horario o reciclarlos.`,
      );
    }

    if (invalidContacts > 0) {
      insights.push(
        `${invalidContacts} leads parecen tener dato inválido (${pct(invalidContacts, total)}%); conviene separarlos del esfuerzo comercial.`,
      );
    }

    if (topAgent) {
      insights.push(
        `Mejor ranking inicial: ${topAgent.Agente} con ${topAgent.Transferidos} transferidos y ${topAgent["% Transfer"]}% de conversión sobre sus leads.`,
      );
    } else if (assigned === 0) {
      insights.push("No hay agentes asignados en este alcance.");
    }
  }

  return {
    total,
    assigned,
    unassigned,
    worked,
    unworked,
    contacted,
    transferred,
    noAnswer,
    invalidContacts,
    attemptsAvg,
    callsAvg,
    commentsAvg,
    callsSum,
    commentsSum,
    kpiTable,
    funnelTable,
    tipTable,
    tipCodeTable,
    agentTable,
    agentPerformanceTable,
    insights,
  };
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
  const [exportFormat, setExportFormat] = useState<ExportFormat>("xlsx");
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

    const idChunks = chunkArray(ids, QUERY_CHUNK_SIZE);

    for (const idChunk of idChunks) {
      let from = 0;

      while (true) {
        const to = from + QUERY_PAGE_SIZE - 1;
        const { data: callsData, error: callsErr } = await supabase
          .from("calls")
          .select("client_id, created_at")
          .in("client_id", idChunk)
          .order("created_at", { ascending: false })
          .range(from, to);

        if (callsErr) {
          console.warn("[export] calls lookup failed:", callsErr.message);
          break;
        }

        for (const c of callsData ?? []) {
          const cid = c.client_id as string;
          if (!cid) continue;

          if (!lastCallMap.has(cid)) {
            lastCallMap.set(cid, { created_at: (c.created_at ?? "").toString() });
          }

          callCountMap.set(cid, (callCountMap.get(cid) ?? 0) + 1);
        }

        if (!callsData || callsData.length < QUERY_PAGE_SIZE) break;
        from += QUERY_PAGE_SIZE;
      }
    }

    return { lastCallMap, callCountMap };
  };

  const fetchCommentsInfo = async (clientIds: string[]) => {
    const ids = Array.from(new Set(clientIds.filter(Boolean)));

    const allCommentsMap = new Map<
      string,
      ExportCommentRow[]
    >();
    const commentCountMap = new Map<string, number>();

    if (ids.length === 0) return { allCommentsMap, commentCountMap };

    const idChunks = chunkArray(ids, QUERY_CHUNK_SIZE);

    for (const idChunk of idChunks) {
      let from = 0;

      while (true) {
        const to = from + QUERY_PAGE_SIZE - 1;
        const { data: commData, error: commErr } = await supabase
          .from("client_comments")
          .select("client_id, agent_id, agent_name_snapshot, comment, created_at")
          .in("client_id", idChunk)
          .order("created_at", { ascending: true })
          .range(from, to);

        if (commErr) {
          throw new Error(
            `No se pudieron cargar los comentarios para exportar: ${commErr.message}`,
          );
        }

        for (const c of (commData ?? []) as ExportCommentRow[]) {
          const cid = c.client_id;
          if (!cid) continue;

          const entry: ExportCommentRow = {
            client_id: cid,
            agent_id: c.agent_id ?? null,
            agent_name_snapshot: c.agent_name_snapshot ?? null,
            comment: c.comment ?? "",
            created_at: c.created_at ?? "",
          };

          const arr = allCommentsMap.get(cid) ?? [];
          arr.push(entry);
          allCommentsMap.set(cid, arr);

          commentCountMap.set(cid, (commentCountMap.get(cid) ?? 0) + 1);
        }

        if (!commData || commData.length < QUERY_PAGE_SIZE) break;
        from += QUERY_PAGE_SIZE;
      }
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
        const latestComment =
          commentsArr.length > 0 ? commentsArr[commentsArr.length - 1] : null;
        const latestCommentAgent = latestComment?.agent_name_snapshot?.trim()
          ? latestComment.agent_name_snapshot.trim()
          : latestComment?.agent_id
          ? (agentNameMap.get(latestComment.agent_id) ?? String(latestComment.agent_id))
          : "—";
        const latestCommentWhen = latestComment
          ? formatDateTimeShort((latestComment.created_at ?? "").toString())
          : "";
        const latestCommentText = latestComment
          ? (latestComment.comment ?? "")
              .toString()
              .replace(/\s+/g, " ")
              .trim()
          : "";

        const commentCols: Record<string, string> = {};
        for (let i = 0; i < maxComments; i++) {
          const it = commentsArr[i];
          if (!it) {
            commentCols[`comentario_${i + 1}`] = "";
            continue;
          }

          const by = it.agent_id
            ? (it.agent_name_snapshot?.trim() ||
              agentNameMap.get(it.agent_id) ||
              String(it.agent_id))
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
          comentario_reciente: latestComment
            ? `${latestCommentWhen} | ${latestCommentAgent}: ${latestCommentText}`
            : "",

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
        "comentario_reciente",
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
      const usedSheetNames = new Set<string>();

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
        { wch: 60 }, // comentario_reciente
      ];
      for (let i = 0; i < maxComments; i++) cols.push({ wch: 60 });
      cols.push({ wch: 22 }); // assigned_to
      cols.push({ wch: 18 }); // created_at

      ws1["!cols"] = cols;
      XLSX.utils.book_append_sheet(
        wb,
        ws1,
        makeUniqueWorksheetName(`Campaign_${exportPrefix}`, usedSheetNames),
      );

      const summary = buildSummary(rows);
      const generatedAt = formatDateTimeShort(new Date().toISOString());
      const scopeLabel = getExportScopeLabel(exportScope);
      const encode = XLSX.utils.encode_cell;

      function tableOrPlaceholder<T extends Record<string, any>>(
        table: T[],
        placeholder: T,
      ) {
        return table.length > 0 ? table : [placeholder];
      }

      const insightRows = summary.insights.length
        ? summary.insights.map((insight) => [`• ${insight}`])
        : [["• Sin hallazgos automáticos para este alcance."]];

      const agentPerformanceTable = tableOrPlaceholder(
        summary.agentPerformanceTable,
        {
          Agente: "Sin agentes asignados",
          Leads: 0,
          Trabajados: 0,
          Contactados: 0,
          Transferidos: 0,
          "% Transfer": 0,
          Llamadas: 0,
          Comentarios: 0,
        },
      );

      const summarySheetAoa = [
        ["RESUMEN GENERAL DE CAMPAÑA"],
        [
          campLabel,
          "",
          "",
          "Prefijo",
          exportPrefix || "—",
          "",
          "Alcance",
          scopeLabel,
          "",
          "Generado",
          generatedAt,
        ],
        [],
        ["INDICADORES CLAVE", "", "", "", "", "HALLAZGOS AUTOMÁTICOS"],
      ];

      const ws2 = XLSX.utils.aoa_to_sheet(summarySheetAoa);
      XLSX.utils.sheet_add_json(ws2, summary.kpiTable, { origin: "A5" });
      XLSX.utils.sheet_add_aoa(ws2, insightRows, { origin: "F5" });

      const kpiEndRow = 4 + summary.kpiTable.length;
      const insightEndRow = 4 + insightRows.length - 1;
      const detailHeaderRow = Math.max(kpiEndRow, insightEndRow) + 2;
      const detailTableRow = detailHeaderRow + 1;
      const detailTableEndRow =
        detailTableRow +
        Math.max(summary.funnelTable.length, agentPerformanceTable.length);
      const secondHeaderRow = detailTableEndRow + 2;
      const secondTableRow = secondHeaderRow + 1;

      XLSX.utils.sheet_add_aoa(
        ws2,
        [["EMBUDO GENERAL", "", "", "", "", "RANKING POR AGENTE"]],
        { origin: encode({ r: detailHeaderRow, c: 0 }) },
      );
      XLSX.utils.sheet_add_json(ws2, summary.funnelTable, {
        origin: encode({ r: detailTableRow, c: 0 }),
      });
      XLSX.utils.sheet_add_json(ws2, agentPerformanceTable, {
        origin: encode({ r: detailTableRow, c: 5 }),
      });

      XLSX.utils.sheet_add_aoa(
        ws2,
        [["TIPIFICACIONES", "", "", "", "", "CÓDIGOS"]],
        { origin: encode({ r: secondHeaderRow, c: 0 }) },
      );
      XLSX.utils.sheet_add_json(
        ws2,
        tableOrPlaceholder(summary.tipTable, {
          Tipificación: "Sin tipificaciones",
          Cantidad: 0,
          "%": 0,
        }),
        { origin: encode({ r: secondTableRow, c: 0 }) },
      );
      XLSX.utils.sheet_add_json(
        ws2,
        tableOrPlaceholder(summary.tipCodeTable, {
          Código: "—",
          Cantidad: 0,
          "%": 0,
        }),
        { origin: encode({ r: secondTableRow, c: 5 }) },
      );

      ws2["!freeze"] = { xSplit: 0, ySplit: 4 };
      ws2["!cols"] = [
        { wch: 28 }, // A - Métrica / etapa / tipificación
        { wch: 12 }, // B - Valor
        { wch: 12 }, // C - Porcentaje
        { wch: 38 }, // D - Lectura
        { wch: 3 },
        { wch: 28 }, // F - Hallazgos / Agente / Código
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 14 },
        { wch: 12 },
        { wch: 12 },
        { wch: 14 },
      ];

      const rowCount =
        secondTableRow +
        Math.max(summary.tipTable.length, summary.tipCodeTable.length, 1) +
        2;
      ws2["!rows"] = Array.from({ length: rowCount }, (_, rowIndex) => ({
        hpt:
          rowIndex === 0
            ? 26
            : rowIndex === 2
            ? 8
            : rowIndex === 3 ||
              rowIndex === detailHeaderRow ||
              rowIndex === secondHeaderRow
            ? 20
            : 18,
      }));

      ws2["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
        { s: { r: 3, c: 0 }, e: { r: 3, c: 3 } },
        { s: { r: 3, c: 5 }, e: { r: 3, c: 10 } },
        ...insightRows.map((_, index) => ({
          s: { r: 4 + index, c: 5 },
          e: { r: 4 + index, c: 10 },
        })),
        { s: { r: detailHeaderRow, c: 0 }, e: { r: detailHeaderRow, c: 3 } },
        { s: { r: detailHeaderRow, c: 5 }, e: { r: detailHeaderRow, c: 12 } },
        { s: { r: secondHeaderRow, c: 0 }, e: { r: secondHeaderRow, c: 3 } },
        { s: { r: secondHeaderRow, c: 5 }, e: { r: secondHeaderRow, c: 8 } },
      ];

      XLSX.utils.book_append_sheet(wb, ws2, "Resumen");
      usedSheetNames.add("Resumen");

      const agentGroups = Array.from(
        rows.reduce((map, row) => {
          const agent = (row.assigned_to || "Sin asignar").toString().trim();
          if (!agent || agent === "Sin asignar") return map;

          const group = map.get(agent) ?? [];
          group.push(row);
          map.set(agent, group);
          return map;
        }, new Map<string, ClientRow[]>()),
      ).sort((a, b) => a[0].localeCompare(b[0]));

      for (const [agentName, agentRows] of agentGroups) {
        const agentSummary = buildSummary(agentRows);
        const agentInsightRows = agentSummary.insights.length
          ? agentSummary.insights.map((insight) => [`• ${insight}`])
          : [["• Sin hallazgos automáticos para este agente."]];
        const agentSheetAoa = [
          [`AGENTE: ${agentName}`],
          [
            campLabel,
            "",
            "",
            "Prefijo",
            exportPrefix || "—",
            "",
            "Alcance",
            scopeLabel,
            "",
            "Generado",
            generatedAt,
          ],
          [],
          ["INDICADORES DEL AGENTE", "", "", "", "", "HALLAZGOS"],
        ];

        const wsAgent = XLSX.utils.aoa_to_sheet(agentSheetAoa);
        XLSX.utils.sheet_add_json(wsAgent, agentSummary.kpiTable, { origin: "A5" });
        XLSX.utils.sheet_add_aoa(wsAgent, agentInsightRows, { origin: "F5" });

        const agentKpiEndRow = 4 + agentSummary.kpiTable.length;
        const agentInsightEndRow = 4 + agentInsightRows.length - 1;
        const leadsHeaderRow =
          Math.max(agentKpiEndRow, agentInsightEndRow) + 2;
        const leadsTableRow = leadsHeaderRow + 1;

        XLSX.utils.sheet_add_aoa(wsAgent, [["LEADS DEL AGENTE"]], {
          origin: encode({ r: leadsHeaderRow, c: 0 }),
        });
        XLSX.utils.sheet_add_aoa(
          wsAgent,
          [
            headers,
            ...agentRows.map((row) => headers.map((h) => (row as any)[h] ?? "")),
          ],
          { origin: encode({ r: leadsTableRow, c: 0 }) },
        );

        wsAgent["!freeze"] = { xSplit: 0, ySplit: leadsTableRow + 1 };
        wsAgent["!autofilter"] = {
          ref: XLSX.utils.encode_range({
            s: { r: leadsTableRow, c: 0 },
            e: { r: leadsTableRow + agentRows.length, c: headers.length - 1 },
          }),
        };
        wsAgent["!cols"] = cols;
        wsAgent["!merges"] = [
          { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } },
          { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
          { s: { r: 3, c: 0 }, e: { r: 3, c: 3 } },
          { s: { r: 3, c: 5 }, e: { r: 3, c: 10 } },
          ...agentInsightRows.map((_, index) => ({
            s: { r: 4 + index, c: 5 },
            e: { r: 4 + index, c: 10 },
          })),
          { s: { r: leadsHeaderRow, c: 0 }, e: { r: leadsHeaderRow, c: 3 } },
        ];

        XLSX.utils.book_append_sheet(
          wb,
          wsAgent,
          makeUniqueWorksheetName(`Agente ${agentName}`, usedSheetNames),
        );
      }

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

  const segBtn = (active: boolean) =>
    cn(
      "rounded-full px-4 py-2 text-sm font-semibold transition border shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]",
      active
        ? "border-brand/22 bg-brand/[0.08] text-ink"
        : "border-white/78 bg-white/68 text-ink/70 hover:bg-white/82",
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
          <div className="absolute inset-0 bg-[rgba(15,23,42,0.42)] backdrop-blur-sm" />

          <m.div
            className={cn(campaignModalPanelClass, "max-w-lg")}
            variants={panelV}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <ModalHeader
              icon={<Download className="w-5 h-5 text-brand" />}
              title="Exportar reporte de campaña"
              description="CSV o XLSX con resumen"
              onClose={() => !exporting && onClose()}
              closeDisabled={exporting}
              className={campaignModalHeaderClass}
            />

            <ModalBody className="space-y-5">
              {error && (
                <div className="rounded-[1.2rem] border border-red-200/90 bg-[linear-gradient(180deg,rgba(254,242,242,0.92),rgba(255,255,255,0.76))] px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className={cn(campaignInsetClass, "p-4")}>
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

              <div className={cn(campaignInsetClass, "p-4")}>
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

                <div className="mt-4 rounded-[1rem] border border-white/74 bg-white/54 px-4 py-3 text-xs leading-relaxed text-muted">
                  <span className="font-semibold text-ink/70">Todos</span>:
                  incluye clientes{" "}
                  <span className="font-semibold text-ink/70">asignados</span> y{" "}
                  <span className="font-semibold text-ink/70">disponibles</span>.
                  <br />
                  <span className="font-semibold text-ink/70">Disponibles</span>:
                  aun{" "}
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

              <div className={cn(campaignInsetClass, "p-4")}>
                <div className="block text-sm font-semibold text-ink/80 mb-2">
                  Formato
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={exporting}
                    onClick={() => setExportFormat("csv")}
                    className={cn(
                      campaignGhostButtonClass,
                      "justify-center",
                      exportFormat === "csv" &&
                        "border-brand/40 bg-brand/[0.12] text-brand ring-4 ring-brand/15",
                    )}
                  >
                    <FileText className="w-4 h-4" />
                    CSV {exportFormat === "csv" ? "• Seleccionado" : ""}
                  </button>

                  <button
                    type="button"
                    disabled={exporting}
                    onClick={() => setExportFormat("xlsx")}
                    className={cn(
                      campaignGhostButtonClass,
                      "justify-center",
                      exportFormat === "xlsx" &&
                        "border-brand/40 bg-brand/[0.12] text-brand ring-4 ring-brand/15",
                    )}
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    XLSX (con resumen) {exportFormat === "xlsx" ? "• Seleccionado" : ""}
                  </button>
                </div>
              </div>
              <div className="rounded-[1.2rem] border border-white/74 bg-white/54 px-4 py-3 text-xs text-muted">
                Consejo: el XLSX incluye resumen ejecutivo con KPIs, embudo,
                hallazgos automaticos, ranking de agentes, tipificacion, codigo
                de tipificacion y una hoja por agente asignado. Tanto CSV como XLSX exportan
                `comentario_reciente`, `comments_count` y columnas dinamicas
                `comentario_1..N`.
              </div>
            </ModalBody>

            <ModalFooter className={cn("justify-end gap-2", campaignModalFooterClass)}>
              <button
                className={modalSecondaryActionClassName}
                onClick={onClose}
                disabled={exporting}
                type="button"
              >
                Cancelar
              </button>

              <button
                className={modalPrimaryActionClassName}
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
