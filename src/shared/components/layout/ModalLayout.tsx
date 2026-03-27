import type { ReactNode } from "react";
import { X } from "lucide-react";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type ModalPanelProps = {
  children: ReactNode;
  className?: string;
};

type ModalHeaderProps = {
  icon: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  onClose: () => void;
  closeDisabled?: boolean;
  className?: string;
};

type ModalBodyProps = {
  children: ReactNode;
  className?: string;
};

type ModalFooterProps = {
  children: ReactNode;
  className?: string;
};

export const modalSecondaryActionClassName =
  "inline-flex items-center rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-ink/80 hover:bg-surface2 transition disabled:opacity-50 disabled:cursor-not-allowed";

export const modalPrimaryActionClassName =
  "inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold text-white shadow-soft bg-gradient-to-r from-brand via-brand-600 to-brand-700 hover:brightness-105 active:brightness-95 transition disabled:opacity-50 disabled:cursor-not-allowed";

export function ModalPanel({ children, className }: ModalPanelProps) {
  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-3xl border border-border bg-surface shadow-soft2",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ModalHeader({
  icon,
  title,
  description,
  onClose,
  closeDisabled = false,
  className,
}: ModalHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 border-b border-border bg-surface2 px-6 py-5",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand/10">
          {icon}
        </div>

        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-ink sm:text-lg">
            {title}
          </h2>
          {description ? (
            <p className="truncate text-xs text-muted">{description}</p>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-surface text-muted transition hover:bg-surface2 hover:text-ink disabled:opacity-50"
        aria-label="Cerrar"
        title="Cerrar"
        disabled={closeDisabled}
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}

export function ModalBody({ children, className }: ModalBodyProps) {
  return (
    <div className={cn("space-y-6 p-6", className)}>
      {children}
    </div>
  );
}

export function ModalFooter({ children, className }: ModalFooterProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-end gap-3 border-t border-border bg-surface2 px-6 py-5",
        className,
      )}
    >
      {children}
    </div>
  );
}
