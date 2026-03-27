import type { ReactNode } from "react";
import { cn } from "../../../lib/utils";

type PageStageTone = "brand" | "emerald" | "violet" | "slate";

type PageStageProps = {
  children: ReactNode;
  contentClassName?: string;
  containerClassName?: string;
  tone?: PageStageTone;
};

const toneClassMap: Record<PageStageTone, string> = {
  brand:
    "bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.16),transparent_66%)]",
  emerald:
    "bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.14),transparent_66%)]",
  violet:
    "bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.14),transparent_66%)]",
  slate:
    "bg-[radial-gradient(circle_at_center,rgba(71,85,105,0.12),transparent_66%)]",
};

export default function PageStage({
  children,
  contentClassName,
  containerClassName,
  tone = "brand",
}: PageStageProps) {
  return (
    <div
      className={cn(
        "relative mx-auto w-full max-w-[92rem] px-4 py-8 sm:px-6 lg:px-10",
        containerClassName,
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-x-10 top-6 h-44 rounded-[2.5rem] blur-3xl",
          toneClassMap[tone],
        )}
      />

      <div
        className={cn(
          "relative",
          contentClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}
