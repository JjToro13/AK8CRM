import CampaignBadge from "./CampaignBadge";
import { cn } from "../../../lib/utils";
import {
  agentCardClass,
  agentEyebrowClass,
  agentMetricCardClass,
  agentSubTextClass,
  agentTitleClass,
} from "./agentUi";

type AvailableCampaignsCardProps = {
  availableCampaigns: Array<{
    id: string;
    prefix: string;
    display_name: string | null;
    available: number;
  }>;
  totalAvailable: number;
};

const cardClass =
  "relative overflow-hidden border-brand/12 bg-[linear-gradient(135deg,rgb(var(--color-surface)/0.96),rgb(var(--color-surface2)/0.86)_58%,rgb(var(--color-brand-100)/0.18)_100%)]";

export default function AvailableCampaignsCard({
  availableCampaigns,
  totalAvailable,
}: AvailableCampaignsCardProps) {
  return (
    <section
      className={cn(
        agentCardClass,
        cardClass,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgb(var(--color-brand-300)/0.16),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.18),transparent_28%)]" />

      <div className="relative flex flex-wrap items-start justify-between gap-5">
        <div className="space-y-4">
          <div className={agentEyebrowClass}>
            Pulso de campanas
          </div>

          <div className="space-y-2">
            <h3 className={cn(agentTitleClass, "text-xl")}>
              Campanas disponibles para repartir
            </h3>
            <p className={cn(agentSubTextClass, "max-w-xl")}>
              Mantiene la lectura limpia del login, pero enfocada en la carga
              lista para distribuir.
            </p>
          </div>

          <div className={cn(agentMetricCardClass("brand"), "inline-flex min-w-[11rem] flex-col")}>
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              Clientes sin asignar
            </span>
            <span className="mt-2 text-3xl font-semibold tracking-tight text-ink">
              {totalAvailable.toLocaleString()}
            </span>
          </div>
        </div>

        {availableCampaigns.length > 0 ? (
          <div className="flex max-w-3xl flex-wrap justify-end gap-2">
            {availableCampaigns.map((campaign) => (
              <CampaignBadge
                key={campaign.id}
                prefix={campaign.prefix}
                available={campaign.available}
                title={
                  campaign.display_name
                    ? `${campaign.display_name} - Disponibles: ${campaign.available}`
                    : `Disponibles en ${campaign.prefix}: ${campaign.available}`
                }
              />
            ))}
          </div>
        ) : (
          <div className="rounded-full border border-white/76 bg-white/72 px-4 py-2 text-sm text-muted shadow-[0_12px_28px_rgba(30,41,59,0.06)]">
            No hay clientes sin asignar.
          </div>
        )}
      </div>
    </section>
  );
}
