import type { WeaponSort } from "@repo/destiny";
import type { PaletteChip } from "@repo/ui";

import type { PaletteResultsMode } from "./palette/results-mode";
import type { RecentSearchChip } from "./use-recent-searches";

export const WEAPON_SEARCH_SESSION_KEY = "noeyarmory.weaponSearchSession.v1";

export interface WeaponSearchSessionSnapshot {
  query: string;
  chips: RecentSearchChip[];
  sort: WeaponSort;
  resultsMode: PaletteResultsMode | null;
}

const WEAPON_SORTS = new Set<WeaponSort>([
  "name",
  "dps-desc",
  "ammo-gen-desc",
  "season-desc",
  "season-asc",
]);

const RESULTS_MODES = new Set<PaletteResultsMode>(["filters", "text"]);

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

function isWeaponSearchSessionSnapshot(value: unknown): value is WeaponSearchSessionSnapshot {
  if (value == null || typeof value !== "object") return false;
  const candidate = value as Partial<WeaponSearchSessionSnapshot>;
  return (
    typeof candidate.query === "string" &&
    Array.isArray(candidate.chips) &&
    candidate.chips.every(isRecentSearchChip) &&
    typeof candidate.sort === "string" &&
    WEAPON_SORTS.has(candidate.sort as WeaponSort) &&
    (candidate.resultsMode === null ||
      (typeof candidate.resultsMode === "string" &&
        RESULTS_MODES.has(candidate.resultsMode as PaletteResultsMode)))
  );
}

export function chipsToSnapshotChips(chips: PaletteChip[]): RecentSearchChip[] {
  return chips.map((chip) => ({
    categoryId: chip.categoryId,
    categoryLabel: chip.categoryLabel,
    value: chip.value,
    valueId: chip.valueId,
  }));
}

export function snapshotChipsToPaletteChips(chips: RecentSearchChip[]): PaletteChip[] {
  return chips.map((chip) => ({
    id: `${chip.categoryId}:${chip.valueId}`,
    categoryId: chip.categoryId,
    categoryLabel: chip.categoryLabel,
    value: chip.value,
    valueId: chip.valueId,
  }));
}

export function hasActiveWeaponSearch(snapshot: WeaponSearchSessionSnapshot): boolean {
  if (snapshot.chips.length > 0) return true;
  return snapshot.resultsMode === "text" && snapshot.query.trim().length > 0;
}

export function readWeaponSearchSession(
  storage: Pick<Storage, "getItem"> = typeof sessionStorage !== "undefined"
    ? sessionStorage
    : { getItem: () => null },
): WeaponSearchSessionSnapshot | null {
  try {
    const raw = storage.getItem(WEAPON_SEARCH_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!isWeaponSearchSessionSnapshot(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeWeaponSearchSession(
  snapshot: WeaponSearchSessionSnapshot,
  storage: Pick<Storage, "setItem"> = typeof sessionStorage !== "undefined"
    ? sessionStorage
    : { setItem: () => undefined },
): void {
  try {
    storage.setItem(WEAPON_SEARCH_SESSION_KEY, JSON.stringify(snapshot));
  } catch {
    // Ignore storage write failures; in-memory state still works.
  }
}
