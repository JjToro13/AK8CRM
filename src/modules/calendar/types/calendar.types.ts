import type { Agent, Client } from "../../../shared/types/crm";

export type ScheduledCallStatus =
  | "scheduled"
  | "attended"
  | "postponed"
  | "missed";

export type CalendarDisplayStatus = ScheduledCallStatus | "overdue";

export type ScheduledCallCampaign = {
  id: string;
  prefix: string;
  display_name?: string | null;
} | null;

export interface ScheduledCallClient
  extends Pick<
    Client,
    | "id"
    | "serial"
    | "first_name"
    | "last_name"
    | "email"
    | "phone_number"
    | "campaign_id"
    | "status_code"
  > {}

export interface ScheduledCallAgent
  extends Pick<Agent, "id" | "name" | "email"> {}

export interface ScheduledCall {
  id: string;
  tenant_id: string;
  operation_id: string;
  campaign_id?: string | null;
  client_id: string;
  agent_id: string;
  title?: string | null;
  notes?: string | null;
  outcome_notes?: string | null;
  status: ScheduledCallStatus;
  scheduled_for: string;
  scheduled_timezone: string;
  attended_at?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  client?: ScheduledCallClient | null;
  agent?: ScheduledCallAgent | null;
  campaign?: ScheduledCallCampaign;
}

export type CalendarStatusMeta = {
  value: CalendarDisplayStatus;
  label: string;
  shortLabel: string;
  dotClass: string;
  pillClass: string;
  cardClass: string;
};

export const CALENDAR_STATUS_OPTIONS: CalendarStatusMeta[] = [
  {
    value: "scheduled",
    label: "Agendada",
    shortLabel: "Agendada",
    dotClass: "bg-sky-500 ring-1 ring-inset ring-sky-600/30",
    pillClass:
      "border border-sky-200 bg-sky-50 text-sky-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]",
    cardClass: "border-l-sky-500 bg-sky-50/55",
  },
  {
    value: "attended",
    label: "Atendida",
    shortLabel: "Atendida",
    dotClass: "bg-emerald-500 ring-1 ring-inset ring-emerald-600/30",
    pillClass:
      "border border-emerald-200 bg-emerald-50 text-emerald-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]",
    cardClass: "border-l-emerald-500 bg-emerald-50/55",
  },
  {
    value: "postponed",
    label: "Pospuesta",
    shortLabel: "Pospuesta",
    dotClass: "bg-violet-500 ring-1 ring-inset ring-violet-600/30",
    pillClass:
      "border border-violet-200 bg-violet-50 text-violet-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]",
    cardClass: "border-l-violet-500 bg-violet-50/55",
  },
  {
    value: "missed",
    label: "Pérdida",
    shortLabel: "Pérdida",
    dotClass: "bg-rose-500 ring-1 ring-inset ring-rose-600/30",
    pillClass:
      "border border-rose-200 bg-rose-50 text-rose-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]",
    cardClass: "border-l-rose-500 bg-rose-50/55",
  },
];

export const CALENDAR_DISPLAY_STATUS_OPTIONS: CalendarStatusMeta[] = [
  CALENDAR_STATUS_OPTIONS[0],
  {
    value: "overdue",
    label: "Vencida",
    shortLabel: "Vencida",
    dotClass: "bg-amber-500 ring-1 ring-inset ring-amber-600/30",
    pillClass:
      "border border-amber-200 bg-amber-50 text-amber-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]",
    cardClass: "border-l-amber-500 bg-amber-50/60",
  },
  ...CALENDAR_STATUS_OPTIONS.slice(1),
];

const CALENDAR_DISPLAY_STATUS_MAP = CALENDAR_DISPLAY_STATUS_OPTIONS.reduce(
  (acc, item) => {
    acc[item.value] = item;
    return acc;
  },
  {} as Record<CalendarDisplayStatus, CalendarStatusMeta>,
);

const CALENDAR_PERSISTED_STATUS_MAP = CALENDAR_STATUS_OPTIONS.reduce(
  (acc, item) => {
    acc[item.value as ScheduledCallStatus] = item;
    return acc;
  },
  {} as Record<ScheduledCallStatus, CalendarStatusMeta>,
);

export type CalendarStatusCounts = Record<CalendarDisplayStatus | "total", number>;

export function resolveScheduledCallStatus(
  status: ScheduledCallStatus | string | null | undefined,
) {
  switch (status) {
    case "scheduled":
    case "attended":
    case "postponed":
    case "missed":
      return CALENDAR_PERSISTED_STATUS_MAP[status];
    default:
      return CALENDAR_PERSISTED_STATUS_MAP.scheduled;
  }
}

export function isScheduledCallOverdue(
  event: Pick<ScheduledCall, "status" | "scheduled_for">,
  now: Date = new Date(),
) {
  if (event.status !== "scheduled") return false;

  const scheduledAt = new Date(event.scheduled_for).getTime();
  if (!Number.isFinite(scheduledAt)) return false;

  return scheduledAt < now.getTime();
}

export function shouldOpenScheduledCallFollowUp(
  event: Pick<ScheduledCall, "status" | "scheduled_for">,
  now: Date = new Date(),
) {
  if (event.status !== "scheduled") return true;
  return isScheduledCallOverdue(event, now);
}

export function resolveScheduledCallDisplayStatus(
  event: Pick<ScheduledCall, "status" | "scheduled_for">,
  now: Date = new Date(),
) {
  if (isScheduledCallOverdue(event, now)) {
    return CALENDAR_DISPLAY_STATUS_MAP.overdue;
  }

  return resolveScheduledCallStatus(event.status);
}

export function countScheduledCallsByDisplayStatus(
  events: ScheduledCall[],
  now: Date = new Date(),
): CalendarStatusCounts {
  const base: CalendarStatusCounts = {
    total: events.length,
    scheduled: 0,
    overdue: 0,
    attended: 0,
    postponed: 0,
    missed: 0,
  };

  for (const event of events) {
    base[resolveScheduledCallDisplayStatus(event, now).value] += 1;
  }

  return base;
}

export type CalendarAgentFilter = "all" | string;

export type CalendarWeekDay = {
  key: string;
  isoDate: string;
  label: string;
  shortLabel: string;
  dayNumber: string;
  date: Date;
  isToday: boolean;
  events: ScheduledCall[];
};
