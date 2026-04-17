// ImportClientsModal.tsx - Modal para importar clientes desde un archivo Excel (.xlsx/.xls)
// ✅ Premium modal (overlay blur + panel soft) + framer-motion
// ✅ Parser endurecido: detecta cabecera real, múltiples bloques, cabeceras repetidas y filas sospechosas

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  UploadCloud,
  Download,
} from "lucide-react";
import { supabase } from "../../../lib/supabase";
import LoadingSpinner from "../../../shared/components/feedback/LoadingSpinner";
import { createPortal } from "react-dom";
import { AnimatePresence, LazyMotion, domAnimation, m } from "framer-motion";
import Input from "../../../shared/components/ui/Input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../shared/components/ui/Select";
import {
  ModalBody,
  ModalFooter,
  ModalHeader,
  modalPrimaryActionClassName,
  modalSecondaryActionClassName,
} from "../../../shared/components/layout/ModalLayout";
import { campaigns } from "../services/campaigns.service";
import {
  campaignInsetClass,
  campaignModalFooterClass,
  campaignModalHeaderClass,
  campaignModalPanelClass,
} from "./campaignUi";

interface ImportClientsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: () => Promise<void> | void;
  selectedOperationId?: string | null;
}

interface ImportResult {
  success: number;
  errors: string[];
  campaign_prefix?: string;
  campaign_id?: string;
  skipped_count?: number;
  duplicate_rows?: ImportDuplicateRow[];
}

interface ImportDuplicateRow {
  row_number: number;
  duplicate_type: string;
  duplicate_reason: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone_number?: string | null;
  country?: string | null;
  source?: string | null;
  serial?: string | null;
}

interface ParsedClient {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
  country?: string;
  source?: string;
  funnel?: string;
  deposit_amount?: number;
  net_deposit?: number;
  user_balance?: number;
  investment_date?: string;
}

type ImportMode = "new" | "existing";
type ImportPhase = "form" | "processing" | "result";

