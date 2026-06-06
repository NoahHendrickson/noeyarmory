import Fuse from "fuse.js";

import type { PerkColumn, PerkRef, WeaponDoc } from "./types";

export type WeaponSort = "name" | "season-desc" | "season-asc";

/** Composite key for season ordering: season number dominates, release index breaks ties. */
function seasonSortKey(weapon: WeaponDoc): number {
  return (weapon.seasonNumber ?? 0) * 1_000_000 + (weapon.releaseIndex ?? 0);
}

/** Sort weapon results — does not mutate the input array. */
export function sortWeapons(weapons: WeaponDoc[], order: WeaponSort): WeaponDoc[] {
  const sorted = [...weapons];
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

export interface WeaponFilters {
  /** OR within each facet; AND across facets. */
  element?: string[];
  type?: string[];
  ammo?: string[];
  rarity?: string[];
  frame?: string[];
  /** Equipment slot: "Kinetic" | "Energy" | "Power". */
  slot?: string[];
  /** Perk rollable in the FIRST trait column (OR within). */
  trait1?: string[];
  /** Perk rollable in the SECOND trait column (OR within). */
  trait2?: string[];
  /** Perk rollable in the origin-trait column (OR within). */
  originTrait?: string[];
  /** Weapon must be able to roll ALL of these perks in ANY column (case-insensitive). */
  perks?: string[];
}

const lower = (s: string) => s.toLowerCase();

function matchesFacet(value: string, selected?: string[]): boolean {
  if (!selected || selected.length === 0) return true;
  return selected.some((s) => lower(s) === lower(value));
}

/** The weapon's trait columns in order — index 0 = "Trait 1", index 1 = "Trait 2". */
function traitColumns(weapon: WeaponDoc): PerkColumn[] {
  return weapon.columns.filter((c) => c.kind === "Trait");
}

/** True if `column` can roll any of `names` (OR within; empty/undefined = no constraint). */
function columnCanRoll(column: PerkColumn | undefined, names?: string[]): boolean {
  if (!names || names.length === 0) return true;
  if (!column) return false;
  const rollable = new Set(column.perks.map((perk) => lower(perk.name)));
  return names.some((name) => rollable.has(lower(name)));
}

/** Filter weapons by attribute facets, position-aware trait columns, and required perks. */
export function filterWeapons(weapons: WeaponDoc[], filters: WeaponFilters): WeaponDoc[] {
  const requiredPerks = (filters.perks ?? []).map(lower);
  return weapons.filter((w) => {
    if (!matchesFacet(w.element, filters.element)) return false;
    if (!matchesFacet(w.type, filters.type)) return false;
    if (!matchesFacet(w.ammo, filters.ammo)) return false;
    if (!matchesFacet(w.rarity, filters.rarity)) return false;
    if (!matchesFacet(w.slot, filters.slot)) return false;
    if (filters.frame?.length && !matchesFacet(w.frame ?? "", filters.frame)) return false;
    if (filters.trait1?.length || filters.trait2?.length) {
      const traits = traitColumns(w);
      if (!columnCanRoll(traits[0], filters.trait1)) return false;
      if (!columnCanRoll(traits[1], filters.trait2)) return false;
    }
    if (
      filters.originTrait?.length &&
      !columnCanRoll(
        w.columns.find((c) => c.kind === "Origin Trait"),
        filters.originTrait,
      )
    ) {
      return false;
    }
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
    slot: facet((w) => w.slot),
    frame: facet((w) => w.frame),
  };
}

export interface PerkOption {
  name: string;
  hash: number;
  count: number;
  /** True if ≥1 weapon can currently roll this perk (for dimming retired perks). */
  currentlyCanRoll?: boolean;
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

export interface ColumnPerkOptions {
  /** Perks available in the first trait column. */
  trait1: PerkOption[];
  /** Perks available in the second trait column. */
  trait2: PerkOption[];
  /** Perks available in the origin-trait column. */
  originTrait: PerkOption[];
}

/**
 * Distinct perks per position-aware column (Trait 1, Trait 2, Origin Trait),
 * with per-column weapon counts — powers those filter categories. Each weapon is
 * counted once per perk per column; `currentlyCanRoll` is true if any occurrence
 * can currently drop.
 */
export function collectColumnPerks(weapons: WeaponDoc[]): ColumnPerkOptions {
  const trait1 = new Map<string, PerkOption>();
  const trait2 = new Map<string, PerkOption>();
  const originTrait = new Map<string, PerkOption>();

  const add = (bucket: Map<string, PerkOption>, perks: PerkRef[]) => {
    const seen = new Set<string>();
    for (const perk of perks) {
      const key = lower(perk.name);
      if (!key || seen.has(key)) continue;
      seen.add(key); // count each weapon once per perk
      const existing = bucket.get(key);
      if (existing) {
        existing.count += 1;
        existing.currentlyCanRoll = existing.currentlyCanRoll || perk.currentlyCanRoll;
      } else {
        bucket.set(key, {
          name: perk.name,
          hash: perk.hash,
          count: 1,
          currentlyCanRoll: perk.currentlyCanRoll,
        });
      }
    }
  };

  for (const w of weapons) {
    const traits = traitColumns(w);
    if (traits[0]) add(trait1, traits[0].perks);
    if (traits[1]) add(trait2, traits[1].perks);
    const origin = w.columns.find((c) => c.kind === "Origin Trait");
    if (origin) add(originTrait, origin.perks);
  }

  const sort = (m: Map<string, PerkOption>) =>
    [...m.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  return { trait1: sort(trait1), trait2: sort(trait2), originTrait: sort(originTrait) };
}

/** Map every perk plug hash to its PerkRef (for resolving instanced/owned rolls). */
export function buildPerkMap(weapons: WeaponDoc[]): Map<number, PerkRef> {
  const map = new Map<number, PerkRef>();
  for (const weapon of weapons) {
    for (const column of weapon.columns) {
      for (const perk of column.perks) {
        if (!map.has(perk.hash)) map.set(perk.hash, perk);
        for (const alt of perk.alternateHashes ?? []) {
          if (!map.has(alt)) map.set(alt, perk);
        }
      }
    }
  }
  return map;
}
