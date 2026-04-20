import { cn } from "../../../lib/utils";

export const campaignCardClass =
  "crm-shell-card rounded-[1.75rem] border border-brand/12 bg-[linear-gradient(180deg,rgb(var(--color-surface)/0.9),rgb(var(--color-surface-elevated)/0.82))] p-6 shadow-soft backdrop-blur-xl sm:p-7";

export const campaignInsetClass =
  "crm-shell-soft-row rounded-[1.4rem] border border-brand/12 bg-[linear-gradient(180deg,rgb(var(--color-surface-elevated)/0.84),rgb(var(--color-surface)/0.76))] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl";

export const campaignTitleClass =
  "text-base sm:text-lg font-semibold tracking-tight text-ink";

export const campaignSubTextClass = "text-sm leading-7 text-muted";

export const campaignEyebrowClass =
  "crm-shell-pill inline-flex items-center rounded-full border border-brand/18 bg-[rgb(var(--color-surface-elevated)/0.74)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-brand/88 shadow-[0_10px_24px_rgba(15,23,42,0.12)]";

export const campaignGhostButtonClass =
  "crm-shell-pill inline-flex items-center gap-2 rounded-full border border-brand/16 bg-[rgb(var(--color-surface-elevated)/0.82)] px-4 py-2 text-sm font-semibold text-ink/86 shadow-[0_16px_34px_rgba(15,23,42,0.12),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl transition hover:-translate-y-[1px] hover:border-brand/28 hover:bg-[rgb(var(--color-surface-elevated)/0.96)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/15 disabled:cursor-not-allowed disabled:opacity-50";

export const campaignPrimaryButtonClass =
  "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-[0_22px_44px_rgba(var(--color-brand-500),0.24)] bg-gradient-to-r from-brand via-brand-600 to-brand-700 transition hover:-translate-y-[1px] hover:brightness-105 active:brightness-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20 disabled:cursor-not-allowed disabled:opacity-50";

export function campaignMetricCardClass(
  tone: "neutral" | "brand" | "success",
) {
  return cn(
    campaignInsetClass,
    "min-w-[6.5rem] px-4 py-3",
    tone === "neutral" && "border-brand/12 bg-[linear-gradient(180deg,rgb(var(--color-surface-elevated)/0.88),rgb(var(--color-surface)/0.76))]",
    tone === "brand" && "border-brand/20 bg-[linear-gradient(180deg,rgb(var(--color-brand-100)/0.2),rgb(var(--color-surface-elevated)/0.84))]",
    tone === "success" && "border-emerald-500/20 bg-[linear-gradient(180deg,rgba(16,185,129,0.14),rgb(var(--color-surface-elevated)/0.84))]",
  );
}

export const campaignModalPanelClass =
  "crm-modal-panel relative w-full overflow-hidden rounded-[1.65rem] border border-brand/14 bg-[linear-gradient(180deg,rgb(var(--color-surface)/0.98),rgb(var(--color-surface-elevated)/0.96))] shadow-[0_34px_90px_rgba(15,23,42,0.3),0_8px_22px_rgba(15,23,42,0.14),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl";

export const campaignModalHeaderClass =
  "crm-modal-header border-brand/12 bg-[linear-gradient(180deg,rgb(var(--color-surface-elevated)/0.94),rgb(var(--color-surface)/0.74))]";

export const campaignModalFooterClass =
  "crm-modal-footer border-brand/12 bg-[linear-gradient(180deg,rgb(var(--color-surface)/0.74),rgb(var(--color-surface-elevated)/0.9))]";
