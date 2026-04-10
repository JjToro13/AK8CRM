// utils.ts - Utilidades de UI, estados de cliente y formatos compartidos.

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type ClientStatusCode =
  | "NU"
  | "LD"
  | "DP"
  | "SG"
  | "NC"
  | "NI"
  | "NX"
  | "NE"
  | "RA"
  | "FS";

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
};

export const CLIENT_STATUS_OPTIONS: ClientStatusMeta[] = [
  {
    code: "NU",
    label: "Nuevo",
    shortLabel: "NU",
    description: "Estado base automático al cargar una base nueva",
    dotClass: "bg-gray-100 ring-1 ring-inset ring-gray-300",
    indicatorClass: "bg-gray-100 ring-1 ring-inset ring-gray-300",
  },
  {
    code: "LD",
    label: "Llamar después",
    shortLabel: "LD",
    description: "Cliente pidió retomar el contacto más adelante",
    dotClass: "bg-sky-500 ring-1 ring-inset ring-sky-600/30",
    indicatorClass: "bg-sky-500 ring-1 ring-inset ring-sky-600/30",
  },
  {
    code: "DP",
    label: "Depósito",
    shortLabel: "DP",
    description: "El cliente ya realizó el depósito o confirmó ingreso",
    dotClass: "bg-emerald-500 ring-1 ring-inset ring-emerald-600/30",
    indicatorClass: "bg-emerald-500 ring-1 ring-inset ring-emerald-600/30",
  },
  {
    code: "SG",
    label: "Seguimiento",
    shortLabel: "SG",
    description: "Cliente activo en gestión comercial o de continuidad",
    dotClass: "bg-blue-500 ring-1 ring-inset ring-blue-600/30",
    indicatorClass: "bg-blue-500 ring-1 ring-inset ring-blue-600/30",
  },
  {
    code: "NC",
    label: "No contesta",
    shortLabel: "NC",
    description: "No atiende, buzón o no fue posible concretar contacto",
    dotClass: "bg-slate-400 ring-1 ring-inset ring-slate-500/30",
    indicatorClass: "bg-slate-400 ring-1 ring-inset ring-slate-500/30",
  },
  {
    code: "NI",
    label: "No interesado",
    shortLabel: "NI",
    description: "Rechazo explícito o sin intención de continuar",
    dotClass: "bg-rose-500 ring-1 ring-inset ring-rose-600/30",
    indicatorClass: "bg-rose-500 ring-1 ring-inset ring-rose-600/30",
  },
  {
    code: "NX",
    label: "Número no existe",
    shortLabel: "NX",
    description: "La línea no existe, está fuera de servicio o inválida",
    dotClass: "bg-amber-500 ring-1 ring-inset ring-amber-600/30",
    indicatorClass: "bg-amber-500 ring-1 ring-inset ring-amber-600/30",
  },
  {
    code: "NE",
    label: "Número equivocado",
    shortLabel: "NE",
    description: "El contacto responde, pero no corresponde al cliente",
    dotClass: "bg-yellow-400 ring-1 ring-inset ring-yellow-500/30",
    indicatorClass: "bg-yellow-400 ring-1 ring-inset ring-yellow-500/30",
  },
  {
    code: "RA",
    label: "Reasignar",
    shortLabel: "RA",
    description: "El lead debe volver a reparto o cambiar de responsable",
    dotClass: "bg-violet-500 ring-1 ring-inset ring-violet-600/30",
    indicatorClass: "bg-violet-500 ring-1 ring-inset ring-violet-600/30",
  },
  {
    code: "FS",
    label: "Fin de seguimiento",
    shortLabel: "FS",
    description: "La gestión se cierra sin más acciones pendientes",
    dotClass: "bg-zinc-600 ring-1 ring-inset ring-zinc-700/30",
    indicatorClass: "bg-zinc-600 ring-1 ring-inset ring-zinc-700/30",
  },
];

const STATUS_META_MAP: Record<ClientStatusCode, ClientStatusMeta> =
  CLIENT_STATUS_OPTIONS.reduce(
    (acc, item) => {
      acc[item.code] = item;
      return acc;
    },
    {} as Record<ClientStatusCode, ClientStatusMeta>,
  );

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
  const code = String(value ?? "")
    .trim()
    .toUpperCase();

  return (
    code === "NU" ||
    code === "LD" ||
    code === "DP" ||
    code === "SG" ||
    code === "NC" ||
    code === "NI" ||
    code === "NX" ||
    code === "NE" ||
    code === "RA" ||
    code === "FS"
  );
}

function normalizeStatusCode(value?: string | null): ClientStatusCode | null {
  const code = String(value ?? "")
    .trim()
    .toUpperCase();

  if (isClientStatusCode(code)) {
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

export function resolveClientStatus(status: StatusLike): ClientStatusMeta {
  if (typeof status === "string") {
    const asCode = normalizeStatusCode(status);
    if (asCode) return STATUS_META_MAP[asCode];

    const asLegacyColor = normalizeLegacyStatusColor(status);
    if (asLegacyColor) {
      return STATUS_META_MAP[LEGACY_COLOR_TO_CODE[asLegacyColor]];
    }

    return STATUS_META_MAP.NU;
  }

  const code = normalizeStatusCode(status?.status_code);
  if (code) return STATUS_META_MAP[code];

  const legacyColor = normalizeLegacyStatusColor(status?.status_color);
  if (legacyColor) return STATUS_META_MAP[LEGACY_COLOR_TO_CODE[legacyColor]];

  return STATUS_META_MAP.NU;
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
    default:
      return "yellow";
  }
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
