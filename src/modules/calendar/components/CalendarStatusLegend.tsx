import { cn } from "../../../lib/utils";
import {
  CALENDAR_DISPLAY_STATUS_OPTIONS,
  type CalendarStatusCounts,
} from "../types/calendar.types";

type CalendarStatusLegendProps = {
  counts?: Partial<CalendarStatusCounts>;
  compact?: boolean;
};

export default function CalendarStatusLegend({
  counts,
  compact = false,
}: CalendarStatusLegendProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2",
        compact ? "text-[11px]" : "text-xs",
      )}
    >
      {CALENDAR_DISPLAY_STATUS_OPTIONS.map((option) => (
        <div
          key={option.value}
          className={cn(
            "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-medium",
            option.pillClass,
          )}
        >
          <span className={cn("h-2.5 w-2.5 rounded-full", option.dotClass)} />
          <span>{option.label}</span>
          {typeof counts?.[option.value] === "number" ? (
            <span className="font-semibold">{counts?.[option.value]}</span>
          ) : null}
        </div>
      ))}
    </div>
  );
}
