import { cn } from "../../../lib/utils";

export const calendarCardClass =
  "crm-shell-card rounded-[1.75rem] border border-white/68 bg-surface/84 p-6 shadow-soft backdrop-blur-xl sm:p-7";

export const calendarInsetClass =
  "crm-shell-soft-row rounded-[1.4rem] border border-white/72 bg-[linear-gradient(180deg,rgba(255,255,255,0.8),rgba(255,255,255,0.58))] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-xl";

export const calendarEyebrowClass =
  "crm-shell-pill inline-flex items-center gap-2 rounded-full border border-brand/14 bg-white/74 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-brand/78 shadow-[0_10px_24px_rgba(30,41,59,0.05)]";

export const calendarTitleClass =
  "text-base sm:text-lg font-semibold tracking-tight text-ink";

export const calendarSubTextClass = "text-sm leading-7 text-muted";

export const calendarGhostButtonClass =
  "crm-shell-pill inline-flex items-center gap-2 rounded-full border border-white/78 bg-white/72 px-4 py-2 text-sm font-semibold text-ink/82 shadow-[0_16px_34px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-xl transition hover:-translate-y-[1px] hover:border-brand/22 hover:bg-white/88 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/15 disabled:cursor-not-allowed disabled:opacity-50";

export const calendarPrimaryButtonClass =
  "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-[0_22px_44px_rgba(var(--color-brand-500),0.24)] bg-gradient-to-r from-brand via-brand-600 to-brand-700 transition hover:-translate-y-[1px] hover:brightness-105 active:brightness-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20 disabled:cursor-not-allowed disabled:opacity-50";

export const calendarModalPanelClass =
  "crm-modal-panel relative w-full overflow-hidden rounded-[1.65rem] border border-white/88 bg-[linear-gradient(180deg,rgb(var(--color-surface)/0.98),rgb(var(--color-surface-elevated)/0.94))] shadow-[0_34px_90px_rgba(15,23,42,0.22),0_8px_22px_rgba(15,23,42,0.1),inset_0_1px_0_rgba(255,255,255,0.2)] backdrop-blur-2xl";

export const calendarModalHeaderClass =
  "crm-modal-header border-white/74 bg-[linear-gradient(180deg,rgba(255,255,255,0.7),rgba(255,255,255,0.4))]";

export const calendarModalFooterClass =
  "crm-modal-footer border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.36),rgba(255,255,255,0.58))]";

export function calendarMetricPillClass(active = false) {
  return cn(
    "rounded-full border px-4 py-2 text-sm",
    active
      ? "border-brand/18 bg-brand/[0.08] font-semibold text-ink"
      : "border-white/76 bg-white/72 text-muted",
  );
}
