import * as React from "react";
import { cn } from "../../../lib/utils";

export const inputBaseClassName =
  "crm-input w-full rounded-[1.25rem] border border-white/70 bg-surface/86 px-4 py-3 text-sm text-ink outline-none transition backdrop-blur-xl " +
  "shadow-[0_18px_40px_rgba(30,41,59,0.08),inset_0_1px_0_rgba(255,255,255,0.18)] hover:-translate-y-[1px] hover:border-brand/24 hover:bg-surface " +
  "focus-visible:ring-4 focus-visible:ring-brand/15 focus-visible:border-brand/40 placeholder:text-muted/72 " +
  "disabled:opacity-50 disabled:cursor-not-allowed";

type InputProps = React.ComponentPropsWithoutRef<"input"> & {
  leftIcon?: React.ReactNode;
  rightSlot?: React.ReactNode;
  containerClassName?: string;
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, containerClassName, leftIcon, rightSlot, ...props }, ref) => {
    const hasDecorators = Boolean(leftIcon || rightSlot);

    if (!hasDecorators) {
      return <input ref={ref} className={cn(inputBaseClassName, className)} {...props} />;
    }

    return (
      <div className={cn("relative", containerClassName)}>
        {leftIcon ? (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
            {leftIcon}
          </span>
        ) : null}

        <input
          ref={ref}
          className={cn(
            inputBaseClassName,
            leftIcon && "pl-12",
            rightSlot && "pr-12",
            className,
          )}
          {...props}
        />

        {rightSlot ? (
          <span className="absolute inset-y-0 right-0 flex items-center pr-3">
            {rightSlot}
          </span>
        ) : null}
      </div>
    );
  },
);

Input.displayName = "Input";

export default Input;
