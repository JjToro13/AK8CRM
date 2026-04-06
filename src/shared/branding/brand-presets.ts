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
  surfaceElevated: string;
  border: string;
  ink: string;
  muted: string;
  shellTop: string;
  shellBottom: string;
  shellGlow: string;
  shellAccent: string;
  brand: BrandScale;
};

export type BrandPreset = {
  id: string;
  displayName: string;
  productName: string;
  platformLabel: string;
  defaultFooterNote: string;
  theme: BrandTheme;
};

export const brandPresets: Record<string, BrandPreset> = {
  "call-master": {
    id: "call-master",
    displayName: "Default",
    productName: "AK8 CRM",
    platformLabel: "AK8 CRM",
    defaultFooterNote:
      "CRM modular listo para adaptarse por empresa y por paquete.",
    theme: {
      bg: "236 232 239",
      surface: "248 247 250",
      surface2: "239 236 244",
      surfaceElevated: "243 240 247",
      border: "210 202 223",
      ink: "18 21 39",
      muted: "99 101 123",
      shellTop: "246 242 250",
      shellBottom: "230 225 238",
      shellGlow: "162 150 243",
      shellAccent: "211 201 255",
      brand: {
        DEFAULT: "90 103 216",
        50: "240 241 255",
        100: "226 230 255",
        200: "202 210 255",
        300: "167 179 255",
        400: "126 141 248",
        500: "111 124 240",
        600: "90 103 216",
        700: "72 82 175",
        800: "56 64 138",
        900: "43 49 107",
      },
    },
  },
  "atlas-finance": {
    id: "atlas-finance",
    displayName: "Light",
    productName: "Light CRM",
    platformLabel: "AK8 CRM",
    defaultFooterNote:
      "Operacion comercial, seguimiento y reporting adaptados para fintech.",
    theme: {
      bg: "7 12 22",
      surface: "12 19 33",
      surface2: "16 26 42",
      surfaceElevated: "20 32 50",
      border: "58 82 118",
      ink: "233 240 252",
      muted: "146 164 194",
      shellTop: "14 23 37",
      shellBottom: "5 10 18",
      shellGlow: "103 153 232",
      shellAccent: "37 64 108",
      brand: {
        DEFAULT: "110 153 245",
        50: "229 239 255",
        100: "205 223 255",
        200: "166 195 255",
        300: "130 169 255",
        400: "110 153 245",
        500: "89 132 232",
        600: "70 114 210",
        700: "54 89 168",
        800: "41 69 132",
        900: "31 53 101",
      },
    },
  },
  "cobalt-ops": {
    id: "cobalt-ops",
    displayName: "Shade",
    productName: "Shade CRM",
    platformLabel: "AK8 CRM",
    defaultFooterNote:
      "Vista operacional preparada para soporte, llamadas y seguimiento intensivo.",
    theme: {
      bg: "232 237 245",
      surface: "248 251 255",
      surface2: "238 244 252",
      surfaceElevated: "241 246 253",
      border: "187 203 228",
      ink: "14 24 40",
      muted: "96 112 135",
      shellTop: "241 246 253",
      shellBottom: "224 233 246",
      shellGlow: "133 171 236",
      shellAccent: "194 214 247",
      brand: {
        DEFAULT: "61 110 217",
        50: "239 245 255",
        100: "221 234 255",
        200: "191 215 255",
        300: "152 188 255",
        400: "110 153 245",
        500: "80 125 230",
        600: "61 110 217",
        700: "47 87 176",
        800: "39 68 136",
        900: "32 56 107",
      },
    },
  },
};

export const defaultBrandPresetId = "call-master";

export function getBrandPreset(presetId?: string | null): BrandPreset {
  if (!presetId) return brandPresets[defaultBrandPresetId];
  return brandPresets[presetId] ?? brandPresets[defaultBrandPresetId];
}
