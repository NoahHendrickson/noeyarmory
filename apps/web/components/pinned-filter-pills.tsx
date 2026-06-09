import { ChevronDown, Pin } from "lucide-react";
import { useState } from "react";
import {
  cn,
  frostedSurface,
  FrostedPopoverPopup,
  FrostedShellBar,
  Popover,
  PopoverPortal,
  PopoverPositioner,
  PopoverTrigger,
} from "@repo/ui";

import { pinnedFilterKey, type PinnedFilter } from "../lib/use-pinned-search-items";

const MAX_INLINE_PINNED_FILTERS = 3;

interface PinnedFilterPillsProps {
  filters: PinnedFilter[];
  onApplyFilter: (filter: PinnedFilter) => void;
  onRemoveFilter: (filter: Pick<PinnedFilter, "categoryId" | "valueId">) => void;
}

export function PinnedFilterPills({
  filters,
  onApplyFilter,
  onRemoveFilter,
}: PinnedFilterPillsProps) {
  if (filters.length === 0) return null;

  if (filters.length > MAX_INLINE_PINNED_FILTERS) {
    return (
      <PinnedFiltersMenu
        filters={filters}
        onApplyFilter={onApplyFilter}
        onRemoveFilter={onRemoveFilter}
      />
    );
  }

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      {filters.map((filter) => (
        <PinnedFilterPill
          key={pinnedFilterKey(filter)}
          filter={filter}
          onApply={() => onApplyFilter(filter)}
          onRemove={() => onRemoveFilter(filter)}
        />
      ))}
    </div>
  );
}

function PinnedFiltersMenu({
  filters,
  onApplyFilter,
  onRemoveFilter,
}: PinnedFilterPillsProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label="Pinned filters"
            data-palette-ignore-close
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
            className={cn(
              "inline-flex h-8 cursor-pointer items-center rounded-pill outline-none",
              "focus-visible:ring-ring focus-visible:ring-2",
              "relative overflow-hidden",
              frostedSurface("shell"),
            )}
          />
        }
      >
        <FrostedShellBar />
        <span className="relative inline-flex items-center gap-1 py-1.5 pr-2 pl-3 text-xs font-normal leading-none text-foreground">
          Pinned
          <ChevronDown className="size-3 shrink-0 opacity-70" aria-hidden />
        </span>
      </PopoverTrigger>
      <PopoverPortal>
        <PopoverPositioner side="bottom" sideOffset={4} align="start" className="z-[100]">
          <FrostedPopoverPopup className="min-w-[12rem] rounded-lg p-1">
            {filters.map((filter) => (
              <div
                key={pinnedFilterKey(filter)}
                className="flex items-center gap-1 rounded-md px-1 py-0.5 hover:bg-white/[0.08]"
              >
                <PinnedFilterPinButton
                  filter={filter}
                  onRemove={() => onRemoveFilter(filter)}
                />
                <button
                  type="button"
                  className="min-w-0 flex-1 cursor-pointer truncate py-1.5 pr-2 text-left text-xs text-foreground"
                  onClick={() => {
                    onApplyFilter(filter);
                    setOpen(false);
                  }}
                >
                  <span className="text-muted-foreground">{filter.categoryLabel}: </span>
                  {filter.value}
                </button>
              </div>
            ))}
          </FrostedPopoverPopup>
        </PopoverPositioner>
      </PopoverPortal>
    </Popover>
  );
}

function PinnedFilterPill({
  filter,
  onApply,
  onRemove,
}: {
  filter: PinnedFilter;
  onApply: () => void;
  onRemove: () => void;
}) {
  return (
    <span
      data-palette-ignore-close
      className={cn(
        "inline-flex h-8 max-w-full min-w-0 items-center overflow-hidden rounded-pill",
        frostedSurface("pill"),
      )}
    >
      <PinnedFilterPinButton filter={filter} onRemove={onRemove} />
      <button
        type="button"
        className="inline-flex min-w-0 cursor-pointer items-center truncate py-1.5 pr-3 text-xs font-normal text-foreground"
        onClick={onApply}
      >
        <span className="truncate">
          <span className="text-muted-foreground">{filter.categoryLabel}: </span>
          {filter.value}
        </span>
      </button>
    </span>
  );
}

function PinnedFilterPinButton({
  filter,
  onRemove,
}: {
  filter: PinnedFilter;
  onRemove: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={`Unpin ${filter.categoryLabel}: ${filter.value}`}
      aria-pressed
      className="flex size-8 shrink-0 cursor-pointer items-center justify-center text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
      onMouseDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onRemove();
      }}
    >
      <Pin className="size-3.5 fill-current" aria-hidden />
    </button>
  );
}
