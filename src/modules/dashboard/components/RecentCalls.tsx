import { Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Call } from "../../../lib/supabase";
import { formatDate, formatDuration, getCallStatusText } from "../../../lib/utils";

interface RecentCallsProps {
  calls: Call[];
}

export default function RecentCalls({ calls }: RecentCallsProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "no_answer":
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case "in_progress":
        return <Clock className="h-4 w-4 text-brand animate-pulse" />;
      default:
        return <Clock className="h-4 w-4 text-muted" />;
    }
  };

  if (calls.length === 0) {
    return (
      <div className="rounded-[1.35rem] border border-dashed border-border bg-surface2/35 px-4 py-8 text-center text-sm text-muted">
        No hay llamadas recientes
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {calls.map((call, idx) => (
        <motion.div
          key={call.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.min(idx * 0.03, 0.18), duration: 0.25 }}
          className="rounded-[1.35rem] border border-border bg-surface2/55 p-4 transition hover:-translate-y-[2px] hover:bg-surface hover:shadow-[0_16px_28px_rgba(30,41,59,0.06)]"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="mt-0.5">{getStatusIcon(call.status)}</div>
              <div className="min-w-0">
                <div className="truncate font-semibold text-ink">
                  {call.client?.first_name || "Cliente desconocido"}
                </div>
                <div className="mt-1 text-xs text-muted">
                  {call.agent?.name || "Desconocido"}
                </div>
              </div>
            </div>
            <span className="shrink-0 rounded-full border border-white/72 bg-white/60 px-2.5 py-1 text-[11px] font-semibold text-muted">
              {getCallStatusText(call.status)}
            </span>
          </div>

          <div className="mt-4 space-y-2 text-xs text-muted">
            <div>Serie: {call.client?.serial}</div>
            <div>{formatDate(call.start_time)}</div>
            {call.duration ? <div>Duracion: {formatDuration(call.duration)}</div> : null}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
