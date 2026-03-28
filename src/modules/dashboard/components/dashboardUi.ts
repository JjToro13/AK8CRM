export const dashboardCardClass =
  "crm-shell-card rounded-[1.75rem] border border-white/68 bg-surface/84 p-6 shadow-soft backdrop-blur-xl sm:p-7";

export const dashboardTitleClass =
  "text-base sm:text-lg font-semibold tracking-tight text-ink";

export const dashboardSubTextClass = "text-sm text-muted";

export const dashboardPrimaryActionClass =
  "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-[0_22px_44px_rgba(var(--color-brand-500),0.26)] " +
  "bg-gradient-to-r from-brand via-brand-600 to-brand-700 hover:translate-y-[-1px] hover:brightness-105 active:brightness-95 transition " +
  "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20";

export const dashboardFadeUp = {
  initial: { opacity: 0, y: 10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 240, damping: 22 },
  },
  exit: {
    opacity: 0,
    y: 8,
    transition: { duration: 0.18 },
  },
} as const;
