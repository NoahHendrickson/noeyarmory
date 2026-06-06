import Fuse from "fuse.js";

import type { WeaponDoc } from "./types";

export interface WeaponFilters {
  /** OR within each facet; AND across facets. */
  element?: string[];
  type?: string[];
  ammo?: string[];
  rarity?: string[];
  frame?: string[];
  /** Weapon must be able to roll ALL of these perks (case-insensitive names). */
  perks?: string[];
}

const lower = (s: string) => s.toLowerCase();

function matchesFacet(value: string, selected?: string[]): boolean {
  if (!selected || selected.length === 0) return true;
  return selected.some((s) => lower(s) === lower(value));
}

/** Filter weapons by attribute facets and required perks. */
export function filterWeapons(weapons: WeaponDoc[], filters: WeaponFilters): WeaponDoc[] {
  const requiredPerks = (filters.perks ?? []).map(lower);
  return weapons.filter((w) => {
    if (!matchesFacet(w.element, filters.element)) return false;
    if (!matchesFacet(w.type, filters.type)) return false;
    if (!matchesFacet(w.ammo, filters.ammo)) return false;
    if (!matchesFacet(w.rarity, filters.rarity)) return false;
    if (filters.frame?.length && !matchesFacet(w.frame ?? "", filters.frame)) return false;
    if (requiredPerks.length) {
      const owned = new Set(w.perks.map(lower));
      if (!requiredPerks.every((p) => owned.has(p))) return false;
    }
    return true;
  });
}

/** Every weapon that can roll a given perk (by name or hash). */
export function weaponsWithPerk(weapons: WeaponDoc[], perk: string | number): WeaponDoc[] {
  if (typeof perk === "number") return weapons.filter((w) => w.perkHashes.includes(perk));
  const target = lower(perk);
  return weapons.filter((w) => w.perks.some((name) => lower(name) === target));
}

/** Build a reusable Fuse index for fuzzy name/type/perk search. */
export function createWeaponFuse(weapons: WeaponDoc[]): Fuse<WeaponDoc> {
  return new Fuse(weapons, {
    keys: [
      { name: "name", weight: 3 },
      { name: "type", weight: 1 },
      { name: "perks", weight: 1 },
    ],
    threshold: 0.3,
    ignoreLocation: true,
  });
}

/** Convenience fuzzy search (rebuilds the index each call — prefer createWeaponFuse for UIs). */
export function fuzzySearchWeapons(
  weapons: WeaponDoc[],
  query: string,
  limit = 50,
): WeaponDoc[] {
  if (!query.trim()) return weapons;
  return createWeaponFuse(weapons)
    .search(query, { limit })
    .map((r) => r.item);
}

export interface FacetOption {
  value: string;
  count: number;
}

/** Distinct facet values (with counts) for building filter UIs. */
export function collectFacets(weapons: WeaponDoc[]): Record<string, FacetOption[]> {
  const facet = (select: (w: WeaponDoc) => string | undefined): FacetOption[] => {
    const counts = new Map<string, number>();
    for (const w of weapons) {
      const value = select(w);
      if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
  };
  return {
    element: facet((w) => w.element),
    type: facet((w) => w.type),
    ammo: facet((w) => w.ammo),
    rarity: facet((w) => w.rarity),
    frame: facet((w) => w.frame),
  };
}

export interface PerkOption {
  name: string;
  hash: number;
  count: number;
}

/** Distinct perks across all weapons (for autocomplete / a perk directory). */
export function collectPerks(weapons: WeaponDoc[]): PerkOption[] {
  const byName = new Map<string, PerkOption>();
  for (const w of weapons) {
    const seen = new Set<string>();
    for (const col of w.columns) {
      for (const p of col.perks) {
        const key = lower(p.name);
        if (!key || seen.has(key)) continue;
        seen.add(key); // count each weapon once per perk
        const existing = byName.get(key);
        if (existing) existing.count += 1;
        else byName.set(key, { name: p.name, hash: p.hash, count: 1 });
      }
    }
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}
