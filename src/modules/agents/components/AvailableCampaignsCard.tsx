import CampaignBadge from "./CampaignBadge";
import { cn } from "../../../lib/utils";
import {
  dashboardCardClass,
  dashboardSubTextClass,
  dashboardTitleClass,
} from "../../dashboard/components/dashboardUi";

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
        dashboardCardClass,
        cardClass,
        "p-6 sm:p-7",
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgb(var(--color-brand-300)/0.16),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.18),transparent_28%)]" />

      <div className="relative flex flex-wrap items-start justify-between gap-5">
        <div className="space-y-4">
          <div className="inline-flex items-center rounded-full border border-brand/12 bg-white/55 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-brand/80">
            Pulso de campanas
          </div>

          <div className="space-y-2">
            <h3 className={cn(dashboardTitleClass, "text-xl")}>
              Campanas disponibles para repartir
            </h3>
            <p className={cn(dashboardSubTextClass, "max-w-xl leading-6")}>
              Mantiene la lectura limpia del login, pero enfocada en la carga
              lista para distribuir.
            </p>
          </div>

          <div className="crm-shell-soft-row inline-flex min-w-[11rem] flex-col rounded-[1.5rem] border border-border bg-surface2 px-4 py-3">
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
          <div className="rounded-full border border-border bg-surface px-4 py-2 text-sm text-muted shadow-[0_12px_28px_rgba(30,41,59,0.06)]">
            No hay clientes sin asignar.
          </div>
        )}
      </div>
    </section>
  );
}
