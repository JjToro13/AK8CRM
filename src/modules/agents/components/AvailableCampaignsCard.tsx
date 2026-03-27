import CampaignBadge from "./CampaignBadge";

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
  "rounded-[1.5rem] border border-border bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(248,250,252,0.98)_55%,rgba(37,99,235,0.04)_100%)] shadow-soft p-6 sm:p-7";

export default function AvailableCampaignsCard({
  availableCampaigns,
  totalAvailable,
}: AvailableCampaignsCardProps) {
  return (
    <section className={cardClass}>
      <div className="flex items-start justify-between gap-5 flex-wrap">
        <div className="space-y-3">
          <div className="inline-flex items-center rounded-full border border-brand/15 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-brand/80">
            Pulso de campañas
          </div>
          <div>
            <h3 className="text-lg font-semibold text-ink">
              Campañas disponibles para repartir
            </h3>
            <p className="text-sm text-muted mt-1">
              Clientes sin asignar:{" "}
              <span className="font-semibold text-ink">{totalAvailable}</span>
            </p>
          </div>
        </div>

        {availableCampaigns.length > 0 ? (
          <div className="flex flex-wrap gap-2 justify-end max-w-3xl">
            {availableCampaigns.map((campaign) => (
              <CampaignBadge
                key={campaign.id}
                prefix={campaign.prefix}
                available={campaign.available}
                title={
                  campaign.display_name
                    ? `${campaign.display_name} · Disponibles: ${campaign.available}`
                    : `Disponibles en ${campaign.prefix}: ${campaign.available}`
                }
              />
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted">No hay clientes sin asignar.</div>
        )}
      </div>
    </section>
  );
}
