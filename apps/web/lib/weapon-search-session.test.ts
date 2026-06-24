import { describe, expect, test } from "vitest";

import {
  chipsToSnapshotChips,
  hasActiveWeaponSearch,
  readWeaponSearchSession,
  snapshotChipsToPaletteChips,
  WEAPON_SEARCH_SESSION_KEY,
  writeWeaponSearchSession,
  type WeaponSearchSessionSnapshot,
} from "./weapon-search-session";
import type { RecentSearchChip } from "./use-recent-searches";

const vorpalChip: RecentSearchChip = {
  categoryId: "trait2",
  categoryLabel: "Trait 2",
  value: "Vorpal Weapon",
  valueId: "vorpal-weapon",
};

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    key(index: number) {
      return [...store.keys()][index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}

describe("weapon search session chip mappers", () => {
  test("round-trips chips through snapshot mappers", () => {
    const paletteChips = snapshotChipsToPaletteChips([vorpalChip]);

    expect(chipsToSnapshotChips(paletteChips)).toEqual([vorpalChip]);
    expect(paletteChips[0]?.id).toBe("trait2:vorpal-weapon");
  });
});

describe("hasActiveWeaponSearch", () => {
  test("treats filter chips as active", () => {
    expect(
      hasActiveWeaponSearch({
        query: "",
        chips: [vorpalChip],
        sort: "season-desc",
        resultsMode: null,
      }),
    ).toBe(true);
  });

  test("treats submitted text search as active", () => {
    expect(
      hasActiveWeaponSearch({
        query: "fate",
        chips: [],
        sort: "season-desc",
        resultsMode: "text",
      }),
    ).toBe(true);
  });

  test("treats empty search as inactive", () => {
    expect(
      hasActiveWeaponSearch({
        query: "",
        chips: [],
        sort: "season-desc",
        resultsMode: null,
      }),
    ).toBe(false);
  });
});

describe("readWeaponSearchSession / writeWeaponSearchSession", () => {
  test("round-trips a snapshot through storage", () => {
    const storage = createMemoryStorage();
    const snapshot: WeaponSearchSessionSnapshot = {
      query: "",
      chips: [vorpalChip],
      sort: "dps-desc",
      resultsMode: null,
    };

    writeWeaponSearchSession(snapshot, storage);
    expect(storage.getItem(WEAPON_SEARCH_SESSION_KEY)).not.toBeNull();
    expect(readWeaponSearchSession(storage)).toEqual(snapshot);
  });

  test("returns null for missing storage", () => {
    const storage = createMemoryStorage();
    expect(readWeaponSearchSession(storage)).toBeNull();
  });

  test("returns null for invalid JSON", () => {
    const storage = createMemoryStorage();
    storage.setItem(WEAPON_SEARCH_SESSION_KEY, "{not-json");
    expect(readWeaponSearchSession(storage)).toBeNull();
  });

  test("returns null for invalid snapshot shape", () => {
    const storage = createMemoryStorage();
    storage.setItem(
      WEAPON_SEARCH_SESSION_KEY,
      JSON.stringify({
        query: "",
        chips: [{ categoryId: "trait2" }],
        sort: "season-desc",
        resultsMode: null,
      }),
    );
    expect(readWeaponSearchSession(storage)).toBeNull();
  });

  test("returns null for invalid sort or results mode", () => {
    const storage = createMemoryStorage();
    storage.setItem(
      WEAPON_SEARCH_SESSION_KEY,
      JSON.stringify({
        query: "",
        chips: [vorpalChip],
        sort: "invalid-sort",
        resultsMode: "text",
      }),
    );
    expect(readWeaponSearchSession(storage)).toBeNull();

    storage.setItem(
      WEAPON_SEARCH_SESSION_KEY,
      JSON.stringify({
        query: "",
        chips: [vorpalChip],
        sort: "season-desc",
        resultsMode: "invalid-mode",
      }),
    );
    expect(readWeaponSearchSession(storage)).toBeNull();
  });
});