type CampaignOption = {
  id: string;
  prefix: string;
  display_name: string | null;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function escapeCsvValue(value: unknown) {
  const text = String(value ?? "");
  if (text.includes('"') || text.includes(",") || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
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

const HEADER_SCAN_LIMIT = 8;
const MIN_RECOGNIZED_HEADERS = 2;
const MAX_SUSPICIOUS_ROWS_BEFORE_FAIL = 5;
const MAX_HEADER_ROWS_INSIDE_DATA = 1;
const EXISTING_CAMPAIGN_PLACEHOLDER = "__campaign_placeholder__";
const DUPLICATE_TYPE_LABELS: Record<string, string> = {
  batch_duplicate: "Duplicado dentro del archivo",
  existing_duplicate: "Ya existe en la operacion",
};

const HEADER_TOKENS = new Set([
  "nombre",
  "nombres",
  "primer nombre",
  "apellido",
  "apellidos",
  "name",
  "full name",
  "fullname",
  "nombre completo",
  "firstname",
  "first name",
  "lastname",
  "last name",
  "email",
  "correo",
  "correo electronico",
  "mail",
  "telefono",
  "numero telefono",
  "phone",
  "phone number",
  "celular",
  "movil",
  "whatsapp",
  "pais",
  "country",
  "empresa",
  "source",
  "broker",
  "brand",
  "funnel",
  "embudo",
  "deposit amount",
  "deposito",
  "balance",
  "saldo",
  "fecha",
  "investment date",
]);

export default function ImportClientsModal({
  isOpen,
  onClose,
  onImport,
  selectedOperationId,
}: ImportClientsModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>("new");
  const [campaignName, setCampaignName] = useState("");
  const [availableCampaigns, setAvailableCampaigns] = useState<CampaignOption[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");
  const [phase, setPhase] = useState<ImportPhase>("form");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canAppendToExisting = Boolean(selectedOperationId);
  const selectedCampaign =
    availableCampaigns.find((campaign) => campaign.id === selectedCampaignId) ?? null;
  const duplicateRows = result?.duplicate_rows ?? [];
  const skippedCount = result?.skipped_count ?? 0;
  const hasPartialImport = Boolean(result && skippedCount > 0);

  const loadAvailableCampaigns = useCallback(async () => {
    if (!selectedOperationId) {
      setAvailableCampaigns([]);
      setSelectedCampaignId("");
      return;
    }

    setLoadingCampaigns(true);

    try {
      const { data, error } = await campaigns.list(selectedOperationId);
      if (error) {
        throw error;
      }

      setAvailableCampaigns(
        (data ?? []).map((campaign) => ({
          id: campaign.id,
          prefix: campaign.prefix,
          display_name: campaign.display_name,
        })),
      );
    } catch (loadError: any) {
      console.error("Error cargando campañas para importación:", loadError);
      setAvailableCampaigns([]);
      setError(
        loadError?.message || "No se pudieron cargar las bases disponibles.",
      );
    } finally {
      setLoadingCampaigns(false);
    }
  }, [selectedOperationId]);

  useEffect(() => {
    if (!isOpen) return;
    setError("");
    setResult(null);
    setPhase("form");
    void loadAvailableCampaigns();
  }, [isOpen, loadAvailableCampaigns]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const isExcel =
      selectedFile.type ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      selectedFile.type === "application/vnd.ms-excel" ||
      selectedFile.name.toLowerCase().endsWith(".xlsx") ||
      selectedFile.name.toLowerCase().endsWith(".xls");

    if (!isExcel) {
      setError("Por favor, selecciona un archivo Excel valido (.xlsx o .xls).");
      setFile(null);
      setResult(null);
      setPhase("form");
      return;
    }

    setFile(selectedFile);
    setError("");
    setResult(null);
    setPhase("form");
  };

  const formatImportErrors = (errors: string[] = []) => {
    if (!errors.length) {
      return "No se pudo importar el archivo.";
    }

    const text = errors.join(" ").toLowerCase();
    const tips: string[] = [];

    if (
      text.includes("encabezado") ||
      text.includes("header") ||
      text.includes("cabecera") ||
      text.includes("tabla") ||
      text.includes("bloque")
    ) {
      tips.push(
        "El archivo parece tener más de una tabla o encabezados repetidos. Deja una sola tabla con una única fila de encabezados.",
      );
    }

    if (
      text.includes("sin cabecera") ||
      text.includes("no se reconocieron suficientes columnas") ||
      text.includes("no se encontró una cabecera")
    ) {
      tips.push(
        "La primera zona útil del archivo debe contener una fila de encabezados clara, por ejemplo: Nombre, Apellido, Email, Teléfono.",
      );
    }

    if (
      text.includes("no contiene registros válidos") ||
      text.includes("no se encontraron datos válidos") ||
      text.includes("no quedaron registros válidos")
    ) {
      tips.push(
        "Cada fila de cliente debe tener al menos un dato identificable válido: email, teléfono razonable o nombre coherente.",
      );
    }

    if (
      text.includes("nombre numérico") ||
      text.includes("telefono inválido") ||
      text.includes("telefono demasiado largo") ||
      text.includes("fila sospechosa")
    ) {
      tips.push(
        "Verifica que los valores estén en la columna correcta. Hay filas donde los datos parecen corridos o mezclados.",
      );
    }

    if (text.includes("duplicada") || text.includes("duplicado")) {
      tips.push(
        "Se detectaron filas repetidas dentro del archivo. Elimina duplicados antes de volver a importar.",
      );
    }

    if (
      text.includes("lote") ||
      text.includes("inserción") ||
      text.includes("insert") ||
      text.includes("base de datos")
    ) {
      tips.push(
        "La importación fue rechazada durante el guardado. Revisa el formato del archivo y vuelve a intentarlo.",
      );
    }

    const detailLines = errors.slice(0, 10).map((err) => `• ${err}`);
    const tipLines = Array.from(new Set(tips)).map((tip) => `• ${tip}`);

    return [
      "No se pudo procesar el archivo.",
      "",
      "Detalles detectados:",
      ...detailLines,
      ...(tipLines.length
        ? ["", "Qué revisar antes de volver a importar:", ...tipLines]
        : []),
    ].join("\n");
  };

  const formatFrontendParseError = (message: string) => {
    const lower = message.toLowerCase();

    if (
      lower.includes("clients_serial_key") ||
      (lower.includes("duplicate key value") && lower.includes("serial"))
    ) {
      return [
        "No se pudo crear el bloque de seriales para esta importación.",
        "",
        "Detalles detectados:",
        `• ${message}`,
        "",
        "Qué revisar antes de volver a importar:",
        "• La función import_clients_v1 todavía está generando seriales desde 0001 para un prefijo ya usado.",
        "• Hay que aplicar la migración correctiva que calcula el siguiente consecutivo disponible por prefijo.",
      ].join("\n");
    }

    if (
      lower.includes("clients_normalized_email_uniq") ||
      lower.includes("clients_normalized_phone_uniq") ||
      lower.includes("clients_operation_normalized_email_uniq") ||
      lower.includes("clients_operation_normalized_phone_uniq")
    ) {
      return [
        "No se pudo insertar uno o más clientes porque ya existen con el mismo email o teléfono dentro del alcance validado por la base.",
        "",
        "Detalles detectados:",
        `• ${message}`,
        "",
        "Qué revisar antes de volver a importar:",
        "• Si el duplicado pertenece a otra operación, la base aún tiene índices globales viejos y debe aplicarse la migración de alcance por operación.",
        "• Si el duplicado pertenece a esta misma operación, el archivo trae clientes ya existentes y serán omitidos.",
      ].join("\n");
    }

    if (
      lower.includes("campaigns_pkey") ||
      (lower.includes("duplicate key value") && lower.includes("campaign"))
    ) {
      return [
        "No se pudo crear la campaña de importación.",
        "",
        "Detalles detectados:",
        `• ${message}`,
        "",
        "Qué revisar antes de volver a importar:",
        "• La base productiva parece tener el esquema de campañas desactualizado.",
        "• Falta aplicar la migración que mueve la llave primaria de campañas hacia campaigns.id.",
        "• Después de aplicar esa migración, la importación debe volver a funcionar por operación.",
      ].join("\n");
    }

    if (
      lower.includes("target campaign not found") ||
      lower.includes("target campaign is outside current operation") ||
      lower.includes("target campaign tenant does not match")
    ) {
      return [
        "No se pudo anexar la importación a la base seleccionada.",
        "",
        "Detalles detectados:",
        `• ${message}`,
        "",
        "Qué revisar antes de volver a importar:",
        "• Confirma que la base seleccionada pertenezca a la operación activa.",
        "• Recarga la vista de campañas si la base fue creada hace poco.",
      ].join("\n");
    }

    if (
      lower.includes("cabecera") ||
      lower.includes("encabezado") ||
      lower.includes("header")
    ) {
      return [
        "No se pudo procesar el archivo.",
        "",
        "Detalles detectados:",
        `• ${message}`,
        "",
        "Qué revisar antes de volver a importar:",
        "• Deja una sola tabla en la hoja.",
        "• Asegúrate de que la tabla tenga una única fila de encabezados.",
        "• Usa encabezados como Nombre, Apellido, Email, Teléfono, País, Fuente.",
      ].join("\n");
    }

    if (
      lower.includes("tabla") ||
      lower.includes("bloque") ||
      lower.includes("mezclad")
    ) {
      return [
        "No se pudo procesar el archivo.",
        "",
        "Detalles detectados:",
        `• ${message}`,
        "",
        "Qué revisar antes de volver a importar:",
        "• El archivo parece tener varias tablas pegadas.",
        "• Deja solo la tabla que realmente quieres importar.",
        "• Elimina subtítulos, bloques extra y filas de separación.",
      ].join("\n");
    }

    if (
      lower.includes("válidos") ||
      lower.includes("validos") ||
      lower.includes("sospechosa")
    ) {
      return [
        "No se pudo procesar el archivo.",
        "",
        "Detalles detectados:",
        `• ${message}`,
        "",
        "Qué revisar antes de volver a importar:",
        "• Revisa que nombre, email y teléfono estén en la columna correcta.",
        "• No dejes filas con datos corridos entre columnas.",
        "• Corrige filas donde el nombre sea un número o el teléfono sea claramente inválido.",
      ].join("\n");
    }

    return message;
  };

  const downloadDuplicateReport = useCallback(() => {
    if (!duplicateRows.length) return;

    const header = [
      "fila_original",
      "tipo_repetido",
      "detalle",
      "nombre",
      "apellido",
      "email",
      "telefono",
      "pais",
      "fuente",
    ];

    const lines = duplicateRows.map((row) =>
      [
        row.row_number,
        DUPLICATE_TYPE_LABELS[row.duplicate_type] || row.duplicate_reason,
        row.duplicate_reason,
        row.first_name ?? "",
        row.last_name ?? "",
        row.email ?? "",
        row.phone_number ?? "",
        row.country ?? "",
        row.source ?? "",
      ]
        .map(escapeCsvValue)
        .join(","),
    );

    const csvContent = [header.join(","), ...lines].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const suffix =
      importMode === "existing"
        ? selectedCampaign?.prefix || "base-existente"
        : result?.campaign_prefix || "nueva-base";

    downloadBlob(blob, `repetidos-importacion-${suffix}.csv`);
  }, [duplicateRows, importMode, result?.campaign_prefix, selectedCampaign?.prefix]);

  const downloadDuplicateReportXlsx = useCallback(async () => {
    if (!duplicateRows.length) return;

    const suffix =
      importMode === "existing"
        ? selectedCampaign?.prefix || "base-existente"
        : result?.campaign_prefix || "nueva-base";

    const rows = duplicateRows.map((row) => ({
      fila_original: row.row_number,
      tipo_repetido:
        DUPLICATE_TYPE_LABELS[row.duplicate_type] || row.duplicate_reason,
      detalle: row.duplicate_reason,
      nombre: row.first_name ?? "",
      apellido: row.last_name ?? "",
      email: row.email ?? "",
      telefono: row.phone_number ?? "",
      pais: row.country ?? "",
      fuente: row.source ?? "",
    }));

    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!freeze"] = { xSplit: 0, ySplit: 1 };
    ws["!autofilter"] = { ref: ws["!ref"] || "A1:A1" };
    ws["!cols"] = [
      { wch: 12 },
      { wch: 28 },
      { wch: 28 },
      { wch: 18 },
      { wch: 22 },
      { wch: 34 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, "Repetidos");

    const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([out], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    downloadBlob(blob, `repetidos-importacion-${suffix}.xlsx`);
  }, [duplicateRows, importMode, result?.campaign_prefix, selectedCampaign?.prefix]);

  const handleImport = async () => {
    if (!file) return;
    if (importMode === "existing" && !selectedCampaignId) {
      setError("Selecciona una base existente antes de importar.");
      return;
    }

    setPhase("processing");
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const clientsData = await processExcelFile(file);

      if (clientsData.length === 0) {
        setPhase("form");
        setError(
          [
            "No se encontraron datos válidos en el archivo.",
            "",
            "Qué revisar antes de volver a importar:",
            "• Asegúrate de que el archivo tenga una sola tabla.",
            "• La tabla debe tener una única fila de encabezados.",
            "• Cada fila debe tener al menos email, teléfono razonable o nombre coherente.",
          ].join("\n"),
        );
        return;
      }

      const { data, error: importError } =
        importMode === "existing"
          ? await supabase.rpc("import_clients_to_existing_campaign_v1", {
              p_clients: clientsData,
              p_campaign_id: selectedCampaignId,
              p_operation_id: selectedOperationId ?? null,
            })
          : await supabase.rpc("import_clients_v1", {
              p_clients: clientsData,
              p_campaign_name: campaignName.trim() || null,
              p_operation_id: selectedOperationId ?? null,
            });

      if (importError) {
        setPhase("form");
        setError(
          formatFrontendParseError(
            importError.message || "Error al ejecutar la importación.",
          ),
        );
        return;
      }

      const importResult = data as ImportResult | null;

      if (!importResult) {
        setError("No se recibió respuesta del servidor.");
        return;
      }

      if ((importResult as { error?: unknown }).error) {
        setPhase("form");
        setError(
          formatFrontendParseError(
            String((importResult as { error?: unknown }).error),
          ),
        );
        return;
      }

      if ((importResult.success ?? 0) <= 0) {
        if ((importResult.skipped_count ?? 0) > 0) {
          setResult(importResult);
          setPhase("result");
          return;
        }

        setPhase("form");
        setError(
          formatImportErrors(
            Array.isArray(importResult.errors) ? importResult.errors : [], 
          ),
        );
        return;
      }

      setResult(importResult);
      setPhase("result");
      await onImport();
    } catch (err: any) {
      setPhase("form");
      setError(
        formatFrontendParseError(
          err?.message || "Error inesperado al importar el archivo.",
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  const normalizeHeader = (h: any) =>
    (h ?? "")
      .toString()
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const COLUMN_MAPPING: Record<string, string> = {
    nombre: "first_name",
    nombres: "first_name",
    "primer nombre": "first_name",
    "nombre cliente": "first_name",
    "nombre del cliente": "first_name",
    firstname: "first_name",
    "first name": "first_name",
    "given name": "first_name",

    apellido: "last_name",
    apellidos: "last_name",
    "segundo nombre": "last_name",
    lastname: "last_name",
    "last name": "last_name",
    surname: "last_name",
    "family name": "last_name",

    name: "full_name",
    "full name": "full_name",
    fullname: "full_name",
    "nombre completo": "full_name",
    "nombres y apellidos": "full_name",
    "client name": "full_name",
    "customer name": "full_name",

    email: "email",
    correo: "email",
    "correo electronico": "email",
    "e mail": "email",
    "e mail address": "email",
    mail: "email",
    "email address": "email",
    "contact email": "email",

    telefono: "phone_number",
    "telefono celular": "phone_number",
    "numero telefono": "phone_number",
    tel: "phone_number",
    celular: "phone_number",
    movil: "phone_number",
    whatsapp: "phone_number",
    phone: "phone_number",
    "phone number": "phone_number",
    mobile: "phone_number",
    cell: "phone_number",
    cellphone: "phone_number",

    pais: "country",
    "pais de residencia": "country",
    country: "country",
    "country of residence": "country",
    nationality: "country",
    location: "country",

    empresa: "source",
    fuente: "source",
    origen: "source",
    source: "source",
    company: "source",
    broker: "source",
    brand: "source",
    "brand name": "source",
    "brand name broker": "source",
    campaign: "source",
    campana: "source",

    funnel: "funnel",
    embudo: "funnel",
    etapa: "funnel",
    fase: "funnel",
    stage: "funnel",
    pipeline: "funnel",
    status: "funnel",

    deposit_amount: "deposit_amount",
    "deposit amount": "deposit_amount",
    deposito: "deposit_amount",
    "monto depositado": "deposit_amount",
    monto: "deposit_amount",
    cantidad: "deposit_amount",
    valor: "deposit_amount",
    importe: "deposit_amount",
    deposit: "deposit_amount",
    amount: "deposit_amount",
    "total deposit": "deposit_amount",
    "total deposited": "deposit_amount",

    net_deposit: "net_deposit",
    "net deposit": "net_deposit",
    neto: "net_deposit",
    "monto neto": "net_deposit",
    "deposito neto": "net_deposit",
    "net amount": "net_deposit",

    user_balance: "user_balance",
    "user balance": "user_balance",
    balance: "user_balance",
    saldo: "user_balance",
    "saldo usuario": "user_balance",
    "account balance": "user_balance",
    equity: "user_balance",
    capital: "user_balance",
    wallet: "user_balance",
    "wallet balance": "user_balance",

    "fecha inversion": "investment_date",
    "fecha inversion 1": "investment_date",
    fecha_inversion: "investment_date",
    "investment date": "investment_date",
    investment_date: "investment_date",
    "fecha deposito": "investment_date",
    "fecha de deposito": "investment_date",
    "deposit date": "investment_date",
    depositdate: "investment_date",
    date: "investment_date",
    fecha: "investment_date",
  };

  const processExcelFile = async (file: File): Promise<ParsedClient[]> => {
    const XLSX = await import("xlsx");

    return new Promise((resolve, reject) => {
      try {
        const reader = new FileReader();

        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);

            const workbook = XLSX.read(data, {
              type: "array",
              cellDates: true,
            });

            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, {
              header: 1,
              defval: "",
              blankrows: false,
            });

            if (jsonData.length < 2) {
              throw new Error(
                "El archivo debe tener al menos una fila de encabezados y una fila de datos.",
              );
            }

            const headerInfo = detectHeaderRow(jsonData);

            if (!headerInfo) {
              throw new Error(
                "No se encontró una cabecera válida. La hoja debe contener una sola tabla con encabezados reconocibles.",
              );
            }

            const { headerRowIndex, normalizedHeaders, indexToField } = headerInfo;

            if (Object.keys(indexToField).length < MIN_RECOGNIZED_HEADERS) {
              throw new Error(
                "No se reconocieron suficientes columnas válidas en la cabecera. Revisa que la hoja tenga encabezados correctos.",
              );
            }

            const clients: ParsedClient[] = [];
            const warnings: string[] = [];

            let repeatedHeaderRows = 0;
            let suspiciousRows = 0;
            let invalidRows = 0;

            const parseNumber = (v: any) => {
              const s = v?.toString?.() ?? "";
              const cleaned = s.replace(/[^0-9,.-]/g, "");
              if (!cleaned) return undefined;

              const commaCount = (cleaned.match(/,/g) || []).length;
              const dotCount = (cleaned.match(/\./g) || []).length;

              let parsed = cleaned;

              if (commaCount > 0 && dotCount > 0) {
                if (cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")) {
                  parsed = cleaned.replace(/\./g, "").replace(",", ".");
                } else {
                  parsed = cleaned.replace(/,/g, "");
                }
              } else if (commaCount > 0 && dotCount === 0) {
                parsed = cleaned.replace(",", ".");
              }

              const num = Number(parsed);
              return Number.isFinite(num) ? num : undefined;
            };

            const parseDateISO = (v: any): string | undefined => {
              if (!v && v !== 0) return undefined;

              if (v instanceof Date && !isNaN(v.getTime())) {
                return v.toISOString().split("T")[0];
              }

              if (typeof v === "number") {
                const d = XLSX.SSF.parse_date_code(v);
                if (d && d.y && d.m && d.d) {
                  const dt = new Date(Date.UTC(d.y, d.m - 1, d.d));
                  if (!isNaN(dt.getTime())) {
                    return dt.toISOString().split("T")[0];
                  }
                }
                return undefined;
              }

              const dt = new Date(v);
              if (!isNaN(dt.getTime())) return dt.toISOString().split("T")[0];
              return undefined;
            };

            for (let r = headerRowIndex + 1; r < jsonData.length; r++) {
              const row = jsonData[r];
              if (!row || row.length === 0) {
                continue;
              }

              const normalizedRow = row.map(normalizeHeader);

              if (rowLooksLikeHeader(normalizedRow)) {
                repeatedHeaderRows++;
                warnings.push(
                  `Fila ${r + 1}: parece una cabecera repetida o el inicio de otro bloque.`,
                );
                continue;
              }

              const client: ParsedClient = {};

              for (let c = 0; c < normalizedHeaders.length; c++) {
                const fieldName = indexToField[c];
                if (!fieldName) continue;

                const cellValue = row[c];
                if (
                  cellValue === undefined ||
                  cellValue === null ||
                  cellValue === ""
                ) {
                  continue;
                }

                if (
                  ["deposit_amount", "net_deposit", "user_balance"].includes(
                    fieldName,
                  )
                ) {
                  const num = parseNumber(cellValue);
                  if (num !== undefined) {
                    (client as any)[fieldName] = num;
                  }
                  continue;
                }

                if (fieldName === "investment_date") {
                  const iso = parseDateISO(cellValue);
                  if (iso) client[fieldName] = iso;
                  continue;
                }

                const text = String(cellValue).trim();
                if (text) {
                  (client as any)[fieldName] = text;
                }
              }

              if (!client.first_name && (client as any).full_name) {
                const parts = String((client as any).full_name)
                  .trim()
                  .split(/\s+/)
                  .filter(Boolean);

                if (parts.length > 0) {
                  client.first_name = parts.shift();
                  const rest = parts.join(" ").trim();
                  if (rest) client.last_name = rest;
                }
                delete (client as any).full_name;
              }

              const rowValidation = validateParsedClient(client);

              if (rowValidation.kind === "empty") {
                continue;
              }

              if (rowValidation.kind === "suspicious") {
                suspiciousRows++;
                warnings.push(`Fila ${r + 1}: ${rowValidation.reason}`);
                continue;
              }

              if (rowValidation.kind === "invalid") {
                invalidRows++;
                warnings.push(`Fila ${r + 1}: ${rowValidation.reason}`);
                continue;
              }

              clients.push(rowValidation.client);
            }

            if (repeatedHeaderRows > MAX_HEADER_ROWS_INSIDE_DATA) {
              throw new Error(
                "Se detectaron cabeceras repetidas o múltiples bloques dentro de la hoja. Deja una sola tabla antes de importar.",
              );
            }

            if (suspiciousRows > MAX_SUSPICIOUS_ROWS_BEFORE_FAIL) {
              throw new Error(
                "Se detectaron demasiadas filas sospechosas con datos corridos o mal alineados. Revisa el archivo antes de importarlo.",
              );
            }

            if (clients.length === 0) {
              throw new Error(
                "No se encontraron registros válidos. Revisa que el archivo tenga cabecera correcta y que los datos estén en la columna correspondiente.",
              );
            }

            const totalReviewed =
              clients.length + suspiciousRows + invalidRows + repeatedHeaderRows;
            if (totalReviewed > 0) {
              const suspiciousRatio =
                (suspiciousRows + invalidRows + repeatedHeaderRows) / totalReviewed;

              if (suspiciousRatio >= 0.45) {
                throw new Error(
                  "El archivo tiene demasiadas filas inválidas o estructura inconsistente. Parece mal formateado y fue rechazado.",
                );
              }
            }

            resolve(clients);
          } catch (err: any) {
            reject(err);
          }
        };

        reader.onerror = () => reject(new Error("Error leyendo el archivo."));
        reader.readAsArrayBuffer(file);
      } catch (xlsxError: any) {
        reject(
          new Error(
            "Error cargando la librería XLSX: " +
              (xlsxError?.message || xlsxError),
          ),
        );
      }
    });
  };

  function detectHeaderRow(jsonData: any[][]) {
    let bestRowIndex = -1;
    let bestScore = -1;
    let bestNormalizedHeaders: string[] = [];
    let bestIndexToField: Record<number, string> = {};

    const limit = Math.min(jsonData.length, HEADER_SCAN_LIMIT);

    for (let r = 0; r < limit; r++) {
      const rawRow = jsonData[r] ?? [];
      const normalizedHeaders = rawRow.map(normalizeHeader);

      const indexToField: Record<number, string> = {};
      let recognized = 0;

      for (let i = 0; i < normalizedHeaders.length; i++) {
        const nh = normalizedHeaders[i];
        if (!nh) continue;
        const fieldName = COLUMN_MAPPING[nh];
        if (fieldName) {
          indexToField[i] = fieldName;
          recognized++;
        }
      }

      const headerTokenHits = normalizedHeaders.filter((h) =>
        HEADER_TOKENS.has(h),
      ).length;

      const score = recognized * 10 + headerTokenHits;

      if (recognized >= MIN_RECOGNIZED_HEADERS && score > bestScore) {
        bestRowIndex = r;
        bestScore = score;
        bestNormalizedHeaders = normalizedHeaders;
        bestIndexToField = indexToField;
      }
    }

    if (bestRowIndex < 0) return null;

    return {
      headerRowIndex: bestRowIndex,
      normalizedHeaders: bestNormalizedHeaders,
      indexToField: bestIndexToField,
    };
  }

  function rowLooksLikeHeader(normalizedRow: string[]) {
    const values = normalizedRow.filter(Boolean);
    if (values.length === 0) return false;

    let matches = 0;
    for (const value of values) {
      if (HEADER_TOKENS.has(value) || COLUMN_MAPPING[value]) {
        matches++;
      }
    }

    return matches >= 2;
  }

  function validateParsedClient(client: ParsedClient):
    | { kind: "valid"; client: ParsedClient }
    | { kind: "invalid"; reason: string }
    | { kind: "suspicious"; reason: string }
    | { kind: "empty" } {
    const firstName = cleanText(client.first_name);
    const lastName = cleanText(client.last_name);
    const email = cleanEmail(client.email);
    const phone = cleanPhone(client.phone_number);

    const normalized: ParsedClient = {
      ...client,
      first_name: firstName || undefined,
      last_name: lastName || undefined,
      email: email || undefined,
      phone_number: phone || undefined,
      country: cleanText(client.country) || undefined,
      source: cleanText(client.source) || undefined,
      funnel: cleanText(client.funnel) || undefined,
    };

    const hasAny =
      !!normalized.first_name ||
      !!normalized.last_name ||
      !!normalized.email ||
      !!normalized.phone_number ||
      !!normalized.country ||
      !!normalized.source ||
      !!normalized.funnel ||
      normalized.deposit_amount !== undefined ||
      normalized.net_deposit !== undefined ||
      normalized.user_balance !== undefined ||
      !!normalized.investment_date;

    if (!hasAny) {
      return { kind: "empty" };
    }

    if (normalized.first_name && isNumericLike(normalized.first_name)) {
      if (!normalized.email && !normalized.phone_number) {
        return {
          kind: "suspicious",
          reason:
            "nombre numérico sin otro dato confiable. Parece una fila mal alineada.",
        };
      }
    }

    if (
      normalized.phone_number &&
      !isReasonablePhone(normalized.phone_number)
    ) {
      return {
        kind: "suspicious",
        reason:
          "teléfono inválido o demasiado largo. Revisa si las columnas están corridas.",
      };
    }

    if (
      normalized.first_name &&
      rowLooksLikeHeader([normalizeHeader(normalized.first_name)])
    ) {
      return {
        kind: "suspicious",
        reason: "parece una cabecera dentro de los datos.",
      };
    }

    const hasStrongIdentity = !!normalized.email || !!normalized.phone_number;
    const hasNameIdentity =
      !!normalized.first_name && !isNumericLike(normalized.first_name);

    if (!hasStrongIdentity && !hasNameIdentity) {
      return {
        kind: "invalid",
        reason:
          "no tiene email válido, teléfono razonable ni un nombre coherente.",
      };
    }

    return { kind: "valid", client: normalized };
  }

  function cleanText(value: unknown) {
    if (value === null || value === undefined) return "";
    return String(value).trim().replace(/\s+/g, " ");
  }

  function cleanEmail(value: unknown) {
    const email = cleanText(value).toLowerCase();
    if (!email) return "";
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
  }

  function cleanPhone(value: unknown) {
    const text = cleanText(value);
    if (!text) return "";
    const digits = text.replace(/[^\d+]/g, "");
    return digits;
  }

  function isReasonablePhone(phone: string) {
    const numbersOnly = phone.replace(/\D/g, "");
    return numbersOnly.length >= 7 && numbersOnly.length <= 15;
  }

  function isNumericLike(text: string) {
    const compact = text.replace(/\s+/g, "");
    return /^[\d.\-+/]+$/.test(compact);
  }

  const hardReset = () => {
    setFile(null);
    setImportMode("new");
    setCampaignName("");
    setSelectedCampaignId("");
    setError("");
    setResult(null);
    setPhase("form");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const close = () => {
    if (loading) return;
    hardReset();
    onClose();
  };

  const onDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    if (loading) return;

    const f = e.dataTransfer.files?.[0];
    if (!f) return;

    const isExcel =
      f.type ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      f.type === "application/vnd.ms-excel" ||
      f.name.toLowerCase().endsWith(".xlsx") ||
      f.name.toLowerCase().endsWith(".xls");

    if (!isExcel) {
      setError("Por favor, selecciona un archivo Excel valido (.xlsx o .xls).");
      setFile(null);
      setResult(null);
      return;
    }

    setFile(f);
    setError("");
    setResult(null);
    setPhase("form");
  };

  if (!isOpen) return null;

  return createPortal(
    <LazyMotion features={domAnimation}>
      <AnimatePresence mode="wait">
        <m.div
          className="fixed inset-0 z-[90] flex items-center justify-center p-4 sm:p-6"
          variants={overlayV}
          initial="initial"
          animate="animate"
          exit="exit"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div className="absolute inset-0 bg-[rgba(15,23,42,0.42)] backdrop-blur-sm" />

          <m.div
            className={cn(campaignModalPanelClass, "max-w-2xl")}
            variants={panelV}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <ModalHeader
              icon={<FileSpreadsheet className="h-5 w-5 text-emerald-600" />}
              title="Importar clientes desde Excel"
              description={
                importMode === "existing"
                  ? "XLSX/XLS. Los clientes se anexarán a una base existente."
                  : "XLSX/XLS. Se creará una campaña nueva automáticamente."
              }
              onClose={close}
              closeDisabled={loading}
              className={campaignModalHeaderClass}
            />

            <ModalBody className="space-y-6">
              <div className={cn(campaignInsetClass, "p-4", phase !== "form" && "hidden")}>
                <div className="mb-2 block text-sm font-semibold text-ink/80">
                  Destino de la importación
                </div>
                <p className="mt-2 text-xs text-muted">
                  Elige si esta carga crea una base nueva o si se anexará a una ya existente.
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      setImportMode("new");
                      setSelectedCampaignId("");
                      setError("");
                      setResult(null);
                    }}
                    disabled={loading}
                    className={cn(
                      "rounded-[1.15rem] border px-4 py-3 text-left transition",
                      importMode === "new"
                        ? "border-brand/24 bg-brand/[0.08] shadow-[0_16px_28px_rgba(15,23,42,0.06)]"
                        : "border-white/74 bg-white/72 hover:bg-white/84",
                    )}
                  >
                    <div className="text-sm font-semibold text-ink/85">
                      Crear base nueva
                    </div>
                    <div className="mt-1 text-xs text-muted">
                      Se generará una campaña nueva para esta importación.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!canAppendToExisting) return;
                      setImportMode("existing");
                      setCampaignName("");
                      setError("");
                      setResult(null);
                    }}
                    disabled={loading || !canAppendToExisting}
                    className={cn(
                      "rounded-[1.15rem] border px-4 py-3 text-left transition",
                      importMode === "existing"
                        ? "border-brand/24 bg-brand/[0.08] shadow-[0_16px_28px_rgba(15,23,42,0.06)]"
                        : "border-white/74 bg-white/72 hover:bg-white/84",
                      !canAppendToExisting && "cursor-not-allowed opacity-60",
                    )}
                  >
                    <div className="text-sm font-semibold text-ink/85">
                      Anexar a base existente
                    </div>
                    <div className="mt-1 text-xs text-muted">
                      Agrega clientes a una campaña ya creada sin abrir una nueva.
                    </div>
                  </button>
                </div>

                {!canAppendToExisting ? (
                  <p className="mt-3 text-xs text-amber-700">
                    Para anexar clientes primero debes seleccionar una operación activa.
                  </p>
                ) : null}
              </div>

              {importMode === "new" ? (
                <div className={cn(campaignInsetClass, "p-4", phase !== "form" && "hidden")}>
                  <div className="mb-2 block text-sm font-semibold text-ink/80">
                    Nombre de campaña (opcional)
                  </div>
                  <Input
                    type="text"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="Ej: EZinvest Feb 20 / Reactivacion MX"
                    disabled={loading}
                  />
                  <p className="mt-2 text-xs text-muted">
                    Esto solo es una etiqueta para identificar la campaña nueva.
                  </p>
                </div>
              ) : (
                <div className={cn(campaignInsetClass, "p-4", phase !== "form" && "hidden")}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="block text-sm font-semibold text-ink/80">
                      Base destino
                    </div>
                    {loadingCampaigns ? (
                      <span className="text-xs text-muted">Cargando bases...</span>
                    ) : null}
                  </div>

                  <Select
                    value={selectedCampaignId || EXISTING_CAMPAIGN_PLACEHOLDER}
                    onValueChange={(value) => {
                      if (value === EXISTING_CAMPAIGN_PLACEHOLDER) return;
                      setSelectedCampaignId(value);
                      setError("");
                      setResult(null);
                    }}
                    disabled={loading || loadingCampaigns || !canAppendToExisting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una base existente" />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value={EXISTING_CAMPAIGN_PLACEHOLDER} disabled>
                        Selecciona una base existente
                      </SelectItem>
                      {availableCampaigns.map((campaign) => (
                        <SelectItem key={campaign.id} value={campaign.id}>
                          {(campaign.display_name?.trim() || `Campaña ${campaign.prefix}`) +
                            ` · ${campaign.prefix}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <p className="mt-2 text-xs text-muted">
                    {selectedCampaign
                      ? `Los clientes se anexarán a ${selectedCampaign.display_name?.trim() || `Campaña ${selectedCampaign.prefix}`}.`
                      : "Elige la base donde se anexarán los clientes importados."}
                  </p>
                </div>
              )}

              <div className={cn(campaignInsetClass, "p-4", phase !== "form" && "hidden")}>
                <div className="mb-2 flex items-center justify-between">
                  <div className="block text-sm font-semibold text-ink/80">
                    Seleccionar archivo Excel
                  </div>

                  {file ? (
                    <button
                      type="button"
                      onClick={hardReset}
                      disabled={loading}
                      className="text-xs font-semibold text-muted transition hover:text-ink"
                    >
                      Quitar archivo
                    </button>
                  ) : null}
                </div>

                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={onDrop}
                  className={cn(
                    "rounded-[1.25rem] border border-dashed p-6 transition",
                    "border-white/78 bg-white/48 hover:border-brand/30 hover:bg-white/58",
                    loading && "pointer-events-none opacity-70",
                  )}
                >
                  <div className="flex flex-col items-center gap-3 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/76 bg-white/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.88)]">
                      <UploadCloud className="h-6 w-6 text-brand" />
                    </div>

                    <div className="text-sm text-ink/80">
                      <span className="font-semibold">Arrastra y suelta</span> tu
                      archivo aqui
                      <span className="text-muted"> o </span>
                      <label className="cursor-pointer font-semibold text-brand hover:opacity-90">
                        selecciona un archivo
                        <input
                          ref={fileInputRef}
                          type="file"
                          className="sr-only"
                          accept=".xlsx,.xls"
                          onChange={handleFileSelect}
                          disabled={loading}
                        />
                      </label>
                    </div>

                    <div className="text-xs text-muted">XLSX/XLS hasta 10MB</div>

                    {file && (
                      <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/76 bg-white/72 px-3 py-1 text-xs text-ink/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.84)]">
                        <CheckCircle className="h-4 w-4 text-emerald-600" />
                        <span className="font-semibold">{file.name}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {phase === "processing" ? (
                <div className={cn(campaignInsetClass, "p-8")}>
                  <div className="flex flex-col items-center justify-center gap-4 text-center">
                    <LoadingSpinner
                      size="lg"
                      text="Procesando archivo..."
                      fullScreen={false}
                    />
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-ink/85">
                        Estamos validando el archivo y preparando la importacion.
                      </div>
                      <div className="text-xs text-muted">
                        Esto puede tardar un poco si la base es grande.
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {error && phase === "form" && (
                <div className="rounded-[1.2rem] border border-red-200/90 bg-[linear-gradient(180deg,rgba(254,242,242,0.92),rgba(255,255,255,0.8))] p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />
                    <div>
                      <div className="text-sm font-semibold text-red-700">
                        Error
                      </div>
                      <div className="mt-1 whitespace-pre-line text-sm text-red-700/90">
                        {error}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {result && phase === "result" && (
                <div
                  className={cn(
                    "rounded-[1.2rem] p-4",
                    hasPartialImport
                      ? "border border-amber-200/90 bg-[linear-gradient(180deg,rgba(255,251,235,0.95),rgba(255,255,255,0.82))]"
                      : "border border-emerald-200/90 bg-[linear-gradient(180deg,rgba(236,253,245,0.94),rgba(255,255,255,0.8))]",
                  )}
                >
                  <div className="flex items-start gap-2">
                    {hasPartialImport ? (
                      <AlertCircle className="mt-0.5 h-5 w-5 text-amber-700" />
                    ) : (
                      <CheckCircle className="mt-0.5 h-5 w-5 text-emerald-700" />
                    )}
                    <div className="w-full">
                      <div
                        className={cn(
                          "text-sm font-semibold",
                          hasPartialImport ? "text-amber-900" : "text-emerald-900",
                        )}
                      >
                        {hasPartialImport ? "Carga parcial completada" : "Importacion completada"}
                      </div>
                      <div
                        className={cn(
                          "mt-1 text-sm",
                          hasPartialImport ? "text-amber-900/85" : "text-emerald-900/80",
                        )}
                      >
                        Se importaron <b>{result.success}</b> clientes
                        correctamente
                        {importMode === "existing" && selectedCampaign
                          ? ` en ${selectedCampaign.display_name?.trim() || `Campaña ${selectedCampaign.prefix}`}`
                          : ""}
                        {result.campaign_prefix
                          ? ` (prefijo ${result.campaign_prefix})`
                          : ""}
                        .
                        {hasPartialImport
                          ? ` Se omitieron ${skippedCount} fila${skippedCount === 1 ? "" : "s"} durante la carga.`
                          : ""}
                      </div>

                      {result.errors?.length > 0 && (
                        <div className="mt-3 rounded-xl border border-amber-200 bg-white/76 p-3">
                          <div className="text-sm font-semibold text-amber-700">
                            Avisos encontrados
                          </div>
                          <ul className="mt-2 space-y-1 text-xs text-amber-700">
                            {result.errors.map((err, idx) => (
                              <li key={idx}>• {err}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {duplicateRows.length > 0 ? (
                        <div className="mt-3 rounded-xl border border-sky-200 bg-white/76 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold text-sky-800">
                                Reporte de repetidos disponible
                              </div>
                              <div className="mt-1 text-xs text-sky-800/80">
                                Descarga el detalle de filas repetidas en CSV o Excel para revisarlas o reenviarlas corregidas.
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  void downloadDuplicateReportXlsx();
                                }}
                                className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800 transition hover:bg-sky-100"
                              >
                                <FileSpreadsheet className="h-4 w-4" />
                                Descargar Excel
                              </button>

                              <button
                                type="button"
                                onClick={downloadDuplicateReport}
                                className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-3 py-2 text-xs font-semibold text-sky-800 transition hover:bg-sky-50"
                              >
                                <Download className="h-4 w-4" />
                                Descargar CSV
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              )}
            </ModalBody>

            <ModalFooter className={cn("justify-end gap-2", campaignModalFooterClass)}>
              <button
                onClick={phase === "result" ? hardReset : close}
                className={modalSecondaryActionClassName}
                disabled={loading}
                type="button"
              >
                {phase === "result" ? "Importar otro archivo" : "Cancelar"}
              </button>

              {phase === "result" ? (
                <button
                  onClick={close}
                  className={modalPrimaryActionClassName}
                  type="button"
                >
                  Cerrar
                </button>
              ) : phase === "processing" ? null : (
                <button
                  onClick={handleImport}
                  disabled={!file || loading}
                  className={modalPrimaryActionClassName}
                  type="button"
                >
                  {loading ? (
                    <LoadingSpinner
                      size="sm"
                      text="Importando..."
                      fullScreen={false}
                    />
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Importar Clientes
                    </>
                  )}
                </button>
              )}
            </ModalFooter>
          </m.div>
        </m.div>
      </AnimatePresence>
    </LazyMotion>,
    document.body,
  );
}
