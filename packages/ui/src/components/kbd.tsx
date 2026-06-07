import type { ComponentProps } from "react";

import { cn } from "../lib/utils";

/**
 * A subtle inline keyboard hint, e.g. `Enter ⏎`, `Tab`, `Esc`. Presentational —
 * matches the muted hint style in the command bar (no heavy key-cap box).
 */
function Kbd({ className, ...props }: ComponentProps<"kbd">) {
  return (
    <kbd
      className={cn(
        "text-muted-foreground inline-flex items-center gap-1 font-sans text-sm leading-none",
        className,
      )}
      {...props}
    />
  );
}

export { Kbd };
