import { useBranding } from "../../branding/BrandingProvider";

type AppFooterProps = {
  note?: string;
  containerClassName?: string;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function AppFooter({
  note,
  containerClassName,
}: AppFooterProps) {
  const { branding } = useBranding();
  const year = new Date().getFullYear();
  const footerNote = note ?? branding.defaultFooterNote;
  const version = "2.0.22";

  return (
    <footer className="crm-app-footer relative overflow-hidden border-t border-white/45 bg-surface/74 backdrop-blur-2xl supports-[backdrop-filter]:bg-surface/68">
      <div className="pointer-events-none absolute inset-x-[24%] top-0 h-px bg-gradient-to-r from-transparent via-brand/28 to-transparent" />
      <div
        className={cn(
          "mx-auto flex max-w-[92rem] flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-10",
          containerClassName,
        )}
      >
        <div>
          <div className="text-sm font-semibold tracking-tight text-ink/90">
            {branding.productName}
          </div>
          <div className="text-xs text-muted/90">{footerNote}</div>
        </div>

        <div className="flex flex-col items-start gap-1 text-xs text-muted/90 sm:items-end">
          <div>
            &copy; {year} {branding.platformLabel}. Todos los derechos reservados.
          </div>
          <div className="font-medium tracking-[0.08em] text-muted/90">
            Version (<strong className="font-bold text-ink/80">LIVE-BETA</strong>) {version}
          </div>
        </div>
      </div>
    </footer>
  );
}
