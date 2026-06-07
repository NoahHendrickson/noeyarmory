import type { ComponentProps } from "react";
import { Popover as BasePopover } from "@base-ui/react/popover";

import { cn } from "../lib/utils";

const Popover = BasePopover.Root;
const PopoverTrigger = BasePopover.Trigger;
const PopoverPortal = BasePopover.Portal;
const PopoverClose = BasePopover.Close;
const PopoverTitle = BasePopover.Title;
const PopoverDescription = BasePopover.Description;

function PopoverPositioner({
  className,
  sideOffset = 8,
  ...props
}: ComponentProps<typeof BasePopover.Positioner>) {
  return (
    <BasePopover.Positioner
      className={cn("z-50", className)}
      sideOffset={sideOffset}
      {...props}
    />
  );
}

function PopoverPopup({ className, ...props }: ComponentProps<typeof BasePopover.Popup>) {
  return (
    <BasePopover.Popup
      className={cn(
        "bg-popover text-popover-foreground pointer-events-auto border outline-none",
        // Opacity-only — scale fights Floating UI positioning and reads as a close hitch.
        "transition-opacity duration-100 ease-in-out",
        "data-ending-style:opacity-0",
        "data-starting-style:opacity-0",
        className,
      )}
      {...props}
    />
  );
}

export {
  Popover,
  PopoverTrigger,
  PopoverPortal,
  PopoverPositioner,
  PopoverPopup,
  PopoverClose,
  PopoverTitle,
  PopoverDescription,
};
