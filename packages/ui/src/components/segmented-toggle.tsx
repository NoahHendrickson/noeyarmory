import { useRef } from "react";
import type { ReactNode } from "react";

import { cn } from "../lib/utils";

export interface SegmentedToggleOption<T extends string> {
  value: T;
  label: ReactNode;
}

export interface SegmentedToggleProps<T extends string> {
  options: SegmentedToggleOption<T>[];
  value: T;
  onValueChange: (value: T) => void;
  className?: string;
  "aria-label"?: string;
}

/**
 * A small two-or-more segmented control (the "Weapon search | My Armor" switch).
 * Controlled `radiogroup` with roving focus + arrow-key navigation.
 */
function SegmentedToggle<T extends string>({
  options,
  value,
  onValueChange,
  className,
  "aria-label": ariaLabel,
}: SegmentedToggleProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const activeIndex = options.findIndex((o) => o.value === value);

  function move(delta: number) {
    const next = (activeIndex + delta + options.length) % options.length;
    onValueChange(options[next]!.value);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn("bg-secondary inline-flex items-center gap-0.5 rounded-xl p-0.5", className)}
    >
      {options.map((option, i) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onValueChange(option.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                e.preventDefault();
                move(1);
              } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                e.preventDefault();
                move(-1);
              }
            }}
            className={cn(
              "h-7 rounded-[10px] border px-3 text-xs font-medium transition-colors outline-none",
              "focus-visible:ring-ring focus-visible:ring-2",
              active
                ? "border-white/30 bg-white/[0.16] text-foreground"
                : "border-transparent text-foreground/60 hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export { SegmentedToggle };
