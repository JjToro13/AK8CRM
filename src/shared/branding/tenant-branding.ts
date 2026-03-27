import type { BrandPreset } from "./brand-presets";
import { defaultBrandPresetId, getBrandPreset } from "./brand-presets";

const legacyOperationSlugBrandMap: Record<string, string> = {
  esp: "atlas-finance",
  ext: "cobalt-ops",
  special: "atlas-finance",
  exterior: "cobalt-ops",
};

type TenantBrandingExtra = {
  defaultFooterNote?: string;
};

export type TenantBrandingSettings = {
  product_name?: string | null;
  platform_label?: string | null;
  brand_preset_id?: string | null;
  extra?: TenantBrandingExtra | null;
};

function normalizeLegacyBrandText(value?: string | null) {
  const text = value?.trim();
  if (!text) return null;

  const normalized = text.toLowerCase();
  if (normalized === "mascara crm") return "Call Master CRM";
  if (normalized === "mascara") return "Call Master";

  return text;
}

export function resolveBrandPresetIdForOperation(
  operationSlug?: string | null,
): string {
  if (!operationSlug) return defaultBrandPresetId;
  return legacyOperationSlugBrandMap[operationSlug] ?? defaultBrandPresetId;
}

export function resolveTenantBranding(params?: {
  operationSlug?: string | null;
  settings?: TenantBrandingSettings | null;
}): BrandPreset {
  const operationSlug = params?.operationSlug ?? null;
  const settings = params?.settings ?? null;

  const presetId =
    settings?.brand_preset_id ??
    resolveBrandPresetIdForOperation(operationSlug);

  const baseBranding = getBrandPreset(presetId);

  return {
    ...baseBranding,
    productName:
      normalizeLegacyBrandText(settings?.product_name) || baseBranding.productName,
    platformLabel:
      normalizeLegacyBrandText(settings?.platform_label) || baseBranding.platformLabel,
    defaultFooterNote:
      settings?.extra?.defaultFooterNote?.trim() ||
      baseBranding.defaultFooterNote,
  };
}
