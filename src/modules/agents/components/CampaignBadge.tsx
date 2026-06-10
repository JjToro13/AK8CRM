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
    <div className="group relative">
      <span
        className={cn(
          "inline-flex select-none items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold backdrop-blur-xl",
          "border shadow-[0_14px_28px_rgba(30,41,59,0.08)] transition hover:-translate-y-[1px] hover:shadow-[0_18px_36px_rgba(30,41,59,0.12)]",
          isEmpty
            ? "border-white/76 bg-white/72 text-muted"
            : "border-brand/18 bg-[linear-gradient(180deg,rgb(var(--color-brand-100)/0.5),rgb(var(--color-surface)/0.72))] text-ink/86",
        )}
      >
        <Tag
          className={cn(
            "relative top-[0.5px] h-4 w-4 shrink-0",
            isEmpty ? "opacity-60" : "text-brand/80",
          )}
        />
        <span className="font-mono tabular-nums">{prefix}</span>
        <span className={cn("opacity-50", isEmpty ? "text-muted" : "text-ink/60")}>·</span>
        <span className="tabular-nums">{n.toLocaleString()}</span>
      </span>

      {tooltipText ? (
        <div
          className={cn(
            "pointer-events-none absolute right-0 top-full z-[200] mt-2",
            "translate-y-1 opacity-0 transition-all duration-150 group-hover:translate-y-0 group-hover:opacity-100",
          )}
        >
          <div className="whitespace-nowrap rounded-2xl border border-white/82 bg-white/88 px-4 py-2 text-xs text-ink/80 shadow-[0_18px_40px_rgba(30,41,59,0.12)] backdrop-blur-xl">
            {tooltipText}
          </div>
        </div>
      ) : null}
    </div>
  );
}
