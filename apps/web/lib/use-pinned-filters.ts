"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "noeyarmory.pinnedFilters.v1";
const MAX_PINNED = 12;

export interface PinnedFilterChip {
  categoryId: string;
  categoryLabel: string;
  value: string;
  valueId: string;
}

export interface PinnedFilter {
  id: string;
  mode: "weapon" | "armor";
  chips: PinnedFilterChip[];
  pinnedAt: string;
}

function chipKey(chips: PinnedFilterChip[]): string {
  return [...chips]
    .map((chip) => `${chip.categoryId}:${chip.valueId}`)
    .sort()
    .join("|");
}

export function pinnedFilterFingerprint(
  mode: "weapon" | "armor",
  chips: PinnedFilterChip[],
): string {
  return `${mode}\0${chipKey(chips)}`;
}

function isPinnedFilterChip(value: unknown): value is PinnedFilterChip {
  if (value == null || typeof value !== "object") return false;
  const candidate = value as Partial<PinnedFilterChip>;
  return (
    typeof candidate.categoryId === "string" &&
    typeof candidate.categoryLabel === "string" &&
    typeof candidate.value === "string" &&
    typeof candidate.valueId === "string"
  );
}

function isPinnedFilter(value: unknown): value is PinnedFilter {
  if (value == null || typeof value !== "object") return false;
  const candidate = value as Partial<PinnedFilter>;
  return (
    typeof candidate.id === "string" &&
    (candidate.mode === "weapon" || candidate.mode === "armor") &&
    Array.isArray(candidate.chips) &&
    candidate.chips.length > 0 &&
    candidate.chips.every(isPinnedFilterChip) &&
    typeof candidate.pinnedAt === "string"
  );
}

function readStoredFilters(): PinnedFilter[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isPinnedFilter).slice(0, MAX_PINNED);
  } catch {
    return [];
  }
}

function writeStoredFilters(filters: PinnedFilter[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  } catch {
    // Ignore storage write failures; the in-memory state still updates.
  }
}

/** Human-readable label for a pinned filter combo, e.g. "Trait 1: Firefly · Trait 2: Surrounded". */
export function formatPinnedFilterLabel(chips: PinnedFilterChip[]): string {
  return chips.map((chip) => `${chip.categoryLabel}: ${chip.value}`).join(" · ");
}

export function chipsToPinnedFilterChips(
  chips: PinnedFilterChip[],
): PinnedFilterChip[] {
  return chips.map((chip) => ({ ...chip }));
}

export function isFilterPinned(
  filters: PinnedFilter[],
  mode: "weapon" | "armor",
  chips: PinnedFilterChip[],
): boolean {
  const fingerprint = pinnedFilterFingerprint(mode, chips);
  return filters.some((filter) => filter.id === fingerprint);
}

export function pinFilter(
  prev: PinnedFilter[],
  mode: "weapon" | "armor",
  chips: PinnedFilterChip[],
): PinnedFilter[] {
  if (chips.length === 0) return prev;
  const fingerprint = pinnedFilterFingerprint(mode, chips);
  const without = prev.filter((filter) => filter.id !== fingerprint);
  const entry: PinnedFilter = {
    id: fingerprint,
    mode,
    chips: chipsToPinnedFilterChips(chips),
    pinnedAt: new Date().toISOString(),
  };
  return [entry, ...without].slice(0, MAX_PINNED);
}

export function unpinFilter(prev: PinnedFilter[], id: string): PinnedFilter[] {
  return prev.filter((filter) => filter.id !== id);
}

export function usePinnedFilters() {
  const [filters, setFilters] = useState<PinnedFilter[]>([]);

  useEffect(() => {
    setFilters(readStoredFilters());
  }, []);

  const getPinnedForMode = useCallback(
    (mode: "weapon" | "armor") => filters.filter((filter) => filter.mode === mode),
    [filters],
  );

  const findById = useCallback((id: string) => filters.find((filter) => filter.id === id), [filters]);

  const isPinned = useCallback(
    (mode: "weapon" | "armor", chips: PinnedFilterChip[]) =>
      isFilterPinned(filters, mode, chips),
    [filters],
  );

  const pin = useCallback((mode: "weapon" | "armor", chips: PinnedFilterChip[]) => {
    if (chips.length === 0) return;
    setFilters((prev) => {
      const updated = pinFilter(prev, mode, chips);
      writeStoredFilters(updated);
      return updated;
    });
  }, []);

  const unpin = useCallback((id: string) => {
    setFilters((prev) => {
      const updated = unpinFilter(prev, id);
      writeStoredFilters(updated);
      return updated;
    });
  }, []);

  const togglePin = useCallback(
    (mode: "weapon" | "armor", chips: PinnedFilterChip[]) => {
      const fingerprint = pinnedFilterFingerprint(mode, chips);
      if (isFilterPinned(filters, mode, chips)) {
        unpin(fingerprint);
      } else {
        pin(mode, chips);
      }
    },
    [filters, pin, unpin],
  );

  return { getPinnedForMode, findById, isPinned, pin, unpin, togglePin };
}
