import type { ReactNode } from "react";
import { Menu } from "@base-ui/react/menu";
import { ChevronDown } from "lucide-react";

import { frostedSurface } from "../lib/frosted-surface";
import { cn } from "../lib/utils";
import { FrostedShellBar } from "./frosted-shell";

export interface PillSelectOption<T extends string> {
  value: T;
  label: ReactNode;
  /** Shown on the trigger to indicate ascending/descending order (e.g. sort). */
  direction?: "asc" | "desc";
}

export interface PillSelectProps<T extends string> {
  options: PillSelectOption<T>[];
  value: T;
  onValueChange: (value: T) => void;
  /** Filled glass pill (default) or border-only ghost. */
  variant?: "filled" | "ghost";
  className?: string;
  "aria-label"?: string;
}

const triggerContentClass =
  "relative inline-flex items-center gap-1 pl-3 pr-2 text-xs font-normal leading-none text-foreground";

/**
 * Pill-shaped dropdown (Figma node 131:3245) — shows the current choice with a
 * caret; opens a menu to pick another option.
 */
function PillSelect<T extends string>({
  options,
  value,
  onValueChange,
  variant = "filled",
  className,
  "aria-label": ariaLabel,
}: PillSelectProps<T>) {
  const selected = options.find((o) => o.value === value);
  const filled = variant === "filled";

  return (
    <Menu.Root modal={false}>
      <Menu.Trigger
        aria-label={ariaLabel}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        className={cn(
          "inline-flex h-8 cursor-pointer items-center rounded-pill outline-none",
          "focus-visible:ring-ring focus-visible:ring-2",
          filled
            ? cn("relative overflow-hidden", frostedSurface("shell"))
            : "gap-1 border border-white/16 bg-transparent",
          className,
        )}
      >
        {filled && <FrostedShellBar />}
        <span className={triggerContentClass}>
          <span className="inline-flex items-center">{selected?.label}</span>
          <ChevronDown className="size-3 shrink-0 opacity-70" aria-hidden />
        </span>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner
          side="top"
          sideOffset={4}
          align="center"
          className="z-[100]"
        >
          <Menu.Popup
            data-palette-ignore-close
            data-pill-select-menu
            className={cn(
              "relative min-w-[var(--anchor-width)] overflow-hidden rounded-lg outline-none",
              frostedSurface("rim"),
              "transition-none",
            )}
          >
            <div
              className={cn(
                "pointer-events-none absolute inset-0 rounded-[inherit]",
                frostedSurface("bar"),
              )}
              aria-hidden
            />
            <div className="relative p-1">
              {options.map((option) => {
                const active = option.value === value;
                return (
                  <Menu.Item
                    key={option.value}
                    closeOnClick
                    label={typeof option.label === "string" ? option.label : undefined}
                    onClick={() => onValueChange(option.value)}
                    className={cn(
                      "flex cursor-pointer items-center rounded-md px-2 py-1.5 text-xs outline-none select-none",
                      "transition-colors duration-100 ease-out motion-reduce:transition-none",
                      "data-highlighted:bg-white/[0.08]",
                      active ? "text-foreground" : "text-foreground/80",
                    )}
                  >
                    {option.label}
                  </Menu.Item>
                );
              })}
            </div>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

export { PillSelect };
