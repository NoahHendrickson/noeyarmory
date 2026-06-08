import type { ComponentProps, ReactNode } from "react";
import { Popover as BasePopover } from "@base-ui/react/popover";

import { frostedSurface } from "../lib/frosted-surface";
import { cn } from "../lib/utils";
import { FrostedShellBar } from "./frosted-shell";

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
      data-palette-ignore-close
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

function FrostedPopoverPopup({
  className,
  children,
  ...props
}: ComponentProps<typeof BasePopover.Popup> & { children?: ReactNode }) {
  return (
    <PopoverPopup
      className={cn(
        "relative overflow-hidden border-0 bg-transparent",
        frostedSurface("shell"),
        className,
      )}
      {...props}
    >
      <FrostedShellBar />
      <div className="relative">{children}</div>
    </PopoverPopup>
  );
}

export {
  Popover,
  PopoverTrigger,
  PopoverPortal,
  PopoverPositioner,
  PopoverPopup,
  FrostedPopoverPopup,
  PopoverClose,
  PopoverTitle,
  PopoverDescription,
};
