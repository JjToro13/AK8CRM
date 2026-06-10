import { Calendar } from "lucide-react";
import { cn } from "../../../lib/utils";
import {
  campaignCardClass,
  campaignEyebrowClass,
  campaignSubTextClass,
} from "./campaignUi";

export default function CampaignManagementNote() {
  return (
    <section
      className={cn(
        campaignCardClass,
        "border-brand/12 bg-[linear-gradient(135deg,rgba(255,255,255,0.9),rgba(255,255,255,0.72)_55%,rgb(var(--color-brand-100)/0.16)_100%)]",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-[1.35rem] border border-white/72 bg-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
          <Calendar className="w-5 h-5 text-brand" />
        </div>

        <div className="min-w-0">
          <div className={campaignEyebrowClass}>Nota operativa</div>
          <div className={cn(campaignSubTextClass, "mt-4 space-y-1 text-ink/74")}>
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
