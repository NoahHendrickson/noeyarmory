"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "noeyarmory.recentSearches.v2";
const MAX_RECENT = 8;

export interface RecentSearchChip {
  categoryId: string;
  categoryLabel: string;
  value: string;
  valueId: string;
}

export interface RecentSearch {
  id: string;
  mode: "weapon" | "armor";
  query: string;
  chips: RecentSearchChip[];
  updatedAt: string;
}

function normalizeQuery(query: string): string {
  return query.trim();
}

function chipKey(chips: RecentSearchChip[]): string {
  return [...chips]
    .map((chip) => `${chip.categoryId}:${chip.valueId}`)
    .sort()
    .join("|");
}

function searchFingerprint(
  mode: "weapon" | "armor",
  query: string,
  chips: RecentSearchChip[],
): string {
  return `${mode}\0${normalizeQuery(query).toLowerCase()}\0${chipKey(chips)}`;
}

function isRecentSearchChip(value: unknown): value is RecentSearchChip {
  if (value == null || typeof value !== "object") return false;
  const candidate = value as Partial<RecentSearchChip>;
  return (
    typeof candidate.categoryId === "string" &&
    typeof candidate.categoryLabel === "string" &&
    typeof candidate.value === "string" &&
    typeof candidate.valueId === "string"
  );
}

function isRecentSearch(value: unknown): value is RecentSearch {
  if (value == null || typeof value !== "object") return false;
  const candidate = value as Partial<RecentSearch>;
  return (
    typeof candidate.id === "string" &&
    (candidate.mode === "weapon" || candidate.mode === "armor") &&
    typeof candidate.query === "string" &&
    Array.isArray(candidate.chips) &&
    candidate.chips.every(isRecentSearchChip) &&
    typeof candidate.updatedAt === "string"
  );
}

function readStoredSearches(): RecentSearch[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isRecentSearch).slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

function writeStoredSearches(searches: RecentSearch[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(searches));
  } catch {
    // Ignore storage write failures; the in-memory state still updates.
  }
}

export function formatRecentSearchLabel(chips: RecentSearchChip[], query: string): string {
  const chip = chips[0];
  if (chip) {
    return `${chip.categoryLabel}: ${chip.value}`;
  }
  const trimmedQuery = query.trim();
  return trimmedQuery || "Empty search";
}

export function createRecentSearchEntries(
  mode: "weapon" | "armor",
  query: string,
  chips: RecentSearchChip[],
  updatedAt: string = new Date().toISOString(),
): RecentSearch[] {
  const normalizedQuery = normalizeQuery(query);
  if (!normalizedQuery && chips.length === 0) return [];

  const entries: RecentSearch[] = [];

  for (const chip of chips) {
    const singleChips = [{ ...chip }];
    entries.push({
      id: searchFingerprint(mode, "", singleChips),
      mode,
      query: "",
      chips: singleChips,
      updatedAt,
    });
  }

  if (normalizedQuery) {
    entries.push({
      id: searchFingerprint(mode, normalizedQuery, []),
      mode,
      query: normalizedQuery,
      chips: [],
      updatedAt,
    });
  }

  return entries;
}

export function prependRecentSearches(
  prev: RecentSearch[],
  nextEntries: RecentSearch[],
  maxRecent: number = MAX_RECENT,
): RecentSearch[] {
  let updated = [...prev];
  for (let i = nextEntries.length - 1; i >= 0; i--) {
    const entry = nextEntries[i]!;
    const fingerprint = searchFingerprint(entry.mode, entry.query, entry.chips);
    updated = updated.filter(
      (search) => searchFingerprint(search.mode, search.query, search.chips) !== fingerprint,
    );
    updated = [{ ...entry, id: fingerprint }, ...updated];
  }
  return updated.slice(0, maxRecent);
}

export function filterRecentSearches(searches: RecentSearch[], query: string): RecentSearch[] {
  const q = query.trim().toLowerCase();
  if (!q) return searches;
  return searches.filter((search) => {
    if (search.query.toLowerCase().includes(q)) return true;
    return search.chips.some(
      (chip) =>
        chip.categoryLabel.toLowerCase().includes(q) || chip.value.toLowerCase().includes(q),
    );
  });
}

export function useRecentSearches() {
  const [searches, setSearches] = useState<RecentSearch[]>([]);

  useEffect(() => {
    setSearches(readStoredSearches());
  }, []);

  const recordSearch = useCallback(
    (mode: "weapon" | "armor", query: string, chips: RecentSearchChip[]) => {
      const entries = createRecentSearchEntries(mode, query, chips);
      if (entries.length === 0) return;

      setSearches((prev) => {
        const updated = prependRecentSearches(prev, entries);
        writeStoredSearches(updated);
        return updated;
      });
    },
    [],
  );

  const getRecentForMode = useCallback(
    (mode: "weapon" | "armor") => searches.filter((search) => search.mode === mode),
    [searches],
  );

  const findById = useCallback((id: string) => searches.find((search) => search.id === id), [searches]);

  return { recordSearch, getRecentForMode, findById };
}
