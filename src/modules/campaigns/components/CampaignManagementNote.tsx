import { Calendar } from "lucide-react";
import { cn } from "../../../lib/utils";

const cardClass =
  "rounded-[1.5rem] border border-border bg-surface shadow-soft p-6 sm:p-7";

export default function CampaignManagementNote() {
  return (
    <section className={cn(cardClass, "bg-brand/5 border-brand/15")}>
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-2xl bg-brand/10 flex items-center justify-center mt-0.5">
          <Calendar className="w-5 h-5 text-brand" />
        </div>

        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-ink">Nota</h4>
          <div className="mt-2 text-sm text-ink/70 space-y-1">
            <p>
              - Cada lista importada crea una nueva campaña con un prefijo único
              (A, B, C...).
            </p>
            <p>
              - Los clientes se numeran secuencialmente: A0001, A0002, A0003...
            </p>
            <p>- El rango de serial se calcula con min/max real.</p>
            <p>
              - "Bloqueada" impide usarla para nuevas asignaciones e
              importaciones.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
