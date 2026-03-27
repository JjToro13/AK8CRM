import { Users } from "lucide-react";
import ClientCommentsDropdown from "../../../shared/components/client/ClientCommentsDropdown";
import type { Call } from "../../../lib/supabase";
import { formatDate, formatDuration, getCallStatusText } from "../../../lib/utils";
import CallStatusIcon from "./CallStatusIcon";

type CallHistoryDetailPanelProps = {
  selectedCall: Call | null;
};

const cardClass =
  "rounded-[1.5rem] border border-border bg-surface shadow-soft p-6 sm:p-8";

export default function CallHistoryDetailPanel({
  selectedCall,
}: CallHistoryDetailPanelProps) {
  return (
    <aside className={cardClass}>
      {selectedCall ? (
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-ink/80">Detalles</div>
              <div className="text-xs text-muted mt-1">
                Informacion de la llamada seleccionada
              </div>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface2 px-3 py-1 text-xs text-muted">
              <CallStatusIcon status={selectedCall.status} />
              {getCallStatusText(selectedCall.status)}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface2 p-4 space-y-3 text-sm">
            <div>
              <div className="text-xs text-muted">Cliente</div>
              <div className="font-semibold text-ink">
                {selectedCall.client?.first_name ||
                  selectedCall.client?.name ||
                  "No disponible"}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-muted">Serie</div>
                <div className="font-mono text-ink">
                  {selectedCall.client?.serial ?? "--"}
                </div>
              </div>

              <div>
                <div className="text-xs text-muted">Agente</div>
                <div className="text-ink">{selectedCall.agent?.name ?? "--"}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-muted">Inicio</div>
                <div className="text-ink">{formatDate(selectedCall.start_time)}</div>
              </div>

              <div>
                <div className="text-xs text-muted">Duracion</div>
                <div className="text-ink">
                  {selectedCall.duration
                    ? formatDuration(selectedCall.duration)
                    : "--"}
                </div>
              </div>
            </div>

            {selectedCall.end_time ? (
              <div>
                <div className="text-xs text-muted">Fin</div>
                <div className="text-ink">{formatDate(selectedCall.end_time)}</div>
              </div>
            ) : null}
          </div>

          {selectedCall.client?.id ? (
            <div>
              <div className="text-sm font-semibold text-ink/80 mb-2">
                Comentarios del cliente
              </div>
              <ClientCommentsDropdown clientId={selectedCall.client.id} />
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-surface2 p-4 text-sm text-muted">
              No hay cliente asociado a esta llamada.
            </div>
          )}
        </div>
      ) : (
        <div className="min-h-[360px] flex flex-col items-center justify-center text-center">
          <div className="h-14 w-14 rounded-2xl bg-surface2 border border-border flex items-center justify-center">
            <Users className="h-7 w-7 text-muted" />
          </div>
          <div className="mt-4 text-sm font-semibold text-ink">
            Selecciona una llamada
          </div>
          <div className="mt-2 text-sm text-muted max-w-xs">
            Haz clic en una llamada de la lista para ver los detalles.
          </div>
        </div>
      )}
    </aside>
  );
}
