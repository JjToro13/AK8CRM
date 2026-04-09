import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export const Select = SelectPrimitive.Root;
export const SelectValue = SelectPrimitive.Value;

export const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> & {
    leftIcon?: React.ReactNode;
  }
>(({ className, children, leftIcon, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "crm-select-trigger w-full rounded-[1.25rem] border border-white/70 bg-surface/86 px-4 py-3 text-sm text-ink",
      "outline-none transition backdrop-blur-xl shadow-[0_18px_40px_rgba(30,41,59,0.08),inset_0_1px_0_rgba(255,255,255,0.18)]",
      "hover:-translate-y-[1px] hover:border-brand/24 hover:bg-surface focus-visible:ring-4 focus-visible:ring-brand/15 focus-visible:border-brand/40",
      "inline-flex items-center justify-between gap-3",
      "disabled:opacity-50 disabled:cursor-not-allowed",
      className,
    )}
    {...props}
  >
    <div className="min-w-0 flex items-center gap-3">
      {leftIcon ? <span className="shrink-0 text-muted">{leftIcon}</span> : null}
      <span className="min-w-0 truncate">{children}</span>
    </div>

    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 text-muted shrink-0" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = "SelectTrigger";

export const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", style, ...props }, ref) => {
  const viewportRef = React.useRef<React.ElementRef<
    typeof SelectPrimitive.Viewport
  > | null>(null);
  const [scrollState, setScrollState] = React.useState({
    canScroll: false,
    thumbHeight: 0,
    thumbTop: 0,
  });

  const updateScrollIndicator = React.useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const { clientHeight, scrollHeight, scrollTop } = viewport;
    const canScroll = scrollHeight > clientHeight + 1;

    if (!canScroll) {
      setScrollState({ canScroll: false, thumbHeight: 0, thumbTop: 0 });
      return;
    }

    const thumbHeight = Math.max(28, (clientHeight / scrollHeight) * clientHeight);
    const maxThumbTop = clientHeight - thumbHeight;
    const maxScrollTop = scrollHeight - clientHeight;
    const thumbTop = maxScrollTop > 0 ? (scrollTop / maxScrollTop) * maxThumbTop : 0;

    setScrollState({
      canScroll: true,
      thumbHeight,
      thumbTop,
    });
  }, []);

  React.useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    updateScrollIndicator();
    const rafId = window.requestAnimationFrame(() => {
      updateScrollIndicator();

      window.requestAnimationFrame(updateScrollIndicator);
    });
    const timeoutId = window.setTimeout(updateScrollIndicator, 180);

    const resizeObserver = new ResizeObserver(updateScrollIndicator);
    resizeObserver.observe(viewport);

    if (viewport.firstElementChild) {
      resizeObserver.observe(viewport.firstElementChild);
    }

    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(timeoutId);
      resizeObserver.disconnect();
    };
  }, [children, updateScrollIndicator]);

  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        ref={ref}
        position={position}
        sideOffset={8}
        collisionPadding={16}
        className={cn(
          "crm-select-content relative z-[9999] flex flex-col overflow-hidden",
          "rounded-[1.25rem] border border-white/72 bg-surface/96 backdrop-blur-2xl shadow-[0_26px_70px_rgba(30,41,59,0.18),inset_0_1px_0_rgba(255,255,255,0.16)]",
          "w-auto min-w-[max(var(--radix-select-trigger-width),280px)]",
          "origin-[var(--radix-select-content-transform-origin)] will-change-[opacity,transform]",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2",
          className,
        )}
        style={{
          ...style,
          maxHeight:
            "min(calc(100dvh - 2rem), var(--radix-select-content-available-height, calc(100dvh - 2rem)))",
        }}
        {...props}
      >
        <SelectPrimitive.Viewport
          ref={viewportRef}
          className="crm-select-viewport min-h-0 overflow-y-auto overscroll-contain p-2 pr-4 touch-pan-y"
          style={{
            maxHeight:
              "min(clamp(8rem, 24dvh, 12rem), calc(var(--radix-select-content-available-height, 12rem) - 2.5rem))",
          }}
          onScroll={updateScrollIndicator}
        >
          {children}
        </SelectPrimitive.Viewport>

        {scrollState.canScroll ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-3 right-2 top-3 z-20 w-1.5 rounded-full bg-ink/[0.06]"
          >
            <div
              className="absolute left-0 w-full rounded-full bg-brand/55 shadow-[0_0_0_1px_rgba(255,255,255,0.34),0_6px_14px_rgba(75,123,236,0.18)] transition-[top,height] duration-150 ease-out"
              style={{
                height: `${scrollState.thumbHeight}px`,
                top: `${scrollState.thumbTop}px`,
              }}
            />
          </div>
        ) : null}
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
});
SelectContent.displayName = "SelectContent";

export const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center",
      "rounded-xl px-3 py-2 text-sm outline-none",
      "text-ink/90",
      "data-[highlighted]:bg-brand/[0.08] data-[highlighted]:text-ink",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className,
    )}
    {...props}
  >
    <span className="absolute right-3 inline-flex items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4 text-brand" />
      </SelectPrimitive.ItemIndicator>
    </span>

    <SelectPrimitive.ItemText className="pr-8">{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = "SelectItem";

export const SelectSeparator = SelectPrimitive.Separator;
