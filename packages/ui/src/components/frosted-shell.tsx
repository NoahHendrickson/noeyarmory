import type { ReactNode } from "react";

import { frostedSurface, type FrostedSurfaceToken } from "../lib/frosted-surface";
import { cn } from "../lib/utils";

type FrostedBarToken = Extract<FrostedSurfaceToken, "bar" | "barDense">;

type FrostedShellBarProps = {
  /** Use `span` when the bar sits inside a `<button>` (invalid to nest a `<div>` there). */
  as?: "div" | "span";
  bar?: FrostedBarToken;
};

/**
 * Inset blur bar — pair with `frostedSurface("shell")` on the parent container.
 */
function FrostedShellBar({ as: Tag = "div", bar = "bar" }: FrostedShellBarProps = {}) {
  return (
    <Tag
      className={cn("pointer-events-none absolute inset-0 rounded-[inherit]", frostedSurface(bar))}
      aria-hidden
    />
  );
}

/**
 * Canonical shell+bar layering documented in `frosted-surface.ts`.
 * Use `surface="rim"` when the shell sits flush in a header (no drop shadow).
 */
function FrostedShell({
  className,
  children,
  surface = "shell",
  bar = "bar",
}: {
  className?: string;
  children: ReactNode;
  /** Outer perimeter token — `rim` omits the drop shadow. */
  surface?: "shell" | "rim";
  /** Inset fill/blur — `barDense` for floating overlays over busy page content. */
  bar?: FrostedBarToken;
}) {
  return (
    <div className={cn("relative overflow-hidden", frostedSurface(surface), className)}>
      <FrostedShellBar bar={bar} />
      <div className="relative">{children}</div>
    </div>
  );
}

export { FrostedShell, FrostedShellBar };
