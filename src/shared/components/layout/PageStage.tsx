import type { ReactNode } from "react";
import { cn } from "../../../lib/utils";

type PageStageTone = "brand" | "emerald" | "violet" | "slate";

type PageStageProps = {
  children: ReactNode;
  contentClassName?: string;
  containerClassName?: string;
  tone?: PageStageTone;
};

const toneStyleMap: Record<PageStageTone, { glow: string; accent: string }> = {
  brand: {
    glow: "radial-gradient(circle at center, rgb(var(--color-brand-400) / 0.24) 0%, rgb(var(--color-brand-400) / 0) 70%)",
    accent: "rgb(var(--color-brand-300) / 0.18)",
  },
  emerald: {
    glow: "radial-gradient(circle at center, rgba(98, 188, 138, 0.24) 0%, rgba(98, 188, 138, 0) 70%)",
    accent: "rgba(127, 214, 165, 0.18)",
  },
  violet: {
    glow: "radial-gradient(circle at center, rgba(125, 122, 241, 0.22) 0%, rgba(125, 122, 241, 0) 70%)",
    accent: "rgba(162, 156, 255, 0.18)",
  },
  slate: {
    glow: "radial-gradient(circle at center, rgba(104, 129, 164, 0.2) 0%, rgba(104, 129, 164, 0) 70%)",
    accent: "rgba(132, 157, 190, 0.18)",
  },
};

export default function PageStage({
  children,
  contentClassName,
  containerClassName,
  tone = "brand",
}: PageStageProps) {
  const toneStyle = toneStyleMap[tone];

  return (
    <div
      className={cn(
        "relative mx-auto w-full max-w-[92rem] px-4 py-8 sm:px-6 lg:px-10",
        containerClassName,
      )}
    >
      <div
        className="pointer-events-none absolute inset-x-8 top-8 h-48 rounded-[3rem] blur-3xl"
        style={{ background: toneStyle.glow }}
      />
      <div className="crm-page-stage-frame pointer-events-none absolute bottom-3 top-3 inset-x-0 rounded-[2.75rem] border border-white/32 bg-white/[0.18] shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]" />
      <div className="crm-page-stage-grid pointer-events-none absolute inset-x-6 bottom-6 top-8 overflow-hidden rounded-[2.5rem] opacity-60">
        <div
          className="crm-page-stage-grid-pattern absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(18,27,43,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(18,27,43,0.05) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
            maskImage: "radial-gradient(circle at center, black 34%, transparent 100%)",
          }}
        />
        <div
          className="absolute left-8 top-6 h-28 w-28 rounded-full blur-3xl"
          style={{ background: toneStyle.accent }}
        />
      </div>

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
