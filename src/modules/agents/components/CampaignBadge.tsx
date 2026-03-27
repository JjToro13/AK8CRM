import { Tag } from "lucide-react";

type Props = {
  prefix: string;
  available: number;
  title?: string;
  name?: string | null;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function CampaignBadge({ prefix, available, title, name }: Props) {
  const n = Number(available || 0);
  const isEmpty = n <= 0;

  const label = (name ?? "").trim();
  const tooltipText =
    (title ?? "").trim() ||
    (label ? `${prefix} - ${label} · Disponibles: ${n}` : `Disponibles en ${prefix}: ${n}`);

  return (
    <div className="relative group">
      <span
        className={cn(
          "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold",
          "border shadow-[0_10px_28px_rgba(17,24,39,0.06)] select-none",
          "transition hover:shadow-[0_14px_34px_rgba(17,24,39,0.09)]",
          isEmpty
            ? "bg-surface2 text-muted border-border"
            : "bg-brand/10 text-ink/80 border-brand/20 hover:bg-brand/15",
        )}
      >
        <Tag
          className={cn(
            "h-4 w-4 shrink-0",
            "relative top-[0.5px]",
            isEmpty ? "opacity-60" : "text-ink/70",
          )}
        />
        <span className="font-mono tabular-nums">{prefix}</span>
        <span className={cn("opacity-50", isEmpty ? "text-muted" : "text-ink/60")}>·</span>
        <span className="tabular-nums">{n.toLocaleString()}</span>
      </span>

      {tooltipText && (
        <div
          className={cn(
            "pointer-events-none absolute right-0 top-full mt-2 z-[200]",
            "opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0",
            "transition-all duration-150",
          )}
        >
          <div className="rounded-2xl border border-border bg-surface2/95 backdrop-blur text-xs text-ink/80 px-4 py-2 shadow-soft2 whitespace-nowrap">
            {tooltipText}
          </div>
        </div>
      )}
    </div>
  );
}
