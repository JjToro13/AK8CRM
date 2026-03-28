import type { BrandPreset } from "./brand-presets";
import { defaultBrandPresetId, getBrandPreset } from "./brand-presets";

const legacyOperationSlugBrandMap: Record<string, string> = {
  esp: "atlas-finance",
  ext: "cobalt-ops",
  light: "atlas-finance",
  "light-crm": "atlas-finance",
  special: "atlas-finance",
  exterior: "cobalt-ops",
  shade: "cobalt-ops",
  "shade-crm": "cobalt-ops",
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
  if (normalized === "mascara crm") return "AK8 CRM";
  if (normalized === "mascara") return "AK8 CRM";

  return text;
}

export function resolveBrandPresetIdForOperation(
  operationSlug?: string | null,
): string {
  if (!operationSlug) return defaultBrandPresetId;
  const normalizedSlug = operationSlug.trim().toLowerCase();
  return legacyOperationSlugBrandMap[normalizedSlug] ?? defaultBrandPresetId;
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
