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
    return <div className="text-center text-muted py-8">No hay llamadas recientes</div>;
  }

  return (
    <div className="space-y-3">
      {calls.map((call, idx) => (
        <motion.div
          key={call.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.min(idx * 0.03, 0.18), duration: 0.25 }}
          className="flex items-start justify-between gap-4 p-4 rounded-2xl border border-border bg-surface2 hover:bg-surface transition"
        >
          <div className="flex items-start gap-3 min-w-0">
            <div className="mt-0.5">{getStatusIcon(call.status)}</div>
            <div className="min-w-0">
              <div className="font-semibold text-ink truncate">
                {call.client?.first_name || "Cliente desconocido"}
              </div>

              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                <span>Serie: {call.client?.serial}</span>
                <span>Agente: {call.agent?.name || "Desconocido"}</span>
                <span>{formatDate(call.start_time)}</span>
                {call.duration ? <span>Duracion: {formatDuration(call.duration)}</span> : null}
              </div>
            </div>
          </div>

          <span className="shrink-0 text-xs font-semibold text-muted">
            {getCallStatusText(call.status)}
          </span>
        </motion.div>
      ))}
    </div>
  );
}
