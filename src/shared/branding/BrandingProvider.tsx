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
  defaultBrandPresetId,
  getBrandPreset,
  type BrandPreset,
} from "./brand-presets";

const BRAND_STORAGE_KEY = "crm.brand-preset";

type BrandingContextValue = {
  brandPresetId: string;
  branding: BrandPreset;
  availableBrandPresets: typeof brandPresets;
  clearBrandPresetOverride: () => void;
  setAutoBranding: (branding: BrandPreset | null) => void;
  setBrandPresetId: (presetId: string) => void;
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
  root.style.setProperty("--color-border", theme.border);
  root.style.setProperty("--color-ink", theme.ink);
  root.style.setProperty("--color-muted", theme.muted);
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
  if (typeof window === "undefined") return defaultBrandPresetId;
  const stored = window.localStorage.getItem(BRAND_STORAGE_KEY);
  return stored && brandPresets[stored] ? stored : defaultBrandPresetId;
}

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [overrideBrandPresetId, setOverrideBrandPresetId] = useState<string | null>(
    getInitialBrandPresetId,
  );
  const [autoBranding, setAutoBrandingState] = useState<BrandPreset | null>(
    null,
  );

  const branding = useMemo(() => {
    if (overrideBrandPresetId) return getBrandPreset(overrideBrandPresetId);
    return autoBranding ?? getBrandPreset(defaultBrandPresetId);
  }, [autoBranding, overrideBrandPresetId]);

  useEffect(() => {
    applyThemeVariables(branding);
    if (typeof window !== "undefined") {
      if (overrideBrandPresetId) {
        window.localStorage.setItem(BRAND_STORAGE_KEY, overrideBrandPresetId);
      } else {
        window.localStorage.removeItem(BRAND_STORAGE_KEY);
      }
    }
  }, [branding, overrideBrandPresetId]);

  const clearBrandPresetOverride = useCallback(() => {
    setOverrideBrandPresetId(null);
  }, []);

  const setAutoBranding = useCallback((nextBranding: BrandPreset | null) => {
    setAutoBrandingState(nextBranding);
  }, []);

  const setBrandPresetId = useCallback((presetId: string) => {
    if (!brandPresets[presetId]) return;
    setOverrideBrandPresetId(presetId);
  }, []);

  const value = useMemo<BrandingContextValue>(
    () => ({
      brandPresetId: branding.id,
      branding,
      availableBrandPresets: brandPresets,
      clearBrandPresetOverride,
      setAutoBranding,
      setBrandPresetId,
    }),
    [branding, clearBrandPresetOverride, setAutoBranding, setBrandPresetId],
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
