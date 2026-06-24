import { MagnifyingGlass } from "@phosphor-icons/react";
import { ArrowRight, Plus, X } from "lucide-react";

import { cn } from "../../lib/utils";
import { Button } from "../button";
import { FilterChip, type FilterChipProps } from "../filter-chip";
import { Kbd } from "../kbd";
import { whisperForActiveItem } from "./palette-reducer";
import type { PaletteCategory, PaletteChip, PaletteItem, PaletteSize } from "./types";

const INPUT_BAR_SIZE: Record<
  PaletteSize,
  { bar: string; icon: string; text: string; ghostText: string }
> = {
  default: {
    bar: "min-h-12 sm:h-14 gap-2 sm:gap-3 pl-3 sm:pl-[18px]",
    icon: "size-4",
    text: "text-base",
    ghostText: "text-base",
  },
  compact: {
    bar: "min-h-9 sm:h-9 gap-2 pl-2.5 sm:pl-3",
    icon: "size-3.5",
    text: "text-sm",
    ghostText: "text-sm",
  },
};

/** Visible Tab keycap hint — rendered inline after the ghost suffix, outside the width sizer. */
function GhostTabHint() {
  return (
    <span className="ml-1.5 inline-flex shrink-0 items-center gap-0.5 text-[11px] leading-none text-muted-foreground/35">
      Tab
      <Kbd
        variant="keycap"
        className="h-3.5 min-w-3.5 rounded-[3px] px-0 text-[10px] text-muted-foreground/50"
      >
        <ArrowRight className="size-2.5" aria-hidden />
      </Kbd>
    </span>
  );
}

export interface PaletteInputBarProps {
  open: boolean;
  disabled: boolean;
  renderBarOverlay?: React.ReactNode;
  leftAdornment?: React.ReactNode;
  rightAdornment?: React.ReactNode;
  chips: PaletteChip[];
  onRemoveChip: (chipId: string) => void;
  getChipAppearance?: (
    chip: PaletteChip,
  ) => Pick<FilterChipProps, "tone" | "element" | "valueIcon" | "hideLabel" | "iconOnly">;
  drilling: boolean;
  activeCategory: PaletteCategory | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  valueQuery: string;
  onValueQueryChange: (value: string) => void;
  onDrillBack: () => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  comboboxProps: React.ComponentProps<"input">;
  onOpenPanel: () => void;
  showAddMore: boolean;
  onShowFilterCategories: () => void;
  effectivePlaceholder: string;
  inputValue: string;
  inputSize: number;
  onQueryChange: (query: string) => void;
  displayIndex: number;
  items: PaletteItem[];
  ghostSuffix?: string;
  /** Use `size` instead of `field-sizing:content` — avoids per-keystroke layout in Firefox. */
  instantInputSizing?: boolean;
  size?: PaletteSize;
  showClearButton: boolean;
  clearBarLabel: string;
  onClearBar: () => void;
}

