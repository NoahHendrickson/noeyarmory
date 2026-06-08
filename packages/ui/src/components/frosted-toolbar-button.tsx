import type { ReactNode } from "react";

import { frostedSurface } from "../lib/frosted-surface";
import { cn } from "../lib/utils";
import { Button, type ButtonProps } from "./button";
import { FrostedShellBar } from "./frosted-shell";

export interface FrostedToolbarButtonProps extends ButtonProps {
  children?: ReactNode;
}

/**
 * Header toolbar affordance — frosted shell + blur bar, matching command palette glass.
 */
function FrostedToolbarButton({ className, children, ...props }: FrostedToolbarButtonProps) {
  return (
    <Button
      variant="outline"
      className={cn(
        "relative h-7 overflow-hidden rounded-[8px] border-0 bg-transparent px-2.5 text-xs font-medium text-white shadow-none sm:px-3",
        "hover:bg-transparent hover:text-white",
        frostedSurface("shell"),
        className,
      )}
      {...props}
    >
      <FrostedShellBar as="span" />
      <span className="relative">{children}</span>
    </Button>
  );
}

export { FrostedToolbarButton };
