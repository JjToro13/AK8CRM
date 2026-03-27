export const dashboardCardClass =
  "rounded-[1.5rem] border border-border bg-surface shadow-soft p-6 sm:p-7";

export const dashboardTitleClass =
  "text-base sm:text-lg font-semibold tracking-tight text-ink";

export const dashboardSubTextClass = "text-sm text-muted";

export const dashboardPrimaryActionClass =
  "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-soft " +
  "bg-gradient-to-r from-brand via-brand-600 to-brand-700 hover:brightness-105 active:brightness-95 transition " +
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
