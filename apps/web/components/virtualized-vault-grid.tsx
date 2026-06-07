"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef, type ReactNode } from "react";
import { cn } from "@repo/ui";

import { useVaultGridColumns } from "../lib/use-grid-columns";

const VIRTUALIZE_THRESHOLD = 60;
const ROW_HEIGHT = 148;
const GRID_CLASS = "grid gap-3 sm:grid-cols-2 xl:grid-cols-3";

export function VirtualizedVaultGrid<T>({
  items,
  renderItem,
  className,
}: {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  className?: string;
}) {
  if (items.length <= VIRTUALIZE_THRESHOLD) {
    return (
      <div className={cn(GRID_CLASS, className)}>
        {items.map((item, index) => renderItem(item, index))}
      </div>
    );
  }

  return <VirtualizedVaultGridInner items={items} renderItem={renderItem} className={className} />;
}

function VirtualizedVaultGridInner<T>({
  items,
  renderItem,
  className,
}: {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  className?: string;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const columns = useVaultGridColumns();
  const rowCount = Math.ceil(items.length / columns);

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 3,
  });

  return (
    <div ref={parentRef} className={cn("max-h-[calc(100dvh-8rem)] overflow-auto sm:max-h-[calc(100vh-8rem)]", className)}>
      <div className="relative w-full" style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const start = virtualRow.index * columns;
          const rowItems = items.slice(start, start + columns);
          return (
            <div
              key={virtualRow.key}
              className={GRID_CLASS}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {rowItems.map((item, offset) => renderItem(item, start + offset))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
