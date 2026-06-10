// utils.ts - Utilidades de UI, estados de cliente y formatos compartidos.

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type ClientStatusCode = string;
export const TRANSFERRED_CLIENT_STATUS_CODE = "TR";

type LegacyStatusColor = "gray" | "red" | "yellow" | "green" | "blue";

type StatusLike =
  | string
  | {
      status_code?: string | null;
      status_color?: string | null;
    };

export type ClientStatusMeta = {
  code: ClientStatusCode;
  label: string;
  shortLabel: string;
  description: string;
  dotClass: string;
  indicatorClass: string;
  colorToken?: string;
  isGlobal?: boolean;
  isSystem?: boolean;
};

const STATUS_COLOR_STYLES = {
  slate: {
    dotClass: "bg-slate-400 ring-1 ring-inset ring-slate-500/30",
    indicatorClass: "bg-slate-400 ring-1 ring-inset ring-slate-500/30",
  },
  sky: {
    dotClass: "bg-sky-500 ring-1 ring-inset ring-sky-600/30",
    indicatorClass: "bg-sky-500 ring-1 ring-inset ring-sky-600/30",
  },
  emerald: {
    dotClass: "bg-emerald-500 ring-1 ring-inset ring-emerald-600/30",
    indicatorClass: "bg-emerald-500 ring-1 ring-inset ring-emerald-600/30",
  },
  blue: {
    dotClass: "bg-blue-500 ring-1 ring-inset ring-blue-600/30",
    indicatorClass: "bg-blue-500 ring-1 ring-inset ring-blue-600/30",
  },
  rose: {
    dotClass: "bg-rose-500 ring-1 ring-inset ring-rose-600/30",
    indicatorClass: "bg-rose-500 ring-1 ring-inset ring-rose-600/30",
  },
  amber: {
    dotClass: "bg-amber-500 ring-1 ring-inset ring-amber-600/30",
    indicatorClass: "bg-amber-500 ring-1 ring-inset ring-amber-600/30",
  },
  yellow: {
    dotClass: "bg-yellow-400 ring-1 ring-inset ring-yellow-500/30",
    indicatorClass: "bg-yellow-400 ring-1 ring-inset ring-yellow-500/30",
  },
  violet: {
    dotClass: "bg-violet-500 ring-1 ring-inset ring-violet-600/30",
    indicatorClass: "bg-violet-500 ring-1 ring-inset ring-violet-600/30",
  },
  zinc: {
    dotClass: "bg-zinc-600 ring-1 ring-inset ring-zinc-700/30",
    indicatorClass: "bg-zinc-600 ring-1 ring-inset ring-zinc-700/30",
  },
} as const;

type StatusColorToken = keyof typeof STATUS_COLOR_STYLES;

function resolveStatusColorStyles(colorToken?: string | null) {
  const token = String(colorToken ?? "slate").trim().toLowerCase() as StatusColorToken;
  return STATUS_COLOR_STYLES[token] ?? STATUS_COLOR_STYLES.slate;
}

