import Fuse from "fuse.js";

import { matchRank } from "@repo/search-rank";

import type { InternedPerkColumn, PerkRef, SerializedWeaponFuseIndex, WeaponSummary } from "./types";
import type { WeaponDpsLookup } from "./weapon-dps";
import type { WeaponNameIndex } from "./weapon-name-index";

export type { WeaponNameIndex } from "./weapon-name-index";
export { buildWeaponNameIndex } from "./weapon-name-index";

/** Optional name→popularity score (higher = more sought-after) used as a ranking tiebreak. */
export type PopularityLookup = ReadonlyMap<string, number>;

function popularityOf(name: string, popularity?: PopularityLookup): number {
  return popularity?.get(name.toLowerCase()) ?? 0;
}

export type WeaponSort =
  | "name"
  | "season-desc"
  | "season-asc"
  | "dps-desc"
  | "ammo-gen-desc";

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
  if (order === "ammo-gen-desc") {
    sorted.sort((a, b) => {
      const aAmmoGen = a.ammoGeneration;
      const bAmmoGen = b.ammoGeneration;
      if (aAmmoGen == null && bAmmoGen == null) return a.name.localeCompare(b.name);
      if (aAmmoGen == null) return 1;
      if (bAmmoGen == null) return -1;
      return bAmmoGen - aAmmoGen || a.name.localeCompare(b.name);
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
  /** When set, keep only adept (`true`) or non-adept (`false`) weapons. */
  adept?: boolean;
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

/**
 * True if `column` can roll any of the (already-lowercased) `wanted` names.
 * Empty `wanted` = no constraint. Avoids allocating a Set per weapon by testing
 * the column's perks against the caller-precomputed `wanted` set directly.
 */
function columnRollsAny(
  column: InternedPerkColumn | undefined,
  wanted: Set<string>,
  perks: PerkRef[],
): boolean {
  if (wanted.size === 0) return true;
  if (!column) return false;
  return column.perkIndices.some((index) => {
    const perk = perks[index];
    return perk != null && wanted.has(lower(perk.name));
  });
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
  // Lowercase the (tiny) filter name lists once, not per weapon×column.
  const trait1Wanted = new Set((filters.trait1 ?? []).map(lower));
  const trait2Wanted = new Set((filters.trait2 ?? []).map(lower));
  const originWanted = new Set((filters.originTrait ?? []).map(lower));
  const needsOwned = requiredPerks.length > 0 || customPerkGroups.length > 0;
  return weapons.filter((w) => {
    if (!matchesFacet(w.name, filters.name)) return false;
    if (!matchesFacet(w.element, filters.element)) return false;
    if (!matchesFacet(w.type, filters.type)) return false;
    if (!matchesFacet(w.ammo, filters.ammo)) return false;
    if (!matchesFacet(w.rarity, filters.rarity)) return false;
    if (!matchesFacet(w.slot, filters.slot)) return false;
    if (filters.frame?.length && !matchesFacet(w.frame ?? "", filters.frame)) return false;
    if (!matchesCraftable(w.craftable, filters.craftable)) return false;
    if (filters.adept != null && w.adept !== filters.adept) return false;
    if (trait1Wanted.size || trait2Wanted.size) {
      const traits = traitColumns(w.columns);
      if (!columnRollsAny(traits[0], trait1Wanted, perks)) return false;
      if (!columnRollsAny(traits[1], trait2Wanted, perks)) return false;
    }
    if (
      originWanted.size &&
      !columnRollsAny(w.columns.find((c) => c.kind === "Origin Trait"), originWanted, perks)
    ) {
      return false;
    }
    if (needsOwned) {
      const owned = new Set(w.perksLower);
      if (!requiredPerks.every((p) => owned.has(p))) return false;
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

function rankNames(
  names: string[],
  namesLower: string[],
  countByName: Map<string, number>,
  ql: string,
): FilteredWeaponName[] {
  const matches: FilteredWeaponName[] = [];
  for (let i = 0; i < names.length; i++) {
    const rank = weaponNameRank(namesLower[i]!, ql);
    if (rank != null) {
      const value = names[i]!;
      matches.push({ value, count: countByName.get(value) ?? 1, searchRank: rank });
    }
  }
  return matches;
}

/**
 * Flat weapon-name matches for palette ranking — no sort (caller ranks).
 *
 * Pass a prebuilt {@link WeaponNameIndex} (recommended for keystroke-rate calls)
 * to skip rebuilding the name→count map and re-lowercasing every name. Without
 * one, counts are derived inline for backward compatibility.
 */
export function filterWeaponNames(
  weapons: WeaponSummary[],
  query: string,
  index?: WeaponNameIndex,
): FilteredWeaponName[] {
  const ql = query.trim().toLowerCase();
  if (!ql) return [];

  if (index) return rankNames(index.names, index.namesLower, index.countByName, ql);

  const counts = new Map<string, number>();
  for (const w of weapons) {
    counts.set(w.name, (counts.get(w.name) ?? 0) + 1);
  }
  const names = [...counts.keys()];
  const namesLower = names.map((name) => name.toLowerCase());
  return rankNames(names, namesLower, counts, ql);
}

/** Minimum query length before text search and name-match pinning apply. */
export const MIN_WEAPON_TEXT_QUERY_LENGTH = 2;

/**
 * Canonical tie-break order for `filterWeaponNames` results across search surfaces.
 * With a {@link PopularityLookup}, popularity breaks ties before the catalog count.
 */
export function sortFilteredWeaponNames(
  matches: FilteredWeaponName[],
  popularity?: PopularityLookup,
): FilteredWeaponName[] {
  return [...matches].sort(
    (a, b) =>
      a.searchRank - b.searchRank ||
      popularityOf(b.value, popularity) - popularityOf(a.value, popularity) ||
      b.count - a.count ||
      a.value.localeCompare(b.value),
  );
}

function appendUniqueWeapons(
  seen: Set<number>,
  target: WeaponSummary[],
  list: WeaponSummary[],
): void {
  for (const weapon of list) {
    if (!seen.has(weapon.hash)) {
      seen.add(weapon.hash);
      target.push(weapon);
    }
  }
}

/** Collect exact name hits plus fuse matches for a text query, deduped. */
export function weaponsMatchingTextQuery(
  weapons: WeaponSummary[],
  fuse: Fuse<WeaponSummary>,
  query: string,
  limit: number,
  index?: WeaponNameIndex,
): WeaponSummary[] {
  const q = query.trim();
  if (q.length < MIN_WEAPON_TEXT_QUERY_LENGTH) return weapons;

  const seen = new Set<number>();
  const merged: WeaponSummary[] = [];

  const rankedNames = sortFilteredWeaponNames(filterWeaponNames(weapons, q, index));
  for (const { value } of rankedNames) {
    // O(1) expansion via the prebuilt name index; fall back to a scan otherwise.
    const named = index?.byName.get(value) ?? weapons.filter((weapon) => weapon.name === value);
    appendUniqueWeapons(seen, merged, named);
  }

  appendUniqueWeapons(
    seen,
    merged,
    fuse.search(q, { limit }).map((result) => result.item),
  );

  return merged;
}

function sortNameMatchedWeapons(
  weapons: WeaponSummary[],
  query: string,
  sort: WeaponSort,
  dpsByName?: WeaponDpsLookup,
  index?: WeaponNameIndex,
  popularity?: PopularityLookup,
): WeaponSummary[] {
  if (sort !== "name") return sortWeapons(weapons, sort, dpsByName);

  const rankByName = new Map(
    filterWeaponNames(weapons, query, index).map((match) => [match.value, match.searchRank]),
  );
  return [...weapons].sort(
    (a, b) =>
      (rankByName.get(a.name) ?? Number.MAX_SAFE_INTEGER) -
        (rankByName.get(b.name) ?? Number.MAX_SAFE_INTEGER) ||
      popularityOf(b.name, popularity) - popularityOf(a.name, popularity) ||
      a.name.localeCompare(b.name),
  );
}

/**
 * Sort weapons with exact name matches pinned above the rest; both groups respect `sort`.
 * An optional {@link PopularityLookup} breaks ties so more sought-after weapons surface first.
 */
export function rankWeaponResults(
  weapons: WeaponSummary[],
  query: string,
  sort: WeaponSort,
  dpsByName?: WeaponDpsLookup,
  index?: WeaponNameIndex,
  popularity?: PopularityLookup,
): WeaponSummary[] {
  const q = query.trim();
  if (q.length < MIN_WEAPON_TEXT_QUERY_LENGTH) {
    return sortWeapons(weapons, sort, dpsByName);
  }

  const nameMatches = new Set(filterWeaponNames(weapons, q, index).map((match) => match.value));
  const nameMatched: WeaponSummary[] = [];
  const rest: WeaponSummary[] = [];
  for (const weapon of weapons) {
    (nameMatches.has(weapon.name) ? nameMatched : rest).push(weapon);
  }

  return [
    ...sortNameMatchedWeapons(nameMatched, q, sort, dpsByName, index, popularity),
    ...sortWeapons(rest, sort, dpsByName),
  ];
}

/**
 * Predict weapon names from a partial query — name-only, ranked best-first.
 * Ties (same match rank) prefer higher popularity, then more catalog copies, then alpha.
 */
export function suggestWeaponNames(
  weapons: WeaponSummary[],
  query: string,
  limit = 20,
  index?: WeaponNameIndex,
  popularity?: PopularityLookup,
): FacetOption[] {
  const ql = query.trim().toLowerCase();
  if (!ql) return [];

  return sortFilteredWeaponNames(filterWeaponNames(weapons, query, index), popularity)
    .slice(0, limit)
    .map(({ value, count }) => ({ value, count }));
}

const WEAPON_FUSE_KEYS = [
  { name: "name", weight: 3 },
  { name: "type", weight: 1 },
  { name: "perks", weight: 1 },
];

const WEAPON_FUSE_OPTIONS = {
  keys: WEAPON_FUSE_KEYS,
  threshold: 0.3,
  ignoreLocation: true,
} as const;

/**
 * Build a reusable Fuse index for fuzzy name/type/perk search.
 *
 * Pass a `serializedIndex` (from {@link serializeWeaponFuseIndex}, e.g. emitted
 * at generate time) to skip the client-side tokenization pass on cold load.
 */
export function createWeaponFuse(
  weapons: WeaponSummary[],
  serializedIndex?: SerializedWeaponFuseIndex,
): Fuse<WeaponSummary> {
  if (serializedIndex) {
    return new Fuse(weapons, WEAPON_FUSE_OPTIONS, Fuse.parseIndex<WeaponSummary>(serializedIndex));
  }
  return new Fuse(weapons, WEAPON_FUSE_OPTIONS);
}

/** Serialize a prebuilt weapon Fuse index (shipped so clients don't rebuild it). */
export function serializeWeaponFuseIndex(weapons: WeaponSummary[]): SerializedWeaponFuseIndex {
  return Fuse.createIndex(WEAPON_FUSE_KEYS, weapons).toJSON();
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
