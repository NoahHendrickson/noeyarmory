import Fuse from "fuse.js";

import { matchRank } from "@repo/search-rank";

import type { InternedPerkColumn, PerkRef, WeaponSummary } from "./types";
import type { WeaponDpsLookup } from "./weapon-dps";

export type WeaponSort = "name" | "season-desc" | "season-asc" | "dps-desc";

/** Composite key for season ordering: season number dominates, release index breaks ties. */
function seasonSortKey(weapon: WeaponSummary): number {
  return (weapon.seasonNumber ?? 0) * 1_000_000 + (weapon.releaseIndex ?? 0);
}

/** Sort weapon results — does not mutate the input array. */
export function sortWeapons(
  weapons: WeaponSummary[],
  order: WeaponSort,
  dpsByName?: WeaponDpsLookup,
): WeaponSummary[] {
  const sorted = [...weapons];
  if (order === "name") {
    sorted.sort((a, b) => a.name.localeCompare(b.name));
    return sorted;
  }
  if (order === "dps-desc") {
    sorted.sort((a, b) => {
      const aDps = dpsByName?.get(a.name)?.dps;
      const bDps = dpsByName?.get(b.name)?.dps;
      if (aDps == null && bDps == null) return a.name.localeCompare(b.name);
      if (aDps == null) return 1;
      if (bDps == null) return -1;
      return bDps - aDps || a.name.localeCompare(b.name);
    });
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
  /** Each group is OR within; every selected custom group must match at least one perk. */
  customPerkGroups?: string[][];
  /** "Yes" = craftable at the engram table; "No" = not craftable (OR within). */
  craftable?: string[];
  /** OR within; exact case-insensitive weapon name match. */
  name?: string[];
}

const lower = (s: string) => s.toLowerCase();

function matchesFacet(value: string, selected?: string[]): boolean {
  if (!selected || selected.length === 0) return true;
  return selected.some((s) => lower(s) === lower(value));
}

function matchesCraftable(craftable: boolean, selected?: string[]): boolean {
  if (!selected || selected.length === 0) return true;
  return selected.some((s) => {
    const v = lower(s);
    if (v === "yes") return craftable;
    if (v === "no") return !craftable;
    return false;
  });
}

function traitColumns(columns: InternedPerkColumn[]): InternedPerkColumn[] {
  return columns.filter((c) => c.kind === "Trait");
}

function columnPerks(column: InternedPerkColumn | undefined, perks: PerkRef[]): PerkRef[] {
  if (!column) return [];
  return column.perkIndices
    .map((index) => perks[index])
    .filter((perk): perk is PerkRef => perk != null);
}

/** True if `column` can roll any of `names` (OR within; empty/undefined = no constraint). */
function columnCanRoll(
  column: InternedPerkColumn | undefined,
  names: string[] | undefined,
  perks: PerkRef[],
): boolean {
  if (!names || names.length === 0) return true;
  if (!column) return false;
  const rollable = new Set(columnPerks(column, perks).map((perk) => lower(perk.name)));
  return names.some((name) => rollable.has(lower(name)));
}

/** Filter weapons by attribute facets, position-aware trait columns, and required perks. */
export function filterWeapons(
  weapons: WeaponSummary[],
  filters: WeaponFilters,
  perks: PerkRef[],
): WeaponSummary[] {
  const requiredPerks = (filters.perks ?? []).map(lower);
  const customPerkGroups = (filters.customPerkGroups ?? [])
    .map((group) => group.map(lower).filter(Boolean))
    .filter((group) => group.length > 0);
  return weapons.filter((w) => {
    if (!matchesFacet(w.name, filters.name)) return false;
    if (!matchesFacet(w.element, filters.element)) return false;
    if (!matchesFacet(w.type, filters.type)) return false;
    if (!matchesFacet(w.ammo, filters.ammo)) return false;
    if (!matchesFacet(w.rarity, filters.rarity)) return false;
    if (!matchesFacet(w.slot, filters.slot)) return false;
    if (filters.frame?.length && !matchesFacet(w.frame ?? "", filters.frame)) return false;
    if (!matchesCraftable(w.craftable, filters.craftable)) return false;
    if (filters.trait1?.length || filters.trait2?.length) {
      const traits = traitColumns(w.columns);
      if (!columnCanRoll(traits[0], filters.trait1, perks)) return false;
      if (!columnCanRoll(traits[1], filters.trait2, perks)) return false;
    }
    if (
      filters.originTrait?.length &&
      !columnCanRoll(
        w.columns.find((c) => c.kind === "Origin Trait"),
        filters.originTrait,
        perks,
      )
    ) {
      return false;
    }
    if (requiredPerks.length) {
      const owned = new Set(w.perksLower);
      if (!requiredPerks.every((p) => owned.has(p))) return false;
    }
    if (customPerkGroups.length) {
      const owned = new Set(w.perksLower);
      if (!customPerkGroups.every((group) => group.some((p) => owned.has(p)))) return false;
    }
    return true;
  });
}

/** Lowercase perk name → weapons that can roll it. */
export function buildWeaponsByPerkName(
  weapons: WeaponSummary[],
): Map<string, WeaponSummary[]> {
  const map = new Map<string, WeaponSummary[]>();
  for (const weapon of weapons) {
    for (const key of weapon.perksLower) {
      const list = map.get(key);
      if (list) list.push(weapon);
      else map.set(key, [weapon]);
    }
  }
  return map;
}

/** Every weapon that can roll a given perk (by name or hash). */
export function weaponsWithPerk(
  weapons: WeaponSummary[],
  perk: string | number,
): WeaponSummary[] {
  if (typeof perk === "number") return weapons.filter((w) => w.perkHashes.includes(perk));
  const target = lower(perk);
  return weapons.filter((w) => w.perksLower.includes(target));
}

function weaponNameRank(nameLower: string, queryLower: string): number | null {
  const rank = matchRank(nameLower, queryLower);
  // Weapon names: treat word-boundary same as contains for backward compat
  return rank != null && rank <= 2 ? rank : rank === 3 ? 2 : null;
}

export interface FilteredWeaponName {
  value: string;
  count: number;
  searchRank: number;
}

/** Flat weapon-name matches for palette ranking — no sort (caller ranks). */
export function filterWeaponNames(
  weapons: WeaponSummary[],
  query: string,
): FilteredWeaponName[] {
  const ql = query.trim().toLowerCase();
  if (!ql) return [];

  const counts = new Map<string, number>();
  for (const w of weapons) {
    counts.set(w.name, (counts.get(w.name) ?? 0) + 1);
  }

  const matches: FilteredWeaponName[] = [];
  for (const [name, count] of counts) {
    const rank = weaponNameRank(name.toLowerCase(), ql);
    if (rank != null) matches.push({ value: name, count, searchRank: rank });
  }

  return matches;
}

/** Predict weapon names from a partial query — name-only, ranked best-first. */
export function suggestWeaponNames(
  weapons: WeaponSummary[],
  query: string,
  limit = 20,
): FacetOption[] {
  const ql = query.trim().toLowerCase();
  if (!ql) return [];

  const filtered = filterWeaponNames(weapons, query);
  const ranked = filtered
    .map((entry) => ({ name: entry.value, rank: entry.searchRank, count: entry.count }))
    .sort(
      (a, b) => a.rank - b.rank || a.name.localeCompare(b.name) || b.count - a.count,
    );

  return ranked.slice(0, limit).map(({ name, count }) => ({ value: name, count }));
}

/** Build a reusable Fuse index for fuzzy name/type/perk search. */
export function createWeaponFuse(weapons: WeaponSummary[]): Fuse<WeaponSummary> {
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
  weapons: WeaponSummary[],
  query: string,
  limit = 50,
): WeaponSummary[] {
  if (!query.trim()) return weapons;
  return createWeaponFuse(weapons)
    .search(query, { limit })
    .map((r) => r.item);
}

export interface FacetOption {
  value: string;
  count: number;
}

function sortFacetCounts(counts: Map<string, number>): FacetOption[] {
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

/** Distinct facet values (with counts) for building filter UIs. */
export function collectFacets(weapons: WeaponSummary[]): Record<string, FacetOption[]> {
  const element = new Map<string, number>();
  const type = new Map<string, number>();
  const ammo = new Map<string, number>();
  const rarity = new Map<string, number>();
  const slot = new Map<string, number>();
  const frame = new Map<string, number>();

  let craftableYes = 0;
  let craftableNo = 0;

  for (const w of weapons) {
    if (w.element) element.set(w.element, (element.get(w.element) ?? 0) + 1);
    if (w.type) type.set(w.type, (type.get(w.type) ?? 0) + 1);
    if (w.ammo) ammo.set(w.ammo, (ammo.get(w.ammo) ?? 0) + 1);
    if (w.rarity) rarity.set(w.rarity, (rarity.get(w.rarity) ?? 0) + 1);
    if (w.slot) slot.set(w.slot, (slot.get(w.slot) ?? 0) + 1);
    if (w.frame) frame.set(w.frame, (frame.get(w.frame) ?? 0) + 1);
    if (w.craftable) craftableYes++;
    else craftableNo++;
  }

  return {
    element: sortFacetCounts(element),
    type: sortFacetCounts(type),
    ammo: sortFacetCounts(ammo),
    rarity: sortFacetCounts(rarity),
    slot: sortFacetCounts(slot),
    frame: sortFacetCounts(frame),
    craftable: [
      { value: "Yes", count: craftableYes },
      { value: "No", count: craftableNo },
    ],
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
export function collectPerks(weapons: WeaponSummary[], perks: PerkRef[]): PerkOption[] {
  const byName = new Map<string, PerkOption>();
  for (const w of weapons) {
    const seen = new Set<string>();
    for (const column of w.columns) {
      for (const index of column.perkIndices) {
        const p = perks[index];
        if (!p) continue;
        const key = lower(p.name);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        const existing = byName.get(key);
        if (existing) existing.count += 1;
        else byName.set(key, { name: p.name, hash: p.hash, count: 1 });
      }
    }
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export interface ColumnPerkOptions {
  trait1: PerkOption[];
  trait2: PerkOption[];
  originTrait: PerkOption[];
}

/** Distinct perks per position-aware column for filter palette categories. */
export function collectColumnPerks(
  weapons: WeaponSummary[],
  perks: PerkRef[],
): ColumnPerkOptions {
  const trait1 = new Map<string, PerkOption>();
  const trait2 = new Map<string, PerkOption>();
  const originTrait = new Map<string, PerkOption>();

  const add = (bucket: Map<string, PerkOption>, columnPerks: PerkRef[]) => {
    const seen = new Set<string>();
    for (const perk of columnPerks) {
      const key = lower(perk.name);
      if (!key || seen.has(key)) continue;
      seen.add(key);
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
    const traits = traitColumns(w.columns);
    if (traits[0]) add(trait1, columnPerks(traits[0], perks));
    if (traits[1]) add(trait2, columnPerks(traits[1], perks));
    const origin = w.columns.find((c) => c.kind === "Origin Trait");
    if (origin) add(originTrait, columnPerks(origin, perks));
  }

  const sort = (m: Map<string, PerkOption>) =>
    [...m.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  return { trait1: sort(trait1), trait2: sort(trait2), originTrait: sort(originTrait) };
}

/** @deprecated Prefer buildPerkMapFromCatalog when using an interned index. */
export function buildPerkMap(weapons: { columns: { perks: PerkRef[] }[] }[]): Map<number, PerkRef> {
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
