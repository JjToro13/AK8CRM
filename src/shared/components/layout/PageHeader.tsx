import type { ReactNode } from "react";
import { cn } from "../../../lib/utils";

export const pageHeaderActionClassName =
  "inline-flex min-h-[46px] items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-ink/80 whitespace-nowrap " +
  "shadow-[0_8px_20px_rgba(17,24,39,0.06)] hover:shadow-[0_12px_26px_rgba(17,24,39,0.09)] " +
  "hover:bg-surface2 transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/15 " +
  "disabled:opacity-50 disabled:cursor-not-allowed";

type PageHeaderProps = {
  icon: ReactNode;
  title: string;
  subtitle?: ReactNode;
  supportingContent?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
  containerClassName?: string;
};

export default function PageHeader({
  icon,
  title,
  subtitle,
  supportingContent,
  actions,
  meta,
  containerClassName,
}: PageHeaderProps) {
  return (
    <header className="border-b border-border bg-surface2/92 backdrop-blur supports-[backdrop-filter]:bg-surface2/76">
      <div
        className={cn(
          "max-w-[92rem] mx-auto px-4 sm:px-6 lg:px-10",
          containerClassName,
        )}
      >
        <div className="py-4 flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3 min-w-0">
            <div className="h-11 w-11 rounded-2xl bg-brand/10 flex items-center justify-center mt-0.5">
              {icon}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h1 className="text-base sm:text-lg font-semibold tracking-tight text-ink">
                  {title}
                </h1>
                {subtitle}
              </div>

              {supportingContent ? (
                <div className="mt-2">{supportingContent}</div>
              ) : null}

              {actions ? <div className="mt-2 flex items-center gap-2">{actions}</div> : null}
            </div>
          </div>

          {meta ? (
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
              {meta}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
