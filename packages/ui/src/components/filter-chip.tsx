import type { ComponentProps, KeyboardEvent, Ref } from "react";
import { X } from "lucide-react";

import { cn } from "../lib/utils";

export interface FilterChipProps extends Omit<ComponentProps<"span">, "title"> {
  /** Category label, e.g. "Trait 1". */
  label: string;
  /** Chosen value, e.g. "Bait and Switch". Omit for an in-progress draft chip. */
  value?: string;
  /** When provided, renders a × button (committed chips only). */
  onRemove?: () => void;
  /** Draft chip: inline input for filtering values within this category. */
  inputRef?: Ref<HTMLInputElement>;
  inputValue?: string;
  onInputChange?: (value: string) => void;
  onInputKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  inputPlaceholder?: string;
  /** Extra props for the inline draft input (e.g. combobox ARIA). */
  inputProps?: Omit<ComponentProps<"input">, "ref" | "type" | "value" | "placeholder" | "onChange" | "onKeyDown">;
}

/**
 * A filter token inside the command bar.
 * - **Committed** (value set): light pill per Figma — `Trait 1: "value" ×`
 * - **Draft** (no value): muted dark pill while drilling — `Trait 1:`
 */
function FilterChip({
  label,
  value,
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

  return (
    <span
      data-slot="filter-chip"
      data-draft={isDraft || undefined}
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1 text-xs font-medium whitespace-nowrap",
        isDraft
          ? "rounded-full bg-white/[0.08] py-1 pl-2.5 pr-2 text-white/70"
          : "rounded-full bg-white/70 py-1 pr-0.5 pl-2 text-[#2e2c2d]",
        hasInlineInput && "pr-2.5",
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
              className="placeholder:text-white/40 w-auto min-w-[1ch] [field-sizing:content] bg-transparent text-white/70 outline-none"
              {...inputProps}
            />
          )}
        </>
      ) : (
        <span>
          {label}: &ldquo;{value}&rdquo;
        </span>
      )}
      {onRemove && !isDraft && (
        <button
          type="button"
          aria-label={`Remove ${label}: ${value}`}
          onClick={onRemove}
          className="flex size-6 shrink-0 items-center justify-center rounded-full text-[#2e2c2d]/60 transition-colors hover:bg-black/10 hover:text-[#2e2c2d]"
        >
          <X className="size-3" />
        </button>
      )}
    </span>
  );
}

export { FilterChip };
