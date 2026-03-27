export type BrandScale = {
  DEFAULT: string;
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
};

export type BrandTheme = {
  bg: string;
  surface: string;
  surface2: string;
  border: string;
  ink: string;
  muted: string;
  brand: BrandScale;
};

export type BrandPreset = {
  id: string;
  productName: string;
  platformLabel: string;
  defaultFooterNote: string;
  theme: BrandTheme;
};

export const brandPresets: Record<string, BrandPreset> = {
  "call-master": {
    id: "call-master",
    productName: "Call Master",
    platformLabel: "Call Master CRM",
    defaultFooterNote:
      "CRM modular listo para adaptarse por empresa y por paquete.",
    theme: {
      bg: "246 243 239",
      surface: "255 255 255",
      surface2: "251 250 248",
      border: "232 226 218",
      ink: "18 24 38",
      muted: "107 114 128",
      brand: {
        DEFAULT: "37 99 235",
        50: "239 246 255",
        100: "219 234 254",
        200: "191 219 254",
        300: "147 197 253",
        400: "96 165 250",
        500: "59 130 246",
        600: "37 99 235",
        700: "29 78 216",
        800: "30 64 175",
        900: "30 58 138",
      },
    },
  },
  "atlas-finance": {
    id: "atlas-finance",
    productName: "Atlas Finance CRM",
    platformLabel: "Call Master CRM",
    defaultFooterNote:
      "Operacion comercial, seguimiento y reporting adaptados para fintech.",
    theme: {
      bg: "244 247 242",
      surface: "255 255 255",
      surface2: "249 251 247",
      border: "220 229 216",
      ink: "21 31 28",
      muted: "90 106 98",
      brand: {
        DEFAULT: "20 104 74",
        50: "237 248 243",
        100: "209 237 226",
        200: "170 220 200",
        300: "122 198 169",
        400: "75 172 138",
        500: "37 144 108",
        600: "20 104 74",
        700: "17 85 61",
        800: "18 67 50",
        900: "18 54 42",
      },
    },
  },
  "cobalt-ops": {
    id: "cobalt-ops",
    productName: "Cobalt Ops",
    platformLabel: "Call Master CRM",
    defaultFooterNote:
      "Vista operacional preparada para soporte, llamadas y seguimiento intensivo.",
    theme: {
      bg: "242 244 248",
      surface: "255 255 255",
      surface2: "247 249 252",
      border: "219 225 235",
      ink: "17 24 39",
      muted: "99 115 129",
      brand: {
        DEFAULT: "31 87 169",
        50: "240 246 255",
        100: "222 235 255",
        200: "190 214 255",
        300: "149 187 255",
        400: "95 146 240",
        500: "58 114 217",
        600: "31 87 169",
        700: "28 70 135",
        800: "28 57 108",
        900: "28 50 90",
      },
    },
  },
};

export const defaultBrandPresetId = "call-master";

export function getBrandPreset(presetId?: string | null): BrandPreset {
  if (!presetId) return brandPresets[defaultBrandPresetId];
  return brandPresets[presetId] ?? brandPresets[defaultBrandPresetId];
}
