import Fuse from "fuse.js";

import type { ArmorDoc, PerkRef } from "./types";

export type ArmorSort = "name" | "season-desc" | "season-asc";

function seasonSortKey(armor: ArmorDoc): number {
  return (armor.seasonNumber ?? 0) * 1_000_000 + (armor.releaseIndex ?? 0);
}

export function sortArmor(armor: ArmorDoc[], order: ArmorSort): ArmorDoc[] {
  const sorted = [...armor];
  if (order === "name") {
    sorted.sort((a, b) => a.name.localeCompare(b.name));
    return sorted;
  }
  if (order === "season-desc") {
    sorted.sort((a, b) => seasonSortKey(b) - seasonSortKey(a) || a.name.localeCompare(b.name));
    return sorted;
  }
  sorted.sort((a, b) => seasonSortKey(a) - seasonSortKey(b) || a.name.localeCompare(b.name));
  return sorted;
}

export interface ArmorFilters {
  slot?: string[];
  rarity?: string[];
  classType?: string[];
  /** Armor must be able to roll ALL of these mods/perks (case-insensitive). */
  mods?: string[];
}

const lower = (s: string) => s.toLowerCase();

function matchesFacet(value: string, selected?: string[]): boolean {
  if (!selected || selected.length === 0) return true;
  return selected.some((s) => lower(s) === lower(value));
}

export function filterArmor(armor: ArmorDoc[], filters: ArmorFilters): ArmorDoc[] {
  const requiredMods = (filters.mods ?? []).map(lower);
  return armor.filter((a) => {
    if (!matchesFacet(a.slot, filters.slot)) return false;
    if (!matchesFacet(a.rarity, filters.rarity)) return false;
    if (!matchesFacet(a.classType, filters.classType)) return false;
    if (requiredMods.length) {
      const owned = new Set(a.mods.map(lower));
      if (!requiredMods.every((m) => owned.has(m))) return false;
    }
    return true;
  });
}

export function createArmorFuse(armor: ArmorDoc[]): Fuse<ArmorDoc> {
  return new Fuse(armor, {
    keys: [
      { name: "name", weight: 3 },
      { name: "slot", weight: 1 },
      { name: "mods", weight: 1 },
    ],
    threshold: 0.3,
    ignoreLocation: true,
  });
}

export function fuzzySearchArmor(armor: ArmorDoc[], query: string, limit = 50): ArmorDoc[] {
  if (!query.trim()) return armor;
  return createArmorFuse(armor)
    .search(query, { limit })
    .map((r) => r.item);
}

export interface FacetOption {
  value: string;
  count: number;
}

export function collectArmorFacets(armor: ArmorDoc[]): Record<string, FacetOption[]> {
  const facet = (select: (a: ArmorDoc) => string | undefined): FacetOption[] => {
    const counts = new Map<string, number>();
    for (const a of armor) {
      const value = select(a);
      if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
  };
  return {
    slot: facet((a) => a.slot),
    rarity: facet((a) => a.rarity),
    classType: facet((a) => a.classType),
  };
}

export interface ModOption {
  name: string;
  hash: number;
  count: number;
  currentlyCanRoll?: boolean;
}

export function collectArmorMods(armor: ArmorDoc[]): ModOption[] {
  const byName = new Map<string, ModOption>();
  for (const a of armor) {
    const seen = new Set<string>();
    for (const col of a.columns) {
      for (const p of col.perks) {
        const key = lower(p.name);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        const existing = byName.get(key);
        if (existing) {
          existing.count += 1;
          existing.currentlyCanRoll = existing.currentlyCanRoll || p.currentlyCanRoll;
        } else {
          byName.set(key, {
            name: p.name,
            hash: p.hash,
            count: 1,
            currentlyCanRoll: p.currentlyCanRoll,
          });
        }
      }
    }
  }
  return [...byName.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** Map archetype plug hashes to display names from the armor index catalog. */
export function buildArchetypeMapFromIndex(
  archetypes: { hash: number; name: string }[],
): Map<number, string> {
  return new Map(archetypes.map((a) => [a.hash, a.name]));
}

/** Map every mod/perk plug hash to its PerkRef (for resolving instanced rolls). */
export function buildModMap(armor: ArmorDoc[]): Map<number, PerkRef> {
  const map = new Map<number, PerkRef>();
  for (const piece of armor) {
    for (const column of piece.columns) {
      for (const mod of column.perks) {
        if (!map.has(mod.hash)) map.set(mod.hash, mod);
        for (const alt of mod.alternateHashes ?? []) {
          if (!map.has(alt)) map.set(alt, mod);
        }
      }
    }
  }
  return map;
}
