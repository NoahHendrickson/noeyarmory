import type { ComponentProps } from "react";

import { cn } from "../lib/utils";

type KbdProps = ComponentProps<"kbd"> & {
  /** `keycap` renders a bordered box — use for icon-only hints like ↓. */
  variant?: "default" | "keycap";
};

/**
 * A subtle inline keyboard hint, e.g. `Enter ⏎`, `Tab`, `Esc`. Presentational —
 * matches the muted hint style in the command bar (no heavy key-cap box).
 */
function Kbd({ className, variant = "default", ...props }: KbdProps) {
  return (
    <kbd
      className={cn(
        "text-muted-foreground inline-flex items-center gap-1 font-sans text-sm leading-none",
        variant === "keycap" &&
          "h-5 min-w-5 justify-center rounded-[4px] border border-white/16 bg-white/[0.04] px-1 text-xs",
        className,
      )}
      {...props}
    />
  );
}

export { Kbd };