export function PaletteInputBar({
  open,
  disabled,
  renderBarOverlay,
  leftAdornment,
  rightAdornment,
  chips,
  onRemoveChip,
  getChipAppearance,
  drilling,
  activeCategory,
  inputRef,
  valueQuery,
  onValueQueryChange,
  onDrillBack,
  handleKeyDown,
  comboboxProps,
  onOpenPanel,
  showAddMore,
  onShowFilterCategories,
  effectivePlaceholder,
  inputValue,
  inputSize,
  onQueryChange,
  displayIndex,
  items,
  ghostSuffix,
  instantInputSizing = false,
  size = "default",
  showClearButton,
  clearBarLabel,
  onClearBar,
}: PaletteInputBarProps) {
  const sizeStyles = INPUT_BAR_SIZE[size];
  const showGhostSizer = Boolean(ghostSuffix && inputValue.length > 0 && !instantInputSizing);
  const showGhostHint = open && showGhostSizer;
  const useInputSize = instantInputSizing || !showGhostSizer;

  const valueInputPlaceholder = activeCategory
    ? (whisperForActiveItem(items[displayIndex]) ?? `Filter ${activeCategory.label}…`)
    : undefined;

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
    <div
      className={cn(
        "flex items-center justify-between border-b transition-[border-color] duration-200 ease-out motion-reduce:transition-none",
        sizeStyles.bar,
        showClearButton ? (size === "compact" ? "pr-4" : "pr-6") : size === "compact" ? "pr-3" : "pr-[18px]",
        open ? "border-white/16" : "border-transparent",
      )}
      onClick={() => {
        if (disabled || renderBarOverlay) return;
        inputRef.current?.focus();
        onOpenPanel();
      }}
    >
      <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-2.5 overflow-x-auto">
        <span
          className={cn(
            "flex shrink-0 items-center justify-center text-muted-foreground",
            sizeStyles.icon,
          )}
        >
          {leftAdornment ?? (
            <MagnifyingGlass className={sizeStyles.icon} weight="duotone" />
          )}
        </span>

        {renderBarOverlay ?? (
          <>
            {chips.map((chip) => (
              <FilterChip
                key={chip.id}
                label={chip.categoryLabel}
                value={chip.value}
                onRemove={() => onRemoveChip(chip.id)}
                {...getChipAppearance?.(chip)}
              />
            ))}
            {drilling && activeCategory && (
              <FilterChip
                label={activeCategory.label}
                aria-label={`Filtering by ${activeCategory.label}`}
                inputRef={inputRef}
                inputValue={valueQuery}
                onInputChange={onValueQueryChange}
                onInputKeyDown={handleKeyDown}
                inputPlaceholder={valueInputPlaceholder}
                onRemove={onDrillBack}
                inputProps={{
                  ...comboboxProps,
                  onFocus: () => !disabled && onOpenPanel(),
                }}
              />
            )}
            {!drilling && (
              <>
                {showAddMore && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="iconRound"
                    className="shrink-0 bg-white text-card hover:bg-white/90 hover:text-card"
                    aria-label="Browse filter categories"
                    disabled={disabled}
                    onClick={(e) => {
                      e.stopPropagation();
                      onShowFilterCategories();
                    }}
                  >
                    <Plus className="size-4" />
                  </Button>
                )}
                <div className="flex min-w-0 items-center">
                  <div
                    className={cn(
                      "relative shrink-0",
                      showGhostSizer
                        ? "inline-grid min-w-0"
                        : "inline-flex min-w-[8ch] items-center",
                    )}
                  >
                    {showGhostSizer && (
                      <>
                        <span
                          aria-hidden
                          className={cn(
                            "invisible col-start-1 row-start-1 tracking-body whitespace-pre",
                            sizeStyles.ghostText,
                          )}
                        >
                          {inputValue}
                          {ghostSuffix}
                        </span>
                        <span
                          aria-hidden
                          className={cn(
                            "pointer-events-none col-start-1 row-start-1 flex items-center tracking-body whitespace-pre",
                            sizeStyles.ghostText,
                          )}
                        >
                          <span className="invisible">{inputValue}</span>
                          <span className="text-muted-foreground/50">{ghostSuffix}</span>
                          {showGhostHint && <GhostTabHint />}
                        </span>
                      </>
                    )}
                    <input
                      ref={inputRef}
                      type="text"
                      {...(useInputSize ? { size: inputSize } : {})}
                      className={cn(
                        "col-start-1 row-start-1 bg-transparent tracking-body outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed",
                        sizeStyles.text,
                        showGhostSizer ? "w-full min-w-0" : "min-w-[8ch]",
                        !instantInputSizing && !showGhostSizer && "[field-sizing:content]",
                      )}
                      placeholder={effectivePlaceholder}
                      value={inputValue}
                      disabled={disabled}
                      onChange={(e) => onQueryChange(e.target.value)}
                      onFocus={() => !disabled && onOpenPanel()}
                      onKeyDown={handleKeyDown}
                      {...comboboxProps}
                    />
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {(rightAdornment != null || showClearButton) && (
        <div className="flex shrink-0 items-center gap-2">
          {rightAdornment != null && (
            // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
            <div
              data-palette-ignore-close
              className="flex cursor-pointer items-center"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {rightAdornment}
            </div>
          )}

          {showClearButton && (
            <Button
              type="button"
              variant="ghost"
              size="iconRound"
              className="text-white/60 hover:bg-white/10 hover:text-white"
              aria-label={clearBarLabel}
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation();
                onClearBar();
              }}
            >
              <X className="size-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
