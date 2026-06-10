import type { Call } from "../../../lib/supabase";

export type CallStatus = Call["status"];

export type StatusFilter = "all" | CallStatus;

export const CALL_STATUS_FILTER_OPTIONS: Array<{
  value: StatusFilter;
  label: string;
}> = [
  { value: "all", label: "Todos los estados" },
  { value: "in_progress", label: "En progreso" },
  { value: "completed", label: "Completadas" },
  { value: "failed", label: "Fallidas" },
  { value: "no_answer", label: "Sin respuesta" },
];
