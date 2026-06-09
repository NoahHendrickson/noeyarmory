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
  const safeActiveIndex = activeIndex >= 0 ? activeIndex : 0;
  const optionCount = Math.max(options.length, 1);

  function move(delta: number) {
    const next = (activeIndex + delta + options.length) % options.length;
    onValueChange(options[next]!.value);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn("relative inline-grid items-center rounded-xl bg-secondary p-0.5", className)}
      style={{ gridTemplateColumns: `repeat(${optionCount}, minmax(0, 1fr))` }}
    >
      {options.length > 0 && (
        <span
          aria-hidden
          className="duration-motion-snappy pointer-events-none absolute top-0.5 bottom-0.5 left-0.5 rounded-[10px] border border-white/30 bg-white/[0.16] shadow-sm transition-transform ease-spring-snappy motion-reduce:transition-none"
          style={{
            width: `calc((100% - 0.25rem) / ${optionCount})`,
            transform: `translateX(${safeActiveIndex * 100}%)`,
          }}
        />
      )}
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
              "duration-motion-fast relative z-10 h-7 cursor-pointer rounded-[10px] border border-transparent bg-transparent px-3 text-xs font-medium whitespace-nowrap transition-colors ease-spring-smooth outline-none",
              "focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "text-foreground"
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
