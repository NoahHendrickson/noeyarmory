import { ArrowRight, Plus, Search, X } from "lucide-react";

import { cn } from "../../lib/utils";
import { Button } from "../button";
import { FilterChip, type FilterChipProps } from "../filter-chip";
import { Kbd } from "../kbd";
import { whisperForActiveItem } from "./palette-reducer";
import type { PaletteCategory, PaletteChip, PaletteItem } from "./types";

/** Visible Tab keycap hint — keep out of the width sizer to avoid duplicate layout work. */
function GhostTabHint() {
  return (
    <span className="text-muted-foreground/35 ml-2.5 inline-flex shrink-0 items-center gap-0.5 text-xs">
      Tab
      <Kbd variant="keycap" className="text-muted-foreground/50 h-4 min-w-4 px-0.5 text-[10px]">
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
  showClearButton,
  clearBarLabel,
  onClearBar,
}: PaletteInputBarProps) {
  const showGhost = Boolean(ghostSuffix && inputValue.length > 0);

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
      <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-2.5 overflow-x-auto">
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
                <div className="flex min-w-0 items-center">
                  <div className="relative inline-flex min-w-[8ch] shrink-0 items-center">
                    <span aria-hidden className="invisible whitespace-pre text-base tracking-body">
                      {inputValue.length > 0 ? inputValue : effectivePlaceholder}
                      {showGhost && ghostSuffix}
                    </span>
                    {showGhost && (
                      <span
                        aria-hidden
                        className="pointer-events-none absolute inset-y-0 left-0 flex items-center whitespace-pre text-base tracking-body"
                      >
                        <span className="invisible">{inputValue}</span>
                        <span className="text-muted-foreground/50">{ghostSuffix}</span>
                      </span>
                    )}
                    <input
                      ref={inputRef}
                      type="text"
                      size={inputSize}
                      className="placeholder:text-muted-foreground absolute inset-0 min-w-[8ch] bg-transparent text-base tracking-body outline-none disabled:cursor-not-allowed"
                      placeholder={effectivePlaceholder}
                      value={inputValue}
                      disabled={disabled}
                      onChange={(e) => onQueryChange(e.target.value)}
                      onFocus={() => !disabled && onOpenPanel()}
                      onKeyDown={handleKeyDown}
                      {...comboboxProps}
                    />
                  </div>
                  {showGhost && <GhostTabHint />}
                </div>
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
