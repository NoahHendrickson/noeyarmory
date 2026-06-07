import type { ReactNode } from "react";
import { Menu } from "@base-ui/react/menu";
import { ArrowDown, ArrowUp, ChevronDown } from "lucide-react";

import { cn } from "../lib/utils";

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

  return (
    <Menu.Root modal={false}>
      <Menu.Trigger
        aria-label={ariaLabel}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        className={cn(
          "border-border inline-flex h-8 cursor-pointer items-center gap-1 rounded-pill border py-1 text-xs font-normal text-foreground outline-none",
          "focus-visible:ring-ring focus-visible:ring-2",
          variant === "ghost"
            ? "bg-transparent pl-3 pr-2"
            : "bg-card/35 pl-3 pr-2 shadow-lg shadow-black/25 backdrop-blur-xl",
          className,
        )}
      >
        <span>{selected?.label}</span>
        {selected?.direction === "asc" && (
          <ArrowUp className="size-3 shrink-0 opacity-70" aria-hidden />
        )}
        {selected?.direction === "desc" && (
          <ArrowDown className="size-3 shrink-0 opacity-70" aria-hidden />
        )}
        <ChevronDown className="size-3 shrink-0 opacity-70" aria-hidden />
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
              // Match CommandPalette bar shell — subtle see-through over the shader
              "border-border bg-card/35 text-foreground shadow-lg shadow-black/25 backdrop-blur-xl min-w-[var(--anchor-width)] rounded-lg border p-1 outline-none",
              // Opacity-only — scale fights Floating UI positioning and reads as a close hitch.
              "transition-opacity duration-150 ease-in-out motion-reduce:transition-none",
              "data-ending-style:opacity-0",
              "data-starting-style:opacity-0",
            )}
          >
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
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

export { PillSelect };
