import type { ReactNode } from "react";
import { cn } from "../../../lib/utils";

type FieldProps = {
  children: ReactNode;
  className?: string;
  error?: ReactNode;
  hint?: ReactNode;
  htmlFor?: string;
  label?: ReactNode;
  required?: boolean;
};

export default function Field({
  children,
  className,
  error,
  hint,
  htmlFor,
  label,
  required,
}: FieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {label ? (
        <label
          htmlFor={htmlFor}
          className="block text-xs font-semibold tracking-wide text-ink/70"
        >
          {label}
          {required ? <span className="text-red-500"> *</span> : null}
        </label>
      ) : null}

      {children}

      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      {!error && hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
