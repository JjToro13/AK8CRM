import { Monitor } from "lucide-react";
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

const MODE_LABELS = {
  light: "Claro",
  dark: "Oscuro",
} as const;

export default function BrandPresetSelector({
  enabled,
}: BrandPresetSelectorProps) {
  const { colorMode, setColorMode } = useBranding();

  if (!enabled) return null;

  return (
    <Select value={colorMode} onValueChange={(value) => setColorMode(value as "light" | "dark")}>
      <SelectTrigger
        leftIcon={<Monitor className="h-4 w-4" />}
        className={`${pageHeaderActionClassName} min-w-[196px] border-white/85 bg-white/74 py-2 shadow-[0_18px_38px_rgba(15,23,42,0.1),inset_0_1px_0_rgba(255,255,255,0.88)] hover:bg-white/86`}
      >
        <div className="flex min-w-0 flex-col items-start leading-tight">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
            Tema
          </span>
          <SelectValue>{MODE_LABELS[colorMode]}</SelectValue>
        </div>
      </SelectTrigger>

      <SelectContent className="border-white/88 bg-[linear-gradient(180deg,rgb(var(--color-surface)/0.98),rgb(var(--color-surface-elevated)/0.95))] shadow-[0_28px_72px_rgba(15,23,42,0.2),inset_0_1px_0_rgba(255,255,255,0.9)]">
        <SelectItem value="light">{MODE_LABELS.light}</SelectItem>
        <SelectItem value="dark">{MODE_LABELS.dark}</SelectItem>
      </SelectContent>
    </Select>
  );
}
