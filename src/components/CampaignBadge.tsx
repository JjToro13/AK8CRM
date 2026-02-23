import { Tag } from "lucide-react";

type Props = {
  prefix: string; // "D"
  available: number; // 20
  title?: string; // tooltip opcional (si no lo pasas, se arma solo)
  name?: string | null; // display_name opcional ("Big Test")
};

export default function CampaignBadge({
  prefix,
  available,
  title,
  name,
}: Props) {
  const n = Number(available || 0);
  const isEmpty = n <= 0;

  const label = (name ?? "").trim();
  const tooltipText =
    (title ?? "").trim() ||
    (label
      ? `${prefix} — ${label} · Disponibles: ${n}`
      : `Disponibles en ${prefix}: ${n}`);

  return (
    <div className="relative group">
      <span
        className={[
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
          "leading-none border shadow-sm transition-all select-none",
          isEmpty
            ? "bg-gray-100 text-gray-500 border-gray-200"
            : "bg-blue-50 text-blue-700 border-blue-200",
          !isEmpty && "hover:bg-blue-100 hover:border-blue-300",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {/* Icono perfectamente centrado */}
        <Tag
          className={["h-3.5 w-3.5", isEmpty ? "opacity-50" : ""].join(" ")}
        />

        {/* prefijo */}
        <span className="font-mono leading-none translate-y-[0.5px]">
          {prefix}
        </span>

        {/* separador */}
        <span className="text-gray-400 leading-none translate-y-[0.5px]">
          •
        </span>

        {/* número (subir un poco más) */}
        <span className="tabular-nums leading-none translate-y-[0px]">
          {available}
        </span>
      </span>

      {/* Tooltip */}
      {tooltipText && (
        <div
          className={[
            "pointer-events-none absolute right-0 top-full mt-2 z-50",
            "opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0",
            "transition-all duration-150",
          ].join(" ")}
        >
          <div className="rounded-lg border border-gray-200 bg-gray-900 text-white text-xs px-3 py-2 shadow-lg whitespace-nowrap">
            {tooltipText}
          </div>
        </div>
      )}
    </div>
  );
}
