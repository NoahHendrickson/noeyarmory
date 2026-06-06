"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef, type ReactNode } from "react";
import { cn } from "@repo/ui";

import type { WeaponCardData } from "./weapon-card";

const VIRTUALIZE_THRESHOLD = 60;
const ROW_HEIGHT = 92;
const COLUMNS = 4;
const GRID_CLASS =
  "grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

export function VirtualizedWeaponGrid<T extends WeaponCardData>({
  weapons,
  renderItem,
  className,
}: {
  weapons: T[];
  renderItem: (weapon: T) => ReactNode;
  className?: string;
}) {
  if (weapons.length <= VIRTUALIZE_THRESHOLD) {
    return <div className={cn(GRID_CLASS, className)}>{weapons.map((weapon) => renderItem(weapon))}</div>;
  }

  return <VirtualizedWeaponGridInner weapons={weapons} renderItem={renderItem} className={className} />;
}

function VirtualizedWeaponGridInner<T extends WeaponCardData>({
  weapons,
  renderItem,
  className,
}: {
  weapons: T[];
  renderItem: (weapon: T) => ReactNode;
  className?: string;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const rowCount = Math.ceil(weapons.length / COLUMNS);

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 4,
  });

  return (
    <div
      ref={parentRef}
      className={cn("max-h-[calc(100vh-10rem)] overflow-auto", className)}
    >
      <div
        className="relative w-full"
        style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const start = virtualRow.index * COLUMNS;
          const rowItems = weapons.slice(start, start + COLUMNS);
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
              {rowItems.map((weapon) => renderItem(weapon))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
