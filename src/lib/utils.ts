// utils.ts - Funciones utilitarias para formateo de fechas, validación de datos,
// generación de seriales únicos, debounce y manejo de estados/tipificaciones.

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Función para combinar clases de Tailwind CSS
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type ClientStatusCode =
  | "SC"
  | "NA"
  | "NI"
  | "CB"
  | "WN"
  | "HU"
  | "CP";

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
    code: "SC",
    label: "Sin contactar",
    shortLabel: "SC",
    description: "Estado base al subir una nueva base",
    dotClass: "bg-gray-100 ring-1 ring-inset ring-gray-300",
    indicatorClass: "bg-gray-100 ring-1 ring-inset ring-gray-300",
  },
  {
    code: "NA",
    label: "No Contesta",
    shortLabel: "NA",
    description: "No atiende, buzón, llamada cortada",
    dotClass: "bg-slate-400 ring-1 ring-inset ring-slate-500/30",
    indicatorClass: "bg-slate-400 ring-1 ring-inset ring-slate-500/30",
  },
  {
    code: "NI",
    label: "No le Interesa",
    shortLabel: "NI",
    description: "Rechazo explícito o no desea continuar",
    dotClass: "bg-red-500 ring-1 ring-inset ring-red-600/30",
    indicatorClass: "bg-red-500 ring-1 ring-inset ring-red-600/30",
  },
  {
    code: "CB",
    label: "Caso Abierto",
    shortLabel: "CB",
    description: "Hubo contacto y el caso queda pendiente de seguimiento",
    dotClass: "bg-sky-500 ring-1 ring-inset ring-sky-600/30",
    indicatorClass: "bg-sky-500 ring-1 ring-inset ring-sky-600/30",
  },
  {
    code: "CP",
    label: "Casos Potenciales",
    shortLabel: "CP",
    description: "Cliente con potencial de avance o seguimiento comercial",
    dotClass: "bg-emerald-500 ring-1 ring-inset ring-emerald-600/30",
    indicatorClass: "bg-emerald-500 ring-1 ring-inset ring-emerald-600/30",
  },
  {
    code: "WN",
    label: "Número Errado",
    shortLabel: "WN",
    description: "Número inexistente, inválido o equivocado",
    dotClass: "bg-yellow-400 ring-1 ring-inset ring-yellow-500/30",
    indicatorClass: "bg-yellow-400 ring-1 ring-inset ring-yellow-500/30",
  },
  {
    code: "HU",
    label: "Contesta y cuelga",
    shortLabel: "HU",
    description: "Responde y corta inmediatamente",
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

// Lectura legacy:
// gray   -> Sin contactar
// red    -> Múltiples intentos     => ahora se interpreta como NA
// yellow -> No desea ser contactado => ahora se interpreta como NI
// green  -> Contacto exitoso        => ahora se interpreta como CB
// blue   -> En proceso de venta     => ahora se interpreta como CB
const LEGACY_COLOR_TO_CODE: Record<LegacyStatusColor, ClientStatusCode> = {
  gray: "SC",
  red: "NA",
  yellow: "NI",
  green: "CB",
  blue: "CB",
};

function normalizeStatusCode(value?: string | null): ClientStatusCode | null {
  const code = String(value ?? "")
    .trim()
    .toUpperCase();

  if (
    code === "SC" ||
    code === "NA" ||
    code === "NI" ||
    code === "CB" ||
    code === "CP" ||
    code === "WN" ||
    code === "HU"
  ) {
    return code;
  }

  return null;
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
    if (asLegacyColor)
      return STATUS_META_MAP[LEGACY_COLOR_TO_CODE[asLegacyColor]];

    return STATUS_META_MAP.SC;
  }

  const code = normalizeStatusCode(status?.status_code);
  if (code) return STATUS_META_MAP[code];

  const legacyColor = normalizeLegacyStatusColor(status?.status_color);
  if (legacyColor) return STATUS_META_MAP[LEGACY_COLOR_TO_CODE[legacyColor]];

  return STATUS_META_MAP.SC;
}

export function getStatusCode(status: StatusLike): ClientStatusCode {
  return resolveClientStatus(status).code;
}

// Devuelve clases para el puntito/indicador visual
export function getStatusColor(status: StatusLike): string {
  return resolveClientStatus(status).indicatorClass;
}

// Devuelve el texto largo visible
export function getStatusText(status: StatusLike): string {
  return resolveClientStatus(status).label;
}

// Devuelve clases del dot usado en botones/modales
export function getStatusDotClass(status: StatusLike): string {
  return resolveClientStatus(status).dotClass;
}

// Función para formatear fechas
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

// Función para formatear duración de llamadas
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

// Función para obtener el texto del estado de llamada
export function getCallStatusText(status: string): string {
  const texts = {
    in_progress: "En progreso",
    completed: "Completada",
    failed: "Fallida",
    no_answer: "Sin respuesta",
  };
  return texts[status as keyof typeof texts] || "Desconocido";
}

// Función para validar email
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Función para validar número de teléfono
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/\s/g, ""));
}

// Función para formatear número de teléfono
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

// Función para formatear moneda
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

// Función para generar número de serie único
export function generateSerial(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `CLI${timestamp}${random}`.toUpperCase();
}

// Función para debounce
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}