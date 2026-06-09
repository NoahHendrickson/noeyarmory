"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "noeyarmory.pinnedSearchItems.v1";
const MAX_PINNED_FILTERS = 16;
const MAX_PINNED_WEAPONS = 24;

export interface PinnedFilter {
  categoryId: string;
  categoryLabel: string;
  value: string;
  valueId: string;
}

export interface PinnedSearchItems {
  filters: PinnedFilter[];
  weaponHashes: number[];
}

export function emptyPinnedSearchItems(): PinnedSearchItems {
  return { filters: [], weaponHashes: [] };
}

export function pinnedFilterKey(filter: Pick<PinnedFilter, "categoryId" | "valueId">): string {
  return `${filter.categoryId}:${filter.valueId}`;
}

function normalizePinnedFilter(value: unknown): PinnedFilter | null {
  if (value == null || typeof value !== "object") return null;
  const candidate = value as Partial<PinnedFilter>;
  if (
    typeof candidate.categoryId !== "string" ||
    typeof candidate.categoryLabel !== "string" ||
    typeof candidate.value !== "string" ||
    typeof candidate.valueId !== "string"
  ) {
    return null;
  }

  const filter = {
    categoryId: candidate.categoryId.trim(),
    categoryLabel: candidate.categoryLabel.trim(),
    value: candidate.value.trim(),
    valueId: candidate.valueId.trim(),
  };

  if (!filter.categoryId || !filter.categoryLabel || !filter.value || !filter.valueId) return null;
  return filter;
}

function normalizeWeaponHash(value: unknown): number | null {
  if (!Number.isInteger(value) || typeof value !== "number" || value <= 0) return null;
  return value;
}

function dedupeFilters(filters: PinnedFilter[]): PinnedFilter[] {
  const seen = new Set<string>();
  const deduped: PinnedFilter[] = [];
  for (const filter of filters) {
    const key = pinnedFilterKey(filter);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(filter);
  }
  return deduped.slice(-MAX_PINNED_FILTERS);
}

function dedupeWeaponHashes(hashes: number[]): number[] {
  const seen = new Set<number>();
  const deduped: number[] = [];
  for (const hash of hashes) {
    if (seen.has(hash)) continue;
    seen.add(hash);
    deduped.push(hash);
  }
  return deduped.slice(-MAX_PINNED_WEAPONS);
}

export function normalizePinnedSearchItems(value: unknown): PinnedSearchItems {
  if (value == null || typeof value !== "object") return emptyPinnedSearchItems();
  const candidate = value as Partial<PinnedSearchItems>;

  const filters = Array.isArray(candidate.filters)
    ? candidate.filters.flatMap((filter) => {
        const normalized = normalizePinnedFilter(filter);
        return normalized ? [normalized] : [];
      })
    : [];

  const weaponHashes = Array.isArray(candidate.weaponHashes)
    ? candidate.weaponHashes.flatMap((hash) => {
        const normalized = normalizeWeaponHash(hash);
        return normalized ? [normalized] : [];
      })
    : [];

  return {
    filters: dedupeFilters(filters),
    weaponHashes: dedupeWeaponHashes(weaponHashes),
  };
}

export function hasPinnedFilter(
  filters: readonly PinnedFilter[],
  filter: Pick<PinnedFilter, "categoryId" | "valueId">,
): boolean {
  const key = pinnedFilterKey(filter);
  return filters.some((pinned) => pinnedFilterKey(pinned) === key);
}

export function togglePinnedFilter(
  items: PinnedSearchItems,
  filter: PinnedFilter,
): PinnedSearchItems {
  const normalized = normalizePinnedFilter(filter);
  if (!normalized) return items;
  const key = pinnedFilterKey(normalized);
  if (items.filters.some((pinned) => pinnedFilterKey(pinned) === key)) {
    return {
      ...items,
      filters: items.filters.filter((pinned) => pinnedFilterKey(pinned) !== key),
    };
  }
  return {
    ...items,
    filters: dedupeFilters([...items.filters, normalized]),
  };
}

export function removePinnedFilter(
  items: PinnedSearchItems,
  filter: Pick<PinnedFilter, "categoryId" | "valueId">,
): PinnedSearchItems {
  const key = pinnedFilterKey(filter);
  return {
    ...items,
    filters: items.filters.filter((pinned) => pinnedFilterKey(pinned) !== key),
  };
}

export function hasPinnedWeaponHash(hashes: readonly number[], hash: number): boolean {
  return hashes.includes(hash);
}

export function togglePinnedWeaponHash(items: PinnedSearchItems, hash: number): PinnedSearchItems {
  const normalized = normalizeWeaponHash(hash);
  if (!normalized) return items;
  if (items.weaponHashes.includes(normalized)) {
    return {
      ...items,
      weaponHashes: items.weaponHashes.filter((pinnedHash) => pinnedHash !== normalized),
    };
  }
  return {
    ...items,
    weaponHashes: dedupeWeaponHashes([...items.weaponHashes, normalized]),
  };
}

export function removePinnedWeaponHash(items: PinnedSearchItems, hash: number): PinnedSearchItems {
  return {
    ...items,
    weaponHashes: items.weaponHashes.filter((pinnedHash) => pinnedHash !== hash),
  };
}

function readStoredPinnedItems(): PinnedSearchItems {
  if (typeof window === "undefined") return emptyPinnedSearchItems();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyPinnedSearchItems();
    return normalizePinnedSearchItems(JSON.parse(raw) as unknown);
  } catch {
    return emptyPinnedSearchItems();
  }
}

function writeStoredPinnedItems(items: PinnedSearchItems): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage write failures; the in-memory state still updates.
  }
}

export function usePinnedSearchItems() {
  const [items, setItems] = useState<PinnedSearchItems>(() => emptyPinnedSearchItems());

  useEffect(() => {
    setItems(readStoredPinnedItems());
  }, []);

  const updateItems = useCallback((updater: (items: PinnedSearchItems) => PinnedSearchItems) => {
    setItems((prev) => {
      const next = updater(prev);
      writeStoredPinnedItems(next);
      return next;
    });
  }, []);

  const toggleFilter = useCallback(
    (filter: PinnedFilter) => updateItems((prev) => togglePinnedFilter(prev, filter)),
    [updateItems],
  );

  const removeFilter = useCallback(
    (filter: Pick<PinnedFilter, "categoryId" | "valueId">) =>
      updateItems((prev) => removePinnedFilter(prev, filter)),
    [updateItems],
  );

  const toggleWeaponHash = useCallback(
    (hash: number) => updateItems((prev) => togglePinnedWeaponHash(prev, hash)),
    [updateItems],
  );

  const removeWeaponHash = useCallback(
    (hash: number) => updateItems((prev) => removePinnedWeaponHash(prev, hash)),
    [updateItems],
  );

  return {
    pinnedFilters: items.filters,
    pinnedWeaponHashes: items.weaponHashes,
    toggleFilter,
    removeFilter,
    toggleWeaponHash,
    removeWeaponHash,
  };
}
