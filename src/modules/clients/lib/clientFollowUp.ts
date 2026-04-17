export type ClientDailyManagementFilter =
  | "all"
  | "commented_today"
  | "pending_today";

export type ClientUpdatedOrder =
  | "created_desc"
  | "updated_desc"
  | "updated_asc";

export const CLIENT_DAILY_MANAGEMENT_OPTIONS: Array<{
  value: ClientDailyManagementFilter;
  label: string;
}> = [
  { value: "all", label: "Todos" },
  { value: "commented_today", label: "Gestionados hoy" },
  { value: "pending_today", label: "Pendientes de hoy" },
];

export const CLIENT_UPDATED_ORDER_OPTIONS: Array<{
  value: ClientUpdatedOrder;
  label: string;
}> = [
  { value: "created_desc", label: "Carga mas reciente" },
  { value: "updated_desc", label: "Edicion mas reciente" },
  { value: "updated_asc", label: "Edicion mas antigua" },
];

export function getTodayRangeForQueries(now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

export function hasCommentToday(
  lastCommentAt?: string | null,
  now = new Date(),
) {
  if (!lastCommentAt) return false;

  const commentDate = new Date(lastCommentAt);
  if (Number.isNaN(commentDate.getTime())) return false;

  const { startIso, endIso } = getTodayRangeForQueries(now);
  return commentDate >= new Date(startIso) && commentDate < new Date(endIso);
}