export const CLIENT_STATUS_OPTIONS: ClientStatusMeta[] = [
  {
    code: "NU",
    label: "Nuevo",
    shortLabel: "NU",
    description: "Estado base automatico al cargar una base nueva",
    ...resolveStatusColorStyles("slate"),
    colorToken: "slate",
    isGlobal: true,
    isSystem: true,
  },
  {
    code: "LD",
    label: "Llamar despues",
    shortLabel: "LD",
    description: "Cliente pidio retomar el contacto mas adelante",
    ...resolveStatusColorStyles("sky"),
    colorToken: "sky",
    isGlobal: true,
    isSystem: true,
  },
  {
    code: "DP",
    label: "Deposito",
    shortLabel: "DP",
    description: "El cliente ya realizo el deposito o confirmo ingreso",
    ...resolveStatusColorStyles("emerald"),
    colorToken: "emerald",
    isGlobal: true,
    isSystem: true,
  },
  {
    code: "SG",
    label: "Seguimiento",
    shortLabel: "SG",
    description: "Cliente activo en gestion comercial o de continuidad",
    ...resolveStatusColorStyles("blue"),
    colorToken: "blue",
    isGlobal: true,
    isSystem: true,
  },
  {
    code: "NC",
    label: "No contesta",
    shortLabel: "NC",
    description: "No atiende, buzon o no fue posible concretar contacto",
    ...resolveStatusColorStyles("slate"),
    colorToken: "slate",
    isGlobal: true,
    isSystem: true,
  },
  {
    code: "NI",
    label: "No interesado",
    shortLabel: "NI",
    description: "Rechazo explicito o sin intencion de continuar",
    ...resolveStatusColorStyles("rose"),
    colorToken: "rose",
    isGlobal: true,
    isSystem: true,
  },
  {
    code: "NX",
    label: "Numero no existe",
    shortLabel: "NX",
    description: "La linea no existe, esta fuera de servicio o invalida",
    ...resolveStatusColorStyles("amber"),
    colorToken: "amber",
    isGlobal: true,
    isSystem: true,
  },
  {
    code: "NE",
    label: "Numero equivocado",
    shortLabel: "NE",
    description: "El contacto responde, pero no corresponde al cliente",
    ...resolveStatusColorStyles("yellow"),
    colorToken: "yellow",
    isGlobal: true,
    isSystem: true,
  },
  {
    code: "RA",
    label: "Reasignar",
    shortLabel: "RA",
    description: "El lead debe volver a reparto o cambiar de responsable",
    ...resolveStatusColorStyles("violet"),
    colorToken: "violet",
    isGlobal: true,
    isSystem: true,
  },
  {
    code: TRANSFERRED_CLIENT_STATUS_CODE,
    label: "Transferido",
    shortLabel: "TR",
    description: "Marcador automatico al transferir un cliente entre agentes",
    ...resolveStatusColorStyles("amber"),
    colorToken: "amber",
    isGlobal: true,
    isSystem: true,
  },
  {
    code: "FS",
    label: "Fin de seguimiento",
    shortLabel: "FS",
    description: "La gestion se cierra sin mas acciones pendientes",
    ...resolveStatusColorStyles("zinc"),
    colorToken: "zinc",
    isGlobal: true,
    isSystem: true,
  },
];

let runtimeClientStatusOptions = [...CLIENT_STATUS_OPTIONS];

function buildStatusMetaMap(options: ClientStatusMeta[]) {
  return options.reduce(
    (acc, item) => {
      acc[item.code] = item;
      return acc;
    },
    {} as Record<string, ClientStatusMeta>,
  );
}

const LEGACY_STATUS_CODE_TO_CODE: Record<string, ClientStatusCode> = {
  SC: "NU",
  NA: "NC",
  NI: "NI",
  CB: "SG",
  WN: "NE",
  HU: "LD",
  CP: "SG",
};

const LEGACY_COLOR_TO_CODE: Record<LegacyStatusColor, ClientStatusCode> = {
  gray: "NU",
  red: "NC",
  yellow: "NI",
  green: "DP",
  blue: "SG",
};

export function isClientStatusCode(
  value?: string | null,
): value is ClientStatusCode {
  return String(value ?? "").trim().length > 0;
}

function normalizeStatusCode(value?: string | null): ClientStatusCode | null {
  const code = String(value ?? "")
    .trim()
    .toUpperCase();

  if (code.length > 0) {
    return code;
  }

  return LEGACY_STATUS_CODE_TO_CODE[code] ?? null;
}

function normalizeLegacyStatusColor(
  value?: string | null,
): LegacyStatusColor | null {
  const color = String(value ?? "")
    .trim()
    .toLowerCase();

  if (
    color === "gray" ||
    color === "red" ||
    color === "yellow" ||
    color === "green" ||
    color === "blue"
  ) {
    return color;
  }

  return null;
}

