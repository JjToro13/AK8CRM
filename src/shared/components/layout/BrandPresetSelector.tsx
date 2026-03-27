import { Palette } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/Select";
import { useBranding } from "../../branding/BrandingProvider";
import { pageHeaderActionClassName } from "./PageHeader";

type BrandPresetSelectorProps = {
  enabled: boolean;
};

const BRAND_PRESET_PLACEHOLDER_VALUE = "__brand_preset_placeholder__";

export default function BrandPresetSelector({
  enabled,
}: BrandPresetSelectorProps) {
  const { availableBrandPresets, brandPresetId, setBrandPresetId } = useBranding();

  if (!enabled || !import.meta.env.DEV) return null;

  const safeValue = availableBrandPresets[brandPresetId]
    ? brandPresetId
    : BRAND_PRESET_PLACEHOLDER_VALUE;

  const handleValueChange = (value: string) => {
    if (value === BRAND_PRESET_PLACEHOLDER_VALUE) return;
    setBrandPresetId(value);
  };

  return (
    <Select value={safeValue} onValueChange={handleValueChange}>
      <SelectTrigger
        leftIcon={<Palette className="h-4 w-4" />}
        className={`${pageHeaderActionClassName} min-w-[196px] py-2`}
      >
        <div className="flex min-w-0 flex-col items-start leading-tight">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
            Branding
          </span>
          <SelectValue placeholder="Selecciona un preset" />
        </div>
      </SelectTrigger>

      <SelectContent>
        <SelectItem value={BRAND_PRESET_PLACEHOLDER_VALUE} disabled>
          Selecciona un preset
        </SelectItem>
        {Object.values(availableBrandPresets).map((preset) => (
          <SelectItem key={preset.id} value={preset.id}>
            {preset.productName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
