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
  const version = "2.5.9";

  return (
    <footer className="border-t border-border bg-surface2/92 backdrop-blur supports-[backdrop-filter]:bg-surface2/76">
      <div
        className={cn(
          "max-w-[92rem] mx-auto px-4 sm:px-6 lg:px-10 py-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between",
          containerClassName,
        )}
      >
        <div>
          <div className="text-sm font-semibold tracking-tight text-ink">
            {branding.productName}
          </div>
          <div className="text-xs text-muted">{footerNote}</div>
        </div>

        <div className="flex flex-col items-start gap-1 text-xs text-muted sm:items-end">
          <div>
            &copy; {year} {branding.platformLabel}. Todos los derechos reservados.
          </div>
          <div className="font-medium tracking-[0.08em] text-muted/85">
            Versión {version}
          </div>
        </div>
      </div>
    </footer>
  );
}