function buildFallbackStatus(code: string): ClientStatusMeta {
  return {
    code,
    label: code,
    shortLabel: code,
    description: "Tipificacion personalizada del tenant.",
    ...resolveStatusColorStyles("slate"),
    colorToken: "slate",
    isGlobal: false,
    isSystem: false,
  };
}

export function resolveClientStatus(status: StatusLike): ClientStatusMeta {
  const statusMetaMap = buildStatusMetaMap(runtimeClientStatusOptions);

  if (typeof status === "string") {
    const asCode = normalizeStatusCode(status);
    if (asCode && statusMetaMap[asCode]) return statusMetaMap[asCode];

    const asLegacyColor = normalizeLegacyStatusColor(status);
    if (asLegacyColor) {
      return statusMetaMap[LEGACY_COLOR_TO_CODE[asLegacyColor]];
    }

    return asCode ? buildFallbackStatus(asCode) : statusMetaMap.NU;
  }

  const code = normalizeStatusCode(status?.status_code);
  if (code && statusMetaMap[code]) return statusMetaMap[code];

  const legacyColor = normalizeLegacyStatusColor(status?.status_color);
  if (legacyColor) return statusMetaMap[LEGACY_COLOR_TO_CODE[legacyColor]];

  return code ? buildFallbackStatus(code) : statusMetaMap.NU;
}

export function getStatusCode(status: StatusLike): ClientStatusCode {
  return resolveClientStatus(status).code;
}

export function getStatusColor(status: StatusLike): string {
  return resolveClientStatus(status).indicatorClass;
}

export function getStatusText(status: StatusLike): string {
  return resolveClientStatus(status).label;
}

export function getStatusDotClass(status: StatusLike): string {
  return resolveClientStatus(status).dotClass;
}

export function getLegacyStatusColor(status: StatusLike): LegacyStatusColor {
  const code = getStatusCode(status);

  switch (code) {
    case "NU":
      return "gray";
    case "DP":
      return "green";
    case "SG":
    case "LD":
      return "blue";
    case "NC":
    case "NX":
    case "NE":
      return "red";
    case "NI":
    case "FS":
    case "RA":
    case TRANSFERRED_CLIENT_STATUS_CODE:
    default:
      return "yellow";
  }
}

export function getClientStatusOptions() {
  return runtimeClientStatusOptions;
}

export function setClientStatusOptions(options: ClientStatusMeta[]) {
  runtimeClientStatusOptions =
    Array.isArray(options) && options.length > 0
      ? [...options]
      : [...CLIENT_STATUS_OPTIONS];
}

export function toClientStatusMeta(input: {
  code: string;
  label: string;
  short_label?: string | null;
  description?: string | null;
  color_token?: string | null;
  is_global?: boolean | null;
  is_system?: boolean | null;
}) {
  const code = String(input.code ?? "").trim().toUpperCase();
  const styles = resolveStatusColorStyles(input.color_token);

  return {
    code,
    label: String(input.label ?? code).trim() || code,
    shortLabel:
      String(input.short_label ?? code).trim().toUpperCase() || code,
    description: String(input.description ?? "").trim(),
    ...styles,
    colorToken: String(input.color_token ?? "slate").trim().toLowerCase(),
    isGlobal: Boolean(input.is_global),
    isSystem: Boolean(input.is_system),
  } satisfies ClientStatusMeta;
}

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString("es-ES", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  }

  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export function formatCurrency(value: number | string): string {
  const amount =
    typeof value === "number" ? value : Number(String(value).replace(",", "."));

  if (!Number.isFinite(amount)) {
    return "-";
  }

  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function getCallStatusText(status: string): string {
  const texts = {
    in_progress: "En progreso",
    completed: "Completada",
    failed: "Fallida",
    no_answer: "Sin respuesta",
  };
  return texts[status as keyof typeof texts] || "Desconocido";
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/\s/g, ""));
}

export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 9) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3");
  }
  if (cleaned.length === 12 && cleaned.startsWith("34")) {
    return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{3})/, "+$1 $2 $3 $4");
  }
  return phone;
}
