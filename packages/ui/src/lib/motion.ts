import type { ClassValue } from "clsx";

import { cn } from "./utils";

export const motionDurationMs = {
  fast: 120,
  snappy: 200,
  medium: 280,
  slow: 360,
} as const;

export const motionTokens = {
  fastSmooth:
    "duration-[var(--motion-duration-fast)] ease-spring-smooth motion-reduce:transition-none",
  snappySmooth:
    "duration-[var(--motion-duration-snappy)] ease-spring-smooth motion-reduce:transition-none",
  snappySpring:
    "duration-[var(--motion-duration-snappy)] ease-spring-snappy motion-reduce:transition-none",
  mediumSmooth:
    "duration-[var(--motion-duration-medium)] ease-spring-smooth motion-reduce:transition-none",
  mediumSpring:
    "duration-[var(--motion-duration-medium)] ease-spring-snappy motion-reduce:transition-none",
  pressFeedback:
    "transition-[background-color,transform] duration-[var(--motion-duration-fast)] ease-spring-snappy active:scale-[0.985] motion-reduce:transition-none motion-reduce:active:scale-100",
} as const;

export type MotionToken = keyof typeof motionTokens;

export function motion(token: MotionToken, ...extra: ClassValue[]): string {
  return cn(motionTokens[token], ...extra);
}
