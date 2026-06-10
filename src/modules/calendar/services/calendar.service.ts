import { supabase } from "../../../integrations/supabase/client";
import {
  addDays,
  addWeeks,
} from "../domain/calendar-date";
import { type ScheduledCall } from "../types/calendar.types";

const SCHEDULED_CALL_SELECT = `
  id,
  tenant_id,
  operation_id,
  campaign_id,
  client_id,
  agent_id,
  title,
  notes,
  outcome_notes,
  status,
  scheduled_for,
  scheduled_timezone,
  attended_at,
  created_by,
  created_at,
  updated_at,
  client:clients!scheduled_calls_client_id_fkey(
    id,
    serial,
    first_name,
    last_name,
    email,
    phone_number,
    campaign_id,
    status_code
  ),
  agent:agents!scheduled_calls_agent_id_fkey(
    id,
    name,
    email
  ),
  campaign:campaigns!scheduled_calls_campaign_id_fkey(
    id,
    prefix,
    display_name
  )
`;

const SCHEDULED_CALL_ALERTS_SELECT = `
  id,
  scheduled_for,
  scheduled_timezone,
  client:clients!scheduled_calls_client_id_fkey(
    id,
    serial,
    first_name,
    last_name
  )
`;

type WeekQuery = {
  weekStart: Date;
  operationId?: string | null;
  agentId?: string | null;
};

type ClientEventQuery = {
  clientId: string;
  operationId?: string | null;
};

type AlertQuery = {
  operationId?: string | null;
  agentId?: string | null;
  lookAheadMinutes?: number;
};

export type CalendarGlobalAlertsSummary = {
  total: number;
  overdueCount: number;
  upcomingCount: number;
  nextEvent: ScheduledCall | null;
};

export const calendar = {
  listWeek: async ({ weekStart, operationId, agentId }: WeekQuery) => {
    const from = addDays(weekStart, -1).toISOString();
    const to = addDays(addWeeks(weekStart, 1), 1).toISOString();

    let request = supabase
      .from("scheduled_calls")
      .select(SCHEDULED_CALL_SELECT)
      .gte("scheduled_for", from)
      .lt("scheduled_for", to)
      .order("scheduled_for", { ascending: true });

    if (operationId) {
      request = request.eq("operation_id", operationId);
    }

    if (agentId) {
      request = request.eq("agent_id", agentId);
    }

    const { data, error } = await request;

    return {
      data: normalizeScheduledCalls(data),
      error,
    };
  },

  findOpenByClient: async ({ clientId, operationId }: ClientEventQuery) => {
    let scheduledRequest = supabase
      .from("scheduled_calls")
      .select(SCHEDULED_CALL_SELECT)
      .eq("client_id", clientId)
      .eq("status", "scheduled")
      .order("scheduled_for", { ascending: true })
      .limit(1);

    if (operationId) {
      scheduledRequest = scheduledRequest.eq("operation_id", operationId);
    }

    const { data: scheduledData, error: scheduledError } = await scheduledRequest;
    const normalizedScheduled = normalizeScheduledCalls(scheduledData);

    if (scheduledError || normalizedScheduled[0]) {
      return {
        data: normalizedScheduled[0] ?? null,
        error: scheduledError,
      };
    }

    let postponedRequest = supabase
      .from("scheduled_calls")
      .select(SCHEDULED_CALL_SELECT)
      .eq("client_id", clientId)
      .eq("status", "postponed")
      .order("updated_at", { ascending: false })
      .order("scheduled_for", { ascending: false })
      .limit(1);

    if (operationId) {
      postponedRequest = postponedRequest.eq("operation_id", operationId);
    }

    const { data: postponedData, error: postponedError } = await postponedRequest;
    const normalizedPostponed = normalizeScheduledCalls(postponedData);

    return {
      data: normalizedPostponed[0] ?? null,
      error: postponedError,
    };
  },

  listGlobalAlerts: async ({
    operationId,
    agentId,
    lookAheadMinutes = 120,
  }: AlertQuery) => {
    const now = new Date();
    const from = addDays(now, -7).toISOString();
    const to = new Date(
      now.getTime() + Math.max(15, lookAheadMinutes) * 60 * 1000,
    ).toISOString();

    let request = supabase
      .from("scheduled_calls")
      .select(SCHEDULED_CALL_ALERTS_SELECT)
      .eq("status", "scheduled")
      .gte("scheduled_for", from)
      .lt("scheduled_for", to)
      .order("scheduled_for", { ascending: true });

    if (operationId) {
      request = request.eq("operation_id", operationId);
    }

    if (agentId) {
      request = request.eq("agent_id", agentId);
    }

    const { data, error } = await request;
    const normalized = normalizeScheduledCalls(data);

    if (error) {
      return {
        data: {
          total: 0,
          overdueCount: 0,
          upcomingCount: 0,
          nextEvent: null,
        } satisfies CalendarGlobalAlertsSummary,
        error,
      };
    }

    const overdue = normalized.filter(
      (event) => new Date(event.scheduled_for).getTime() < now.getTime(),
    );
    const upcoming = normalized.filter((event) => {
      const scheduledAt = new Date(event.scheduled_for).getTime();
      return scheduledAt >= now.getTime();
    });

    return {
      data: {
        total: overdue.length + upcoming.length,
        overdueCount: overdue.length,
        upcomingCount: upcoming.length,
        nextEvent: overdue[0] ?? upcoming[0] ?? null,
      } satisfies CalendarGlobalAlertsSummary,
      error: null,
    };
  },

  create: async (payload: {
    tenant_id?: string | null;
    operation_id?: string | null;
    campaign_id?: string | null;
    client_id: string;
    agent_id: string;
    title?: string | null;
    notes?: string | null;
    outcome_notes?: string | null;
    status?: ScheduledCall["status"];
    scheduled_for: string;
    scheduled_timezone: string;
  }) => {
    const { data, error } = await supabase
      .from("scheduled_calls")
      .insert(payload)
      .select(SCHEDULED_CALL_SELECT)
      .single();

    return {
      data: normalizeScheduledCall(data),
      error,
    };
  },

  update: async (
    id: string,
    payload: Partial<
      Pick<
        ScheduledCall,
        | "agent_id"
        | "campaign_id"
        | "title"
        | "notes"
        | "outcome_notes"
        | "status"
        | "attended_at"
        | "scheduled_for"
        | "scheduled_timezone"
      >
    >,
  ) => {
    const { data, error } = await supabase
      .from("scheduled_calls")
      .update(payload)
      .eq("id", id)
      .select(SCHEDULED_CALL_SELECT)
      .single();

    return {
      data: normalizeScheduledCall(data),
      error,
    };
  },

  remove: async (id: string) => {
    const { error } = await supabase.from("scheduled_calls").delete().eq("id", id);
    return { error };
  },
};

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return (value[0] ?? null) as T | null;
  }

  return (value ?? null) as T | null;
}

function normalizeScheduledCall(value: any): ScheduledCall | null {
  if (!value) return null;

  return {
    ...value,
    client: firstRelation(value.client),
    agent: firstRelation(value.agent),
    campaign: firstRelation(value.campaign),
  } as ScheduledCall;
}

function normalizeScheduledCalls(values: any): ScheduledCall[] {
  if (!Array.isArray(values)) return [];
  return values.map(normalizeScheduledCall).filter(Boolean) as ScheduledCall[];
}
