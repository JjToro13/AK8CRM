import type { CalendarWeekDay, ScheduledCall } from "../types/calendar.types";

function withZeroedTime(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function startOfWeekMonday(date: Date) {
  const next = withZeroedTime(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  return next;
}

export function getBrowserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Bogota";
}

export function getValidTimeZone(
  value: string | null | undefined,
  fallback = "America/Bogota",
) {
  const zone = value?.trim();
  if (!zone) return fallback;

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone }).format(new Date());
    return zone;
  } catch {
    return fallback;
  }
}

export function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

export function addWeeks(date: Date, amount: number) {
  return addDays(date, amount * 7);
}

export function formatWeekRange(weekStart: Date, timeZone?: string | null) {
  const zone = getValidTimeZone(timeZone, getBrowserTimeZone());
  const weekEnd = addDays(weekStart, 6);
  const startMonth = weekStart.toLocaleDateString("es-CO", {
    month: "short",
    timeZone: zone,
  });
  const endMonth = weekEnd.toLocaleDateString("es-CO", {
    month: "short",
    timeZone: zone,
  });
  const startDay = weekStart.toLocaleDateString("es-CO", {
    day: "numeric",
    timeZone: zone,
  });
  const endDay = weekEnd.toLocaleDateString("es-CO", {
    day: "numeric",
    timeZone: zone,
  });
  const year = weekEnd.toLocaleDateString("es-CO", {
    year: "numeric",
    timeZone: zone,
  });

  if (startMonth === endMonth) {
    return `${startDay} - ${endDay} ${capitalize(endMonth)} ${year}`;
  }

  return `${startDay} ${capitalize(startMonth)} - ${endDay} ${capitalize(endMonth)} ${year}`;
}

export function formatTime(value: string | Date, timeZone?: string | null) {
  return new Date(value).toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: getValidTimeZone(timeZone, getBrowserTimeZone()),
  });
}

export function formatDateTimeLabel(
  value: string | Date,
  timeZone?: string | null,
) {
  const zone = getValidTimeZone(timeZone, getBrowserTimeZone());
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: zone,
  }).format(new Date(value));
}

export function toLocalDateTimeInputValue(
  value: string | Date,
  timeZone?: string | null,
) {
  const parts = getDateTimePartsInTimeZone(value, timeZone);
  const year = `${parts.year}`;
  const month = `${parts.month}`.padStart(2, "0");
  const day = `${parts.day}`.padStart(2, "0");
  const hours = `${parts.hour}`.padStart(2, "0");
  const minutes = `${parts.minute}`.padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function toLocalDateInputValue(
  value: string | Date,
  timeZone?: string | null,
) {
  return toLocalDateTimeInputValue(value, timeZone).slice(0, 10);
}

export function toLocalTimeInputValue(
  value: string | Date,
  timeZone?: string | null,
) {
  return toLocalDateTimeInputValue(value, timeZone).slice(11, 16);
}

export function fromLocalDateTimeInputValue(value: string) {
  return new Date(value).toISOString();
}

export function fromLocalDateTimeParts(
  dateValue: string,
  timeValue: string,
  timeZone?: string | null,
) {
  return fromZonedDateTimeParts(
    dateValue,
    timeValue,
    getValidTimeZone(timeZone, getBrowserTimeZone()),
  ).toISOString();
}

export function toIsoDateKey(date: Date, timeZone?: string | null) {
  const parts = getDateTimePartsInTimeZone(
    date,
    getValidTimeZone(timeZone, getBrowserTimeZone()),
  );
  return [parts.year, `${parts.month}`.padStart(2, "0"), `${parts.day}`.padStart(2, "0")].join("-");
}

export function createDefaultScheduleForDay(date: Date) {
  const next = new Date(date);
  next.setHours(9, 0, 0, 0);
  return next;
}

export function buildCalendarWeekDays(
  weekStart: Date,
  events: ScheduledCall[],
  timeZone?: string | null,
): CalendarWeekDay[] {
  const zone = getValidTimeZone(timeZone, getBrowserTimeZone());
  const todayKey = toIsoDateKey(new Date(), zone);
  const grouped = new Map<string, ScheduledCall[]>();

  for (const event of events) {
    const eventZone = getValidTimeZone(event.scheduled_timezone, zone);
    const key = toIsoDateKey(new Date(event.scheduled_for), eventZone);
    const list = grouped.get(key);
    if (list) {
      list.push(event);
    } else {
      grouped.set(key, [event]);
    }
  }

  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index);
    const key = toIsoDateKey(date, zone);
    const dayEvents = grouped.get(key) ?? [];

    dayEvents.sort(
      (a, b) =>
        new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime(),
    );

    return {
      key,
      isoDate: key,
      label: capitalize(
        date.toLocaleDateString("es-CO", { weekday: "long", timeZone: zone }),
      ),
      shortLabel: capitalize(
        date.toLocaleDateString("es-CO", { weekday: "short", timeZone: zone }),
      ),
      dayNumber: date.toLocaleDateString("es-CO", { day: "2-digit", timeZone: zone }),
      date,
      isToday: key === todayKey,
      events: dayEvents,
    };
  });
}

function capitalize(value: string) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getDateTimePartsInTimeZone(
  value: string | Date,
  timeZone?: string | null,
) {
  const zone = getValidTimeZone(timeZone, getBrowserTimeZone());
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(new Date(value));
  const map = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return {
    year: Number(map.year ?? "0"),
    month: Number(map.month ?? "1"),
    day: Number(map.day ?? "1"),
    hour: Number(map.hour ?? "0"),
    minute: Number(map.minute ?? "0"),
  };
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const map = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  const asUtc = Date.UTC(
    Number(map.year ?? "0"),
    Number(map.month ?? "1") - 1,
    Number(map.day ?? "1"),
    Number(map.hour ?? "0"),
    Number(map.minute ?? "0"),
    Number(map.second ?? "0"),
  );

  return asUtc - date.getTime();
}

function fromZonedDateTimeParts(
  dateValue: string,
  timeValue: string,
  timeZone: string,
) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const [hour, minute] = timeValue.split(":").map(Number);
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const firstOffset = getTimeZoneOffsetMs(utcGuess, timeZone);
  let result = new Date(utcGuess.getTime() - firstOffset);
  const secondOffset = getTimeZoneOffsetMs(result, timeZone);

  if (secondOffset !== firstOffset) {
    result = new Date(utcGuess.getTime() - secondOffset);
  }

  return result;
}
