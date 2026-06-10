import {
  useCallback,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  brandPresets,
  defaultBrandPresetIdByAppearance,
  defaultBrandPresetId,
  getBrandAppearance,
  getBrandPreset,
  type BrandAppearance,
  type BrandPreset,
} from "./brand-presets";

const BRAND_MODE_STORAGE_KEY = "crm.theme-mode";
const LEGACY_BRAND_STORAGE_KEY = "crm.brand-preset";

type BrandingContextValue = {
  brandPresetId: string;
  branding: BrandPreset;
  availableBrandPresets: typeof brandPresets;
  colorMode: BrandAppearance;
  clearColorModeOverride: () => void;
  setAutoBranding: (branding: BrandPreset | null) => void;
  setColorMode: (mode: BrandAppearance) => void;
};

const BrandingContext = createContext<BrandingContextValue | null>(null);

function applyThemeVariables(branding: BrandPreset) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const { theme } = branding;

  root.dataset.brandPreset = branding.id;
  root.style.setProperty("--color-bg", theme.bg);
  root.style.setProperty("--color-surface", theme.surface);
  root.style.setProperty("--color-surface2", theme.surface2);
  root.style.setProperty("--color-surface-elevated", theme.surfaceElevated);
  root.style.setProperty("--color-border", theme.border);
  root.style.setProperty("--color-ink", theme.ink);
  root.style.setProperty("--color-muted", theme.muted);
  root.style.setProperty("--color-shell-top", theme.shellTop);
  root.style.setProperty("--color-shell-bottom", theme.shellBottom);
  root.style.setProperty("--color-shell-glow", theme.shellGlow);
  root.style.setProperty("--color-shell-accent", theme.shellAccent);
  root.style.setProperty("--color-brand", theme.brand.DEFAULT);
  root.style.setProperty("--color-brand-50", theme.brand[50]);
  root.style.setProperty("--color-brand-100", theme.brand[100]);
  root.style.setProperty("--color-brand-200", theme.brand[200]);
  root.style.setProperty("--color-brand-300", theme.brand[300]);
  root.style.setProperty("--color-brand-400", theme.brand[400]);
  root.style.setProperty("--color-brand-500", theme.brand[500]);
  root.style.setProperty("--color-brand-600", theme.brand[600]);
  root.style.setProperty("--color-brand-700", theme.brand[700]);
  root.style.setProperty("--color-brand-800", theme.brand[800]);
  root.style.setProperty("--color-brand-900", theme.brand[900]);
}

function getInitialBrandPresetId() {
  if (typeof window === "undefined") return null;

  const storedMode = window.localStorage.getItem(BRAND_MODE_STORAGE_KEY);
  if (storedMode === "light" || storedMode === "dark") return storedMode;

  const legacyPresetId = window.localStorage.getItem(LEGACY_BRAND_STORAGE_KEY);
  if (legacyPresetId && brandPresets[legacyPresetId]) {
    return getBrandAppearance(legacyPresetId);
  }

  return null;
}

function resolveBrandingForMode(
  baseBranding: BrandPreset,
  mode: BrandAppearance,
): BrandPreset {
  if (baseBranding.appearance === mode) {
    return baseBranding;
  }

  const themePreset = getBrandPreset(defaultBrandPresetIdByAppearance[mode]);

  return {
    ...themePreset,
    productName: baseBranding.productName,
    platformLabel: baseBranding.platformLabel,
    defaultFooterNote: baseBranding.defaultFooterNote,
  };
}

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [overrideColorMode, setOverrideColorMode] = useState<BrandAppearance | null>(
    getInitialBrandPresetId,
  );
  const [autoBranding, setAutoBrandingState] = useState<BrandPreset | null>(
    null,
  );

  const baseBranding = useMemo(
    () => autoBranding ?? getBrandPreset(defaultBrandPresetId),
    [autoBranding],
  );

  const colorMode = overrideColorMode ?? baseBranding.appearance;

  const branding = useMemo(() => {
    return resolveBrandingForMode(baseBranding, colorMode);
  }, [baseBranding, colorMode]);

  useEffect(() => {
    applyThemeVariables(branding);
    if (typeof window !== "undefined") {
      if (overrideColorMode) {
        window.localStorage.setItem(BRAND_MODE_STORAGE_KEY, overrideColorMode);
      } else {
        window.localStorage.removeItem(BRAND_MODE_STORAGE_KEY);
      }

      window.localStorage.removeItem(LEGACY_BRAND_STORAGE_KEY);
    }
  }, [branding, overrideColorMode]);

  const clearColorModeOverride = useCallback(() => {
    setOverrideColorMode(null);
  }, []);

  const setAutoBranding = useCallback((nextBranding: BrandPreset | null) => {
    setAutoBrandingState(nextBranding);
  }, []);

  const setColorMode = useCallback((mode: BrandAppearance) => {
    setOverrideColorMode(mode);
  }, []);

  const value = useMemo<BrandingContextValue>(
    () => ({
      brandPresetId: branding.id,
      branding,
      availableBrandPresets: brandPresets,
      colorMode,
      clearColorModeOverride,
      setAutoBranding,
      setColorMode,
    }),
    [branding, colorMode, clearColorModeOverride, setAutoBranding, setColorMode],
  );

  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const context = useContext(BrandingContext);
  if (!context) {
    throw new Error("useBranding must be used inside BrandingProvider");
  }
  return context;
}
