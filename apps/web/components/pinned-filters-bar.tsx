"use client";

import { FilterChip } from "@repo/ui";

import {
  formatPinnedFilterLabel,
  type PinnedFilter,
} from "../lib/use-pinned-filters";

export function PinnedFiltersBar({
  filters,
  onSelect,
  onUnpin,
}: {
  filters: PinnedFilter[];
  onSelect: (id: string) => void;
  onUnpin: (id: string) => void;
}) {
  if (filters.length === 0) return null;

  return (
    <div
      className="mb-2 flex flex-wrap justify-center gap-1.5 px-1"
      data-palette-ignore-close
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {filters.map((filter) => (
        <FilterChip
          key={filter.id}
          variant="outline"
          tone="trait"
          label="Filter"
          value={formatPinnedFilterLabel(filter.chips)}
          hideLabel
          className="cursor-pointer"
          role="button"
          tabIndex={0}
          onClick={() => onSelect(filter.id)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onSelect(filter.id);
            }
          }}
          onRemove={() => onUnpin(filter.id)}
        />
      ))}
    </div>
  );
}
