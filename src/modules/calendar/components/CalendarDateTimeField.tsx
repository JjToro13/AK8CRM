import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Clock3,
} from "lucide-react";
import { cn } from "../../../lib/utils";

type CalendarDateTimeFieldProps = {
  dateValue: string;
  timeValue: string;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
  disabled?: boolean;
};

const WEEKDAY_LABELS = ["DO", "LU", "MA", "MI", "JU", "VI", "SA"];
const MERIDIEM_OPTIONS = ["a. m.", "p. m."] as const;
const MONTH_OPTIONS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;

export default function CalendarDateTimeField({
  dateValue,
  timeValue,
  onDateChange,
  onTimeChange,
  disabled = false,
}: CalendarDateTimeFieldProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => getBaseDate(dateValue));

  useEffect(() => {
    if (!isOpen) {
      setViewMonth(getBaseDate(dateValue));
    }
  }, [dateValue, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const displayLabel = useMemo(
    () => buildDisplayLabel(dateValue, timeValue),
    [dateValue, timeValue],
  );
  const hours12 = useMemo(() => buildHourOptions(timeValue), [timeValue]);
  const minuteOptions = useMemo(() => buildMinuteOptions(timeValue), [timeValue]);
  const currentTimeParts = useMemo(() => parseTimeParts(timeValue), [timeValue]);
  const calendarDays = useMemo(
    () => buildMonthGrid(viewMonth, dateValue),
    [dateValue, viewMonth],
  );
  const yearOptions = useMemo(() => buildYearOptions(viewMonth, dateValue), [dateValue, viewMonth]);

  const handleDateSelect = (date: Date) => {
    setViewMonth(getBaseDate(toDateInputValue(date)));
    onDateChange(toDateInputValue(date));
  };

  const handleHourSelect = (hour12: string) => {
    onTimeChange(
      buildTimeValue(hour12, currentTimeParts.minute, currentTimeParts.meridiem),
    );
  };

  const handleMinuteSelect = (minute: string) => {
    onTimeChange(
      buildTimeValue(currentTimeParts.hour12, minute, currentTimeParts.meridiem),
    );
  };

  const handleMeridiemSelect = (meridiem: (typeof MERIDIEM_OPTIONS)[number]) => {
    onTimeChange(buildTimeValue(currentTimeParts.hour12, currentTimeParts.minute, meridiem));
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen((current) => !current)}
        disabled={disabled}
        className={cn(
          "flex min-h-[52px] w-full items-center gap-3 rounded-[1.4rem] border border-border bg-surface px-4 py-3 text-left shadow-[0_1px_0_rgba(255,255,255,0.7)] transition",
          "hover:border-brand/20 focus:outline-none focus:ring-4 focus:ring-brand/15",
          isOpen && "border-brand/35 ring-4 ring-brand/10",
          disabled && "opacity-60",
        )}
      >
        <CalendarDays className="h-4 w-4 shrink-0 text-muted" />
        <span className="truncate text-sm font-medium text-ink">{displayLabel}</span>
        <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-muted" />
      </button>

      {isOpen ? (
        <div className="absolute left-0 top-[calc(100%+12px)] z-40 w-[min(100vw-3rem,35rem)] rounded-[1.8rem] border border-border bg-surface p-4 shadow-[0_28px_90px_rgba(15,23,42,0.16)] backdrop-blur-xl">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                Fecha y hora
              </p>
              <p className="mt-1 text-sm font-semibold text-ink">{displayLabel}</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setViewMonth(addMonths(viewMonth, -1))}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface2 text-muted transition hover:border-brand/20 hover:text-brand"
                aria-label="Mes anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMonth(addMonths(viewMonth, 1))}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface2 text-muted transition hover:border-brand/20 hover:text-brand"
                aria-label="Mes siguiente"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
            <div className="rounded-[1.5rem] border border-border bg-surface2/55 p-3">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <select
                    value={viewMonth.getMonth()}
                    onChange={(event) =>
                      setViewMonth(
                        new Date(
                          viewMonth.getFullYear(),
                          Number(event.target.value),
                          1,
                        ),
                      )
                    }
                    className="rounded-full border border-border bg-surface px-3 py-2 text-sm font-semibold text-ink outline-none transition hover:border-brand/20 focus:border-brand/35"
                  >
                    {MONTH_OPTIONS.map((label, index) => (
                      <option key={label} value={index}>
                        {label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={viewMonth.getFullYear()}
                    onChange={(event) =>
                      setViewMonth(
                        new Date(
                          Number(event.target.value),
                          viewMonth.getMonth(),
                          1,
                        ),
                      )
                    }
                    className="rounded-full border border-border bg-surface px-3 py-2 text-sm font-semibold text-ink outline-none transition hover:border-brand/20 focus:border-brand/35"
                  >
                    {yearOptions.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date();
                      setViewMonth(getBaseDate(toDateInputValue(today)));
                      handleDateSelect(today);
                    }}
                    className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold text-muted transition hover:border-brand/20 hover:text-brand"
                  >
                    Hoy
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1">
                {WEEKDAY_LABELS.map((label) => (
                  <div
                    key={label}
                    className="pb-2 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-muted"
                  >
                    {label}
                  </div>
                ))}

                {calendarDays.map((day) => (
                  <button
                    key={day.key}
                    type="button"
                    onClick={() => handleDateSelect(day.date)}
                    className={cn(
                      "flex aspect-square items-center justify-center rounded-2xl text-sm font-medium transition",
                      day.isCurrentMonth ? "text-ink" : "text-muted/45",
                      day.isSelected
                        ? "bg-brand text-white shadow-[0_12px_28px_rgba(59,130,246,0.24)]"
                        : day.isToday
                          ? "border border-brand/20 bg-brand/5 text-brand"
                          : "hover:bg-surface hover:text-ink",
                    )}
                  >
                    {day.dayNumber}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-border bg-surface2/55 p-3">
              <div className="mb-3 flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-muted" />
                <p className="text-sm font-semibold text-ink">Hora</p>
              </div>

              <div className="grid grid-cols-[0.95fr_0.95fr_1.15fr] gap-2">
                <ScrollableOptionList
                  values={hours12}
                  selectedValue={currentTimeParts.hour12}
                  onSelect={handleHourSelect}
                />
                <ScrollableOptionList
                  values={minuteOptions}
                  selectedValue={currentTimeParts.minute}
                  onSelect={handleMinuteSelect}
                />
                <ScrollableOptionList
                  values={[...MERIDIEM_OPTIONS]}
                  selectedValue={currentTimeParts.meridiem}
                  onSelect={handleMeridiemSelect}
                  compact={false}
                />
              </div>

              <div className="mt-3 rounded-2xl border border-border bg-surface px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                {displayLabel}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ScrollableOptionList<T extends string>({
  values,
  selectedValue,
  onSelect,
  compact = true,
}: {
  values: T[];
  selectedValue: T;
  onSelect: (value: T) => void;
  compact?: boolean;
}) {
  return (
    <div className="max-h-56 space-y-1 overflow-y-auto rounded-[1.2rem] border border-border bg-surface p-1">
      {values.map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => onSelect(value)}
          className={cn(
            "flex w-full items-center justify-center rounded-xl px-2 py-2 text-sm font-medium transition whitespace-nowrap",
            !compact && "min-h-[52px] text-base",
            value === selectedValue
              ? "bg-brand text-white shadow-[0_10px_22px_rgba(59,130,246,0.2)]"
              : "text-ink hover:bg-surface2",
          )}
        >
          {value}
        </button>
      ))}
    </div>
  );
}

function getBaseDate(value: string) {
  return value ? new Date(`${value}T12:00`) : new Date();
}

function buildDisplayLabel(dateValue: string, timeValue: string) {
  if (!dateValue && !timeValue) return "Selecciona fecha y hora";

  const dateLabel = dateValue
    ? new Date(`${dateValue}T12:00`).toLocaleDateString("es-CO")
    : "Sin fecha";
  const timeLabel = timeValue
    ? new Date(`2026-01-01T${timeValue}`).toLocaleTimeString("es-CO", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Sin hora";

  return `${dateLabel} ${timeLabel}`;
}

function toDateInputValue(date: Date) {
  return [
    date.getFullYear(),
    `${date.getMonth() + 1}`.padStart(2, "0"),
    `${date.getDate()}`.padStart(2, "0"),
  ].join("-");
}

function addMonths(date: Date, amount: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + amount);
  return next;
}

function buildYearOptions(viewMonth: Date, selectedDateValue: string) {
  const selectedYear = selectedDateValue
    ? getBaseDate(selectedDateValue).getFullYear()
    : viewMonth.getFullYear();
  const startYear = Math.min(viewMonth.getFullYear(), selectedYear) - 1;
  return Array.from({ length: 6 }, (_, index) => startYear + index);
}

function buildMonthGrid(viewMonth: Date, selectedDateValue: string) {
  const start = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const end = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0);
  const days: Array<{
    key: string;
    date: Date;
    dayNumber: number;
    isCurrentMonth: boolean;
    isSelected: boolean;
    isToday: boolean;
  }> = [];

  const firstWeekday = start.getDay();
  const gridStart = new Date(start);
  gridStart.setDate(start.getDate() - firstWeekday);

  for (let index = 0; index < 42; index += 1) {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const key = toDateInputValue(date);
    const todayKey = toDateInputValue(new Date());

    days.push({
      key,
      date,
      dayNumber: date.getDate(),
      isCurrentMonth: date >= start && date <= end,
      isSelected: key === selectedDateValue,
      isToday: key === todayKey,
    });
  }

  return days;
}

function parseTimeParts(timeValue: string) {
  const [rawHour = "09", rawMinute = "00"] = (timeValue || "09:00").split(":");
  const hour24 = Number(rawHour);
  const minute = rawMinute.padStart(2, "0");
  const meridiem = hour24 >= 12 ? "p. m." : "a. m.";
  const hour12 = `${((hour24 + 11) % 12) + 1}`.padStart(2, "0");

  return { hour12, minute, meridiem } as const;
}

function buildTimeValue(hour12: string, minute: string, meridiem: string) {
  const baseHour = Number(hour12) % 12;
  const hour24 = meridiem === "p. m." ? baseHour + 12 : baseHour;
  return `${`${hour24}`.padStart(2, "0")}:${minute.padStart(2, "0")}`;
}

function buildHourOptions(timeValue: string) {
  const current = parseTimeParts(timeValue).hour12;
  const values = Array.from({ length: 12 }, (_, index) =>
    `${index + 1}`.padStart(2, "0"),
  );
  return values.includes(current) ? values : [...values, current].sort();
}

function buildMinuteOptions(timeValue: string) {
  const current = parseTimeParts(timeValue).minute;
  const values = Array.from({ length: 60 }, (_, index) =>
    `${index}`.padStart(2, "0"),
  );
  return values.includes(current) ? values : [...values, current].sort();
}
