import type { ComponentProps } from "react";
import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";

import { cn } from "../lib/utils";

const TooltipProvider = BaseTooltip.Provider;
const Tooltip = BaseTooltip.Root;
const TooltipTrigger = BaseTooltip.Trigger;
const TooltipPortal = BaseTooltip.Portal;
function TooltipArrow({
  className,
  ...props
}: ComponentProps<typeof BaseTooltip.Arrow>) {
  return (
    <BaseTooltip.Arrow
      className={cn(
        "pointer-events-none z-10",
        "data-[side=top]:-translate-y-full",
        "data-[side=bottom]:translate-y-full",
        "data-[side=left]:translate-x-full",
        "data-[side=right]:-translate-x-full",
        className,
      )}
      {...props}
    />
  );
}

function TooltipPositioner({
  className,
  sideOffset = 6,
  ...props
}: ComponentProps<typeof BaseTooltip.Positioner>) {
  return (
    <BaseTooltip.Positioner
      className={cn("z-50", className)}
      sideOffset={sideOffset}
      {...props}
    />
  );
}

function TooltipPopup({ className, ...props }: ComponentProps<typeof BaseTooltip.Popup>) {
  return (
    <BaseTooltip.Popup
      className={cn(
        "bg-popover text-popover-foreground max-w-xs rounded-md border px-3 py-2 text-xs shadow-md outline-none",
        "origin-[var(--transform-origin)] transition-[transform,opacity] duration-100 ease-out",
        "data-ending-style:scale-95 data-ending-style:opacity-0",
        "data-starting-style:scale-95 data-starting-style:opacity-0",
        className,
      )}
      {...props}
    />
  );
}

export {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipPortal,
  TooltipPositioner,
  TooltipPopup,
  TooltipArrow,
};
