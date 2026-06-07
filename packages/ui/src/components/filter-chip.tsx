import type { ComponentProps, KeyboardEvent, ReactNode, Ref } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";

import { cn } from "../lib/utils";

const filterChipBase =
  "inline-flex h-6 shrink-0 items-center gap-1 text-xs font-medium whitespace-nowrap";

const filterChipVariants = cva(filterChipBase, {
    variants: {
      tone: {
        default: "text-card rounded-full bg-white/70 pr-0 pl-2.5",
        trait: "rounded-full bg-filter-chip-trait pr-0 pl-2.5 text-filter-chip-trait-foreground",
        "ammo-special":
          "rounded-full bg-filter-chip-ammo-special pr-0 pl-2.5 text-filter-chip-ammo-special-foreground",
        "ammo-heavy":
          "rounded-full bg-filter-chip-ammo-heavy pr-0 pl-2.5 text-filter-chip-ammo-heavy-foreground",
        element: "rounded-full pr-0 pl-2.5 text-filter-chip-element-foreground",
      },
      element: {
        Solar: "bg-filter-chip-element-solar",
        Arc: "bg-filter-chip-element-arc",
        Void: "bg-filter-chip-element-void",
        Stasis: "bg-filter-chip-element-stasis",
        Strand: "bg-filter-chip-element-strand",
        Kinetic: "bg-filter-chip-element-kinetic",
      },
    },
    defaultVariants: { tone: "default" },
  },
);

const removeButtonVariants = cva(
  "flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors",
  {
    variants: {
      tone: {
        default: "text-card/60 hover:text-card hover:bg-black/10",
        trait: "text-white/60 hover:bg-white/10 hover:text-white",
        "ammo-special": "text-white/60 hover:bg-white/10 hover:text-white",
        "ammo-heavy": "text-white/60 hover:bg-white/10 hover:text-white",
        element: "text-white/60 hover:bg-white/10 hover:text-white",
      },
    },
    defaultVariants: { tone: "default" },
  },
);

export type FilterChipTone = NonNullable<VariantProps<typeof filterChipVariants>["tone"]>;
export type FilterChipElement = NonNullable<VariantProps<typeof filterChipVariants>["element"]>;

export interface FilterChipProps extends Omit<ComponentProps<"span">, "title"> {
  /** Category label, e.g. "Trait 1". */
  label: string;
  /** Chosen value, e.g. "Bait and Switch". Omit for an in-progress draft chip. */
  value?: string;
  /** Visual tone for committed chips. Draft chips always use the muted style. */
  tone?: FilterChipTone;
  /** Damage type for element-tone chips — selects the element background color. */
  element?: FilterChipElement;
  /** When set, renders before the value text (e.g. an element icon). */
  valueIcon?: ReactNode;
  /** Suppress the category label prefix (e.g. element or weapon-type chips). */
  hideLabel?: boolean;
  /** When true with hideLabel + valueIcon, renders only the icon (no value text). */
  iconOnly?: boolean;
  /** When provided, renders a × button to dismiss the chip or cancel an in-progress filter. */
  onRemove?: () => void;
  /** Draft chip: inline input for filtering values within this category. */
  inputRef?: Ref<HTMLInputElement>;
  inputValue?: string;
  onInputChange?: (value: string) => void;
  onInputKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  inputPlaceholder?: string;
  /** Extra props for the inline draft input (e.g. combobox ARIA). */
  inputProps?: Omit<
    ComponentProps<"input">,
    "ref" | "type" | "value" | "placeholder" | "onChange" | "onKeyDown"
  >;
}

/**
 * A filter token inside the command bar.
 * - **Committed** (value set): light pill per Figma — `Trait 1: value ×`
 * - **Draft** (no value): muted dark pill while drilling — `Trait 1:`
 */
function FilterChip({
  label,
  value,
  tone = "default",
  element,
  valueIcon,
  hideLabel = false,
  iconOnly = false,
  onRemove,
  inputRef,
  inputValue,
  onInputChange,
  onInputKeyDown,
  inputPlaceholder,
  inputProps,
  className,
  ...props
}: FilterChipProps) {
  const isDraft = value == null || value === "";
  const hasInlineInput = isDraft && onInputChange != null;
  const showIconOnly = !isDraft && iconOnly && valueIcon != null;
  const ariaLabel = !isDraft && hideLabel ? `${label}: ${value}` : undefined;

  return (
    <span
      data-slot="filter-chip"
      data-draft={isDraft || undefined}
      data-tone={isDraft ? undefined : tone}
      aria-label={ariaLabel}
      className={cn(
        isDraft
          ? cn(filterChipBase, "rounded-full bg-white/[0.08] pl-2.5 pr-2 text-white/70")
          : filterChipVariants({ tone, element: tone === "element" ? element : undefined }),
        hasInlineInput && (onRemove ? "pr-0" : "pr-2.5"),
        showIconOnly && "px-1.5",
        className,
      )}
      {...props}
    >
      {isDraft ? (
        <>
          <span>{label}:</span>
          {hasInlineInput && (
            <input
              ref={inputRef}
              data-slot="filter-chip-input"
              type="text"
              value={inputValue ?? ""}
              placeholder={inputPlaceholder}
              size={Math.max(1, (inputValue?.length ?? 0) + 1)}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={onInputKeyDown}
              className="placeholder:text-white/40 h-full min-h-0 w-auto min-w-[1ch] [field-sizing:content] bg-transparent p-0 text-xs leading-none text-white/70 outline-none"
              {...inputProps}
            />
          )}
        </>
      ) : showIconOnly ? (
        <span className="flex size-3.5 items-center justify-center">{valueIcon}</span>
      ) : (
        <span>
          {!hideLabel && `${label}: `}
          {valueIcon ? (
            <span className="inline-flex items-center gap-1">
              {valueIcon}
              {value}
            </span>
          ) : (
            value
          )}
        </span>
      )}
      {onRemove && (
        <button
          type="button"
          aria-label={isDraft ? `Cancel ${label} filter` : `Remove ${label}: ${value}`}
          onClick={onRemove}
          className={
            isDraft
              ? "flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              : removeButtonVariants({ tone })
          }
        >
          <X className="size-3" />
        </button>
      )}
    </span>
  );
}

export { FilterChip, filterChipVariants };
