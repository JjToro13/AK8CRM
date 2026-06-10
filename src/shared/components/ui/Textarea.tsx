import * as React from "react";
import { cn } from "../../../lib/utils";
import { inputBaseClassName } from "./Input";

type TextareaProps = React.ComponentPropsWithoutRef<"textarea">;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(inputBaseClassName, "min-h-[120px] resize-y", className)}
      {...props}
    />
  ),
);

Textarea.displayName = "Textarea";

export default Textarea;
