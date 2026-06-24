import type { ClassValue } from "clsx";

import { cn } from "./utils";

/**
 * Shared frosted-glass surface tokens (command palette, modals, tooltips).
 * Use `shell` + `bar` as separate layers when the rim should read bright against blur.
 * Keep arbitrary shadow strings literal so Tailwind's scanner emits them in production.
 */
export const frostedSurfaceTokens = {
  /** Modal panels, perk tooltips — heavier shadow, 35% card fill. */
  panel: "border border-white/16 bg-card/35 shadow-lg shadow-black/25 backdrop-blur-xl",
  /** Palette bar, sticky headers, list chrome — 62% card fill. */
  bar: "bg-card/62 backdrop-blur-xl",
  /** Floating palette lists over page content — heavier fill and blur for legibility. */
  barDense: "bg-card/94 backdrop-blur-2xl",
  /** Sticky section headers with bottom border. */
  barBordered: "border-b border-white/16 bg-card/62 backdrop-blur-xl",
  /** Panel footers and other chrome with a top border only. */
  barTop: "border-t border-white/16 bg-card/62 backdrop-blur-xl",
  /** Single-layer pill (e.g. modal back) when shell+bar layering is impractical. */
  pill: "border border-white/16 bg-card/62 backdrop-blur-xl shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_28px_56px_-2px_rgba(0,0,0,0.42),0_12px_24px_-4px_rgba(0,0,0,0.22)]",
  /** Glass rim + inset highlight only — pair with `bar`; no drop shadow (menus, attached panels). */
  rim: "border border-white/16 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)]",
  /** Outer perimeter — glass rim + drop shadow only; pair with `bar` on an inset layer. */
  shell:
    "border border-white/16 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_28px_56px_-2px_rgba(0,0,0,0.42),0_12px_24px_-4px_rgba(0,0,0,0.22)]",
} as const;

export type FrostedSurfaceToken = keyof typeof frostedSurfaceTokens;

export function frostedSurface(token: FrostedSurfaceToken, ...extra: ClassValue[]): string {
  return cn(frostedSurfaceTokens[token], ...extra);
}
