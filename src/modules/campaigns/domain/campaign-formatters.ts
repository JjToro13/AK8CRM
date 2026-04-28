import type {
  CampaignMetadataRow,
  CampaignStatsRow,
  CampaignTotals,
  CampaignViewRow,
} from "../types/campaign.types";

export function formatCampaignDate(dateString: string | null) {
  if (!dateString) return "--";

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "--";

  const pad = (value: number) => String(value).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function renderCampaignSerialRange(
  minSerial: string | null,
  maxSerial: string | null,
) {
  if (!minSerial && !maxSerial) return "--";
  if (minSerial && !maxSerial) return minSerial;
  if (!minSerial && maxSerial) return maxSerial;
  return `${minSerial} - ${maxSerial}`;
}

export function resolveCampaignName(
  metadata: CampaignMetadataRow | undefined,
  prefix: string,
) {
  return metadata?.display_name?.trim() || `Campaña ${prefix}`;
}

export function buildCampaignViewRows(
  metadataRows: CampaignMetadataRow[],
  statsRows: CampaignStatsRow[],
) {
  const metadataById = new Map<string, CampaignMetadataRow>();
  const statsById = new Map<string, CampaignStatsRow>();

  metadataRows.forEach((row) => {
    metadataById.set(row.id, row);
  });

  statsRows.forEach((row) => {
    statsById.set(row.campaign_id, row);
  });

  return metadataRows
    .sort((left, right) => left.prefix.localeCompare(right.prefix))
    .map((metadata): CampaignViewRow => {
      const stats = statsById.get(metadata.id);
      const prefix = metadata.prefix;

      return {
        id: metadata.id,
        prefix,
        name: resolveCampaignName(metadata, prefix),
        total: Number(stats?.total_clients ?? 0),
        assigned: Number(stats?.assigned_clients ?? 0),
        available: Number(stats?.available_clients ?? 0),
        minSerial: stats?.min_serial ?? null,
        maxSerial: stats?.max_serial ?? null,
        importedAt:
          metadata?.imported_at ?? metadata?.updated_at ?? metadata?.created_at ?? null,
        isLocked: Boolean(metadata?.is_locked ?? false),
        lockedAt: metadata?.locked_at ?? null,
        lockedBy: metadata?.locked_by ?? null,
        deletionRequestedAt: metadata?.deletion_requested_at ?? null,
        deletionAvailableAt: metadata?.deletion_available_at ?? null,
        deletionRequestedBy: metadata?.deletion_requested_by ?? null,
        deletionReason: metadata?.deletion_reason ?? null,
      };
    });
}

export function buildCampaignTotals(campaigns: CampaignViewRow[]): CampaignTotals {
  return campaigns.reduce(
    (acc, campaign) => {
      acc.totalClients += campaign.total || 0;
      acc.totalAssigned += campaign.assigned || 0;
      acc.totalAvailable += campaign.available || 0;
      return acc;
    },
    {
      totalClients: 0,
      totalAssigned: 0,
      totalAvailable: 0,
    } satisfies CampaignTotals,
  );
}
