import { Plus, Search, X } from "lucide-react";

import { cn } from "../../lib/utils";
import { Button } from "../button";
import { FilterChip, type FilterChipProps } from "../filter-chip";
import { whisperForActiveItem } from "./palette-reducer";
import type { PaletteCategory, PaletteChip, PaletteItem } from "./types";

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
  showClearButton,
  clearBarLabel,
  onClearBar,
}: PaletteInputBarProps) {
  const valueInputPlaceholder = activeCategory
    ? (whisperForActiveItem(items[displayIndex]) ?? `Filter ${activeCategory.label}…`)
    : undefined;

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
    <div
      className={cn(
        "flex min-h-12 items-center justify-between gap-2 border-b pl-3 transition-[border-color] duration-200 ease-out motion-reduce:transition-none sm:h-14 sm:gap-3 sm:pl-[18px]",
        showClearButton ? "pr-6" : "pr-[18px]",
        open ? "border-border" : "border-transparent",
      )}
      onClick={() => !disabled && !renderBarOverlay && inputRef.current?.focus()}
    >
      <div className="flex min-w-0 flex-nowrap items-center gap-2.5 overflow-x-auto">
        <span className="text-muted-foreground flex size-4 shrink-0 items-center justify-center">
          {leftAdornment ?? <Search className="size-4" />}
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
                    className="bg-white text-card hover:bg-white/90 hover:text-card shrink-0"
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
                <input
                  ref={inputRef}
                  type="text"
                  size={inputSize}
                  className="placeholder:text-muted-foreground min-w-[8ch] shrink-0 bg-transparent text-base tracking-body outline-none disabled:cursor-not-allowed"
                  placeholder={effectivePlaceholder}
                  value={inputValue}
                  disabled={disabled}
                  onChange={(e) => onQueryChange(e.target.value)}
                  onFocus={() => !disabled && onOpenPanel()}
                  onKeyDown={handleKeyDown}
                  {...comboboxProps}
                />
              </>
            )}
          </>
        )}
      </div>

      {(rightAdornment != null || showClearButton) && (
        <div className="flex shrink-0 items-center gap-2">
          {rightAdornment != null && (
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
