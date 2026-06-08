import type { ClassValue } from "clsx";

import { cn } from "./utils";

/** Shared frosted-glass surface tokens (command palette, modals, tooltips). */
export const frostedSurfaceTokens = {
  /** Modal panels, perk tooltips — heavier shadow, 35% card fill. */
  panel: "border border-border bg-card/35 shadow-lg shadow-black/25 backdrop-blur-xl",
  /** Palette bar, sticky headers, list chrome — 55% card fill. */
  bar: "bg-card/55 backdrop-blur-xl",
  /** Sticky section headers with bottom border. */
  barBordered: "border-b border-border/40 bg-card/55 backdrop-blur-xl",
  /** Panel footers and other chrome with a top border only. */
  barTop: "border-t border-border/40 bg-card/55 backdrop-blur-xl",
  /** Popovers and pill-select menus. */
  popover: "border border-border bg-card/35 text-foreground shadow-lg shadow-black/25 backdrop-blur-xl",
  /** Compact circular controls (e.g. modal back button). */
  pill: "border border-border bg-card/55 shadow-sm backdrop-blur-xl",
} as const;

export type FrostedSurfaceToken = keyof typeof frostedSurfaceTokens;

export function frostedSurface(token: FrostedSurfaceToken, ...extra: ClassValue[]): string {
  return cn(frostedSurfaceTokens[token], ...extra);
}
