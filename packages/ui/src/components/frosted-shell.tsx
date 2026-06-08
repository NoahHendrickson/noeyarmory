import type { ReactNode } from "react";

import { frostedSurface } from "../lib/frosted-surface";
import { cn } from "../lib/utils";

type FrostedShellBarProps = {
  /** Use `span` when the bar sits inside a `<button>` (invalid to nest a `<div>` there). */
  as?: "div" | "span";
};

/**
 * Inset blur bar — pair with `frostedSurface("shell")` on the parent container.
 */
function FrostedShellBar({ as: Tag = "div" }: FrostedShellBarProps = {}) {
  return (
    <Tag
      className={cn("pointer-events-none absolute inset-0 rounded-[inherit]", frostedSurface("bar"))}
      aria-hidden
    />
  );
}

/**
 * Canonical shell+bar layering documented in `frosted-surface.ts`.
 */
function FrostedShell({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("relative overflow-hidden", frostedSurface("shell"), className)}>
      <FrostedShellBar />
      <div className="relative">{children}</div>
    </div>
  );
}

export { FrostedShell, FrostedShellBar };
