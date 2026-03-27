import type { Call } from "../../../lib/supabase";
import {
  cn,
  formatDate,
  formatDuration,
  getCallStatusText,
} from "../../../lib/utils";
import CallStatusIcon from "./CallStatusIcon";

type CallHistoryListItemProps = {
  call: Call;
  active: boolean;
  onSelect: (call: Call) => void;
};

export default function CallHistoryListItem({
  call,
  active,
  onSelect,
}: CallHistoryListItemProps) {
  const clientName =
    call.client?.first_name || call.client?.name || "Cliente desconocido";

  return (
    <button
      type="button"
      onClick={() => onSelect(call)}
      className={cn(
        "w-full text-left rounded-2xl border px-4 py-3 transition",
        "bg-surface hover:bg-surface2",
        active ? "border-brand/30 ring-4 ring-brand/10" : "border-border",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="mt-0.5">
            <CallStatusIcon status={call.status} />
          </div>

          <div className="min-w-0">
            <div className="text-sm font-semibold text-ink truncate">
              {clientName}
            </div>

            <div className="mt-1 text-xs text-muted flex flex-wrap gap-x-3 gap-y-1">
              <span>
                <span className="text-ink/60">Serie:</span>{" "}
                <span className="font-mono">{call.client?.serial ?? "--"}</span>
              </span>

              <span className="hidden sm:inline">&middot;</span>

              <span>
                <span className="text-ink/60">Agente:</span>{" "}
                {call.agent?.name ?? "--"}
              </span>

              <span className="hidden sm:inline">&middot;</span>

              <span>{formatDate(call.start_time)}</span>

              {call.duration ? (
                <>
                  <span className="hidden sm:inline">&middot;</span>
                  <span>Duracion: {formatDuration(call.duration)}</span>
                </>
              ) : null}
            </div>
          </div>
        </div>

        <div className="text-xs text-muted whitespace-nowrap mt-0.5">
          {getCallStatusText(call.status)}
        </div>
      </div>
    </button>
  );
}
