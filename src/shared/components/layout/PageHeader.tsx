import type { ReactNode } from "react";
import { cn } from "../../../lib/utils";

export const pageHeaderActionClassName =
  "crm-shell-pill crm-page-header-action inline-flex min-h-[48px] items-center gap-2 rounded-full border border-white/65 bg-surface/86 px-4 py-2 text-sm font-semibold text-ink/82 whitespace-nowrap backdrop-blur-xl " +
  "shadow-[0_18px_42px_rgba(30,41,59,0.1),inset_0_1px_0_rgba(255,255,255,0.76)] hover:-translate-y-[1px] hover:border-brand/28 hover:bg-surface hover:text-ink transition " +
  "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/18 " +
  "disabled:opacity-50 disabled:cursor-not-allowed";

type PageHeaderProps = {
  icon: ReactNode;
  title: string;
  subtitle?: ReactNode;
  supportingContent?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
  containerClassName?: string;
  allowOverflow?: boolean;
};

export default function PageHeader({
  icon,
  title,
  subtitle,
  supportingContent,
  actions,
  meta,
  containerClassName,
  allowOverflow = false,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "crm-page-header relative border-b border-white/45 bg-surface/74 backdrop-blur-2xl supports-[backdrop-filter]:bg-surface/68",
        allowOverflow ? "overflow-visible z-40" : "overflow-hidden",
      )}
    >
      <div className="pointer-events-none absolute inset-x-[18%] top-[-4.5rem] h-36 rounded-full bg-brand/14 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-brand/28 to-transparent" />
      <div
        className={cn(
          "relative mx-auto max-w-[92rem] px-4 sm:px-6 lg:px-10",
          containerClassName,
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-4 py-4 sm:py-5">
          <div className="flex min-w-0 items-start gap-3">
            <div className="crm-page-header-icon mt-0.5 flex h-11 w-11 items-center justify-center rounded-[1.35rem] border border-white/70 bg-white/68 shadow-[0_16px_34px_rgba(30,41,59,0.1),inset_0_1px_0_rgba(255,255,255,0.85)]">
              {icon}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h1 className="text-[1.05rem] font-semibold tracking-tight text-ink sm:text-[1.15rem]">
                  {title}
                </h1>
                {subtitle}
              </div>

              {supportingContent ? (
                <div className="mt-2">{supportingContent}</div>
              ) : null}

              {actions ? <div className="mt-3 flex flex-wrap items-center gap-2">{actions}</div> : null}
            </div>
          </div>

          {meta ? (
            <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
              {meta}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
