import { cn } from "../../../lib/utils";

export const clientCardClass =
  "crm-shell-card rounded-[1.75rem] border border-white/68 bg-surface/84 p-6 shadow-soft backdrop-blur-xl sm:p-7";

export const clientInsetClass =
  "rounded-[1.4rem] border border-white/72 bg-[linear-gradient(180deg,rgba(255,255,255,0.8),rgba(255,255,255,0.58))] shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] backdrop-blur-xl";

export const clientEyebrowClass =
  "inline-flex items-center rounded-full border border-brand/14 bg-white/74 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-brand/78 shadow-[0_10px_24px_rgba(30,41,59,0.05)]";

export const clientTitleClass =
  "text-base sm:text-lg font-semibold tracking-tight text-ink";

export const clientSubTextClass = "text-sm leading-7 text-muted";

export const clientGhostButtonClass =
  "inline-flex items-center gap-2 rounded-full border border-white/78 bg-white/72 px-4 py-2 text-sm font-semibold text-ink/82 shadow-[0_16px_34px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.84)] backdrop-blur-xl transition hover:-translate-y-[1px] hover:border-brand/22 hover:bg-white/88 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/15 disabled:cursor-not-allowed disabled:opacity-50";

export const clientPrimaryButtonClass =
  "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-[0_22px_44px_rgba(var(--color-brand-500),0.24)] bg-gradient-to-r from-brand via-brand-600 to-brand-700 transition hover:-translate-y-[1px] hover:brightness-105 active:brightness-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20 disabled:cursor-not-allowed disabled:opacity-50";

export const clientMutedPillClass =
  "inline-flex items-center gap-2 rounded-full border border-white/76 bg-white/68 px-3 py-2 text-sm text-muted shadow-[0_14px_28px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.82)] backdrop-blur-xl";

export const clientTableShellClass =
  "overflow-hidden rounded-[1.45rem] border border-white/72 bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(255,255,255,0.62))] shadow-[inset_0_1px_0_rgba(255,255,255,0.84)] backdrop-blur-xl";

export const clientModalPanelClass =
  "relative w-full overflow-hidden rounded-[1.65rem] border border-white/88 bg-[linear-gradient(180deg,rgb(var(--color-surface)/0.98),rgb(var(--color-surface-elevated)/0.94))] shadow-[0_34px_90px_rgba(15,23,42,0.22),0_8px_22px_rgba(15,23,42,0.1),inset_0_1px_0_rgba(255,255,255,0.92)] backdrop-blur-2xl";

export const clientModalHeaderClass =
  "border-white/74 bg-[linear-gradient(180deg,rgba(255,255,255,0.7),rgba(255,255,255,0.4))]";

export const clientModalFooterClass =
  "border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.36),rgba(255,255,255,0.58))]";

export function clientMetricCardClass(
  tone: "neutral" | "brand" | "success" | "warning",
) {
  return cn(
    clientInsetClass,
    "min-w-[8rem] px-4 py-3",
    tone === "neutral" &&
      "border-brand/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(255,255,255,0.64))]",
    tone === "brand" &&
      "border-brand/20 bg-[linear-gradient(180deg,rgb(var(--color-brand-50)/0.8),rgba(255,255,255,0.62))]",
    tone === "success" &&
      "border-emerald-200/90 bg-[linear-gradient(180deg,rgba(209,250,229,0.72),rgba(255,255,255,0.62))]",
    tone === "warning" &&
      "border-amber-200/90 bg-[linear-gradient(180deg,rgba(254,243,199,0.76),rgba(255,255,255,0.62))]",
  );
}

export function clientStatusBadgeClass(code?: string | null) {
  switch (code) {
    case "NC":
      return "border-slate-300/90 bg-slate-100/80 text-slate-700";
    case "LD":
      return "border-sky-200/90 bg-sky-50/88 text-sky-700";
    case "SG":
      return "border-blue-200/90 bg-blue-50/88 text-blue-700";
    case "DP":
      return "border-emerald-200/90 bg-emerald-50/88 text-emerald-700";
    case "NI":
      return "border-rose-200/90 bg-rose-50/88 text-rose-700";
    case "NX":
      return "border-amber-200/90 bg-amber-50/88 text-amber-800";
    case "NE":
      return "border-yellow-200/90 bg-yellow-50/88 text-yellow-800";
    case "RA":
      return "border-violet-200/90 bg-violet-50/88 text-violet-700";
    case "FS":
      return "border-zinc-300/90 bg-zinc-100/88 text-zinc-700";
    case "NU":
    default:
      return "border-gray-200/90 bg-gray-50/88 text-gray-700";
  }
}
