import { Pin, X } from "lucide-react";
import { cn, frostedSurface } from "@repo/ui";

import { pinnedFilterKey, type PinnedFilter } from "../lib/use-pinned-search-items";

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
  if (filters.length === 0) return <div className="flex-1" />;

  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
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
        "inline-flex h-8 max-w-full items-center overflow-hidden rounded-pill",
        frostedSurface("pill"),
      )}
    >
      <button
        type="button"
        className="inline-flex min-w-0 cursor-pointer items-center gap-1.5 py-1.5 pr-2 pl-3 text-xs font-normal text-foreground"
        onClick={onApply}
      >
        <Pin className="size-3.5 shrink-0 fill-current text-muted-foreground" aria-hidden />
        <span className="truncate">
          <span className="text-muted-foreground">{filter.categoryLabel}: </span>
          {filter.value}
        </span>
      </button>
      <button
        type="button"
        aria-label={`Unpin ${filter.categoryLabel}: ${filter.value}`}
        className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
        onClick={onRemove}
      >
        <X className="size-3.5" />
      </button>
    </span>
  );
}
