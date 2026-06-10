import uFuzzy from "@leeoniya/ufuzzy";

import { matchRank } from "@repo/search-rank";

import type { InternedPerkColumn, PerkRef, WeaponSummary } from "./types";
import type { WeaponDpsLookup } from "./weapon-dps";
import type { WeaponNameIndex } from "./weapon-name-index";
import {
  canonicalActivitySource,
  canonicalRaidSource,
  CURATED_SOURCE_LABELS,
  isCuratedActivitySource,
  isRaidSource,
  matchesWeaponSourceLowered,
  RAID_SOURCE_LABELS,
} from "./weapon-provenance";
import { isCatalogWeapon } from "./weapon-variants";

export type { WeaponNameIndex } from "./weapon-name-index";
export { buildWeaponNameIndex } from "./weapon-name-index";

/** Optional name→popularity score (higher = more sought-after) used as a ranking tiebreak. */
export type PopularityLookup = ReadonlyMap<string, number>;

/** Shared default-locale collator — far cheaper than String#localeCompare in hot sorts. */
const collator = new Intl.Collator();
const compareStrings = (a: string, b: string): number => collator.compare(a, b);

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
    sorted.sort((a, b) => compareStrings(a.name, b.name));
    return sorted;
  }
  if (order === "dps-desc") {
    sorted.sort((a, b) => {
      const aDps = dpsByName?.get(a.name)?.dps;
      const bDps = dpsByName?.get(b.name)?.dps;
      if (aDps == null && bDps == null) return compareStrings(a.name, b.name);
      if (aDps == null) return 1;
      if (bDps == null) return -1;
      return bDps - aDps || compareStrings(a.name, b.name);
    });
    return sorted;
  }
  if (order === "ammo-gen-desc") {
    sorted.sort((a, b) => {
      const aAmmoGen = a.ammoGeneration;
      const bAmmoGen = b.ammoGeneration;
      if (aAmmoGen == null && bAmmoGen == null) return compareStrings(a.name, b.name);
      if (aAmmoGen == null) return 1;
      if (bAmmoGen == null) return -1;
      return bAmmoGen - aAmmoGen || compareStrings(a.name, b.name);
    });
    return sorted;
  }
  if (order === "season-desc") {
    sorted.sort((a, b) => seasonSortKey(b) - seasonSortKey(a) || compareStrings(a.name, b.name));
    return sorted;
  }
  sorted.sort((a, b) => seasonSortKey(a) - seasonSortKey(b) || compareStrings(a.name, b.name));
  return sorted;
}

export interface WeaponFilters {
  /** OR within each facet; AND across facets. */
  element?: string[];
  type?: string[];
  ammo?: string[];
  rarity?: string[];
  frame?: string[];
  /** Acquisition source, e.g. "Root of Nightmares". */
  source?: string[];
  /** Release season name or number, e.g. "Season of the Wish" or "23". */
  season?: string[];
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

/** Lowered selected-facet values; an empty set means "no constraint". */
function loweredSet(values?: string[]): Set<string> {
  const set = new Set<string>();
  for (const value of values ?? []) set.add(lower(value));
  return set;
}

function facetMatches(value: string, wanted: Set<string>): boolean {
  return wanted.size === 0 || wanted.has(lower(value));
}

function seasonFacetValue(weapon: WeaponSummary): string | undefined {
  if (weapon.seasonName) return weapon.seasonName;
  return weapon.seasonNumber != null ? `Season ${weapon.seasonNumber}` : undefined;
}

function seasonAliases(weapon: WeaponSummary): string[] {
  return weapon.seasonNumber != null
    ? [String(weapon.seasonNumber), `Season ${weapon.seasonNumber}`]
    : [];
}

/**
 * Per-weapon rollable-perk set, memoized for the session — `filterWeapons` runs
 * per keystroke (and ~20× per keystroke for palette previews), so don't rebuild
 * the Set per weapon per call. Refreshed summaries are new objects, so stale
 * entries simply fall out of the WeakMap.
 */
const perksLowerSets = new WeakMap<WeaponSummary, Set<string>>();

function perksLowerSet(weapon: WeaponSummary): Set<string> {
  let set = perksLowerSets.get(weapon);
  if (!set) {
    set = new Set(weapon.perksLower);
    perksLowerSets.set(weapon, set);
  }
  return set;
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
  // Lowercase the (tiny) filter value lists once, not per weapon×facet.
  const nameWanted = loweredSet(filters.name);
  const elementWanted = loweredSet(filters.element);
  const typeWanted = loweredSet(filters.type);
  const ammoWanted = loweredSet(filters.ammo);
  const rarityWanted = loweredSet(filters.rarity);
  const slotWanted = loweredSet(filters.slot);
  const frameWanted = loweredSet(filters.frame);
  const seasonWanted = new Set((filters.season ?? []).map((s) => lower(s.trim())));
  const sourceActive = (filters.source?.length ?? 0) > 0;
  const sourceWanted = (filters.source ?? []).map((s) => lower(s.trim()));
  const trait1Wanted = loweredSet(filters.trait1);
  const trait2Wanted = loweredSet(filters.trait2);
  const originWanted = loweredSet(filters.originTrait);
  const craftableActive = (filters.craftable?.length ?? 0) > 0;
  let craftableYes = false;
  let craftableNo = false;
  for (const value of filters.craftable ?? []) {
    const v = lower(value);
    if (v === "yes") craftableYes = true;
    else if (v === "no") craftableNo = true;
  }
  const needsOwned = requiredPerks.length > 0 || customPerkGroups.length > 0;
  return weapons.filter((w) => {
    if (!isCatalogWeapon(w)) return false;
    if (!facetMatches(w.name, nameWanted)) return false;
    if (!facetMatches(w.element, elementWanted)) return false;
    if (!facetMatches(w.type, typeWanted)) return false;
    if (!facetMatches(w.ammo, ammoWanted)) return false;
    if (!facetMatches(w.rarity, rarityWanted)) return false;
    if (!facetMatches(w.slot, slotWanted)) return false;
    if (frameWanted.size && !frameWanted.has(lower(w.frame ?? ""))) return false;
    if (sourceActive && !matchesWeaponSourceLowered(w.source, sourceWanted)) return false;
    if (seasonWanted.size) {
      const season = seasonFacetValue(w);
      if (!season) return false;
      if (
        !seasonWanted.has(lower(season)) &&
        !seasonAliases(w).some((alias) => seasonWanted.has(lower(alias)))
      ) {
        return false;
      }
    }
    if (craftableActive && !(w.craftable ? craftableYes : craftableNo)) return false;
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
      const owned = perksLowerSet(w);
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
  if (typeof perk === "number") {
    return weapons.filter((w) => isCatalogWeapon(w) && w.perkHashes.includes(perk));
  }
  const target = lower(perk);
  return weapons.filter((w) => isCatalogWeapon(w) && w.perksLower.includes(target));
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

// One keystroke ranks the same query against the same immutable index up to 3×
// (text-query merge, result pinning, name-matched sort) — memoize the last
// answer per index. Callers never mutate the returned array (rankers copy).
const lastNameMatches = new WeakMap<
  WeaponNameIndex,
  { ql: string; matches: FilteredWeaponName[] }
>();

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

  if (index) {
    const cached = lastNameMatches.get(index);
    if (cached?.ql === ql) return cached.matches;
    const matches = rankNames(index.names, index.namesLower, index.countByName, ql);
    lastNameMatches.set(index, { ql, matches });
    return matches;
  }

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

/** Same band as palette inline chip suggestions (`scanValueSuggestions` `maxRank: 2`). */
const STRONG_WEAPON_NAME_MATCH_RANK = 2;

/**
 * True when the query matches a catalog weapon name at prefix quality or better.
 * Used to prefer live name/fuzzy preview over hypothetical perk-filter previews.
 */
export function hasStrongWeaponNameMatch(
  weapons: WeaponSummary[],
  query: string,
  index?: WeaponNameIndex,
): boolean {
  const q = query.trim();
  if (q.length < MIN_WEAPON_TEXT_QUERY_LENGTH) return false;
  return filterWeaponNames(weapons, q, index).some(
    (match) => match.searchRank <= STRONG_WEAPON_NAME_MATCH_RANK,
  );
}

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
      compareStrings(a.value, b.value),
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

/** Collect exact name hits plus fuzzy matches for a text query, deduped. */
export function weaponsMatchingTextQuery(
  weapons: WeaponSummary[],
  searcher: WeaponSearcher,
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
    const named = (
      index?.byName.get(value) ?? weapons.filter((weapon) => weapon.name === value)
    ).filter(isCatalogWeapon);
    appendUniqueWeapons(seen, merged, named);
  }

  appendUniqueWeapons(seen, merged, searcher.search(q, limit));

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
      compareStrings(a.name, b.name),
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

/** Typo-tolerant fuzzy search over weapon name/type/perk text. */
export interface WeaponSearcher {
  /** Ranked matches for `query`, deduped across fields, capped at `limit`. */
  search(query: string, limit: number): WeaponSummary[];
}

// intraMode 1 = one error per term, with every error kind enabled (they default
// to 0): substitution, transposition, omission, insertion — comparable typo
// tolerance to the old fuse.js threshold of 0.3.
const weaponFuzzy = new uFuzzy({ intraMode: 1, intraIns: 1, intraSub: 1, intraTrn: 1, intraDel: 1 });

/** Ranked haystack indices for a needle; empty when nothing matches. */
function fuzzyMatchIndices(haystack: string[], needle: string): number[] {
  // outOfOrder=1 lets multi-term queries match regardless of term order.
  const [idxs, info, order] = weaponFuzzy.search(haystack, needle, 1);
  if (!idxs) return [];
  // Over the ranking threshold uFuzzy returns the (unranked) filter result.
  if (order && info) return order.map((i) => info.idx[i]!);
  return [...idxs];
}

/**
 * Build a reusable fuzzy searcher for weapon name/type/perk text.
 *
 * Fields are searched in priority order — name, then type, then perk text,
 * then all three combined (so multi-term queries can span fields) — mirroring
 * the old fuse.js key weights (name 3×) as tiered buckets. Superseded legacy
 * twins are excluded, matching the catalog-only index that used to be shipped.
 */
export function createWeaponSearcher(weapons: WeaponSummary[]): WeaponSearcher {
  const catalog = weapons.filter(isCatalogWeapon);
  const names: string[] = [];
  const types: string[] = [];
  const perkText: string[] = [];
  const combined: string[] = [];
  for (const weapon of catalog) {
    const perks = weapon.perks.join(" ");
    names.push(weapon.name);
    types.push(weapon.type);
    perkText.push(perks);
    combined.push(`${weapon.name} ${weapon.type} ${perks}`);
  }
  const fields = [names, types, perkText, combined];

  return {
    search(query, limit) {
      const needle = query.trim();
      if (!needle) return [];
      const seen = new Set<number>();
      const matches: WeaponSummary[] = [];
      for (const haystack of fields) {
        if (matches.length >= limit) break;
        for (const index of fuzzyMatchIndices(haystack, needle)) {
          const weapon = catalog[index];
          if (!weapon || seen.has(weapon.hash)) continue;
          seen.add(weapon.hash);
          matches.push(weapon);
          if (matches.length >= limit) break;
        }
      }
      return matches;
    },
  };
}

/** Convenience fuzzy search (rebuilds the searcher each call — prefer createWeaponSearcher for UIs). */
export function fuzzySearchWeapons(
  weapons: WeaponSummary[],
  query: string,
  limit = 50,
): WeaponSummary[] {
  if (!query.trim()) return weapons;
  return createWeaponSearcher(weapons).search(query, limit);
}

export interface FacetOption {
  value: string;
  count: number;
}

function sortFacetCounts(counts: Map<string, number>): FacetOption[] {
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || compareStrings(a.value, b.value));
}

export interface CollectRaidSourceFacetsOptions {
  /** List every known raid even when the count is zero (armor vault browse). */
  includeAllRaidLabels?: boolean;
}

export interface CollectActivitySourceFacetsOptions {
  /** List every known curated activity even when the count is zero (armor vault browse). */
  includeAllKnownLabels?: boolean;
}

/** Curated source facets for the Source filter palette category. */
export function collectActivitySourceFacets(
  items: ReadonlyArray<{ source?: string }>,
  options?: CollectActivitySourceFacetsOptions,
): FacetOption[] {
  const source = new Map<string, number>();
  if (options?.includeAllKnownLabels) {
    for (const label of CURATED_SOURCE_LABELS) source.set(label, 0);
  }
  for (const item of items) {
    if (!item.source || !isCuratedActivitySource(item.source)) continue;
    const canonical = canonicalActivitySource(item.source);
    if (!canonical) continue;
    source.set(canonical, (source.get(canonical) ?? 0) + 1);
  }
  return sortFacetCounts(source);
}

/** Raid-only source facets for the Source filter palette category. */
export function collectRaidSourceFacets(
  items: ReadonlyArray<{ source?: string }>,
  options?: CollectRaidSourceFacetsOptions,
): FacetOption[] {
  const source = new Map<string, number>();
  if (options?.includeAllRaidLabels) {
    for (const label of RAID_SOURCE_LABELS) source.set(label, 0);
  }
  for (const item of items) {
    if (!item.source || !isRaidSource(item.source)) continue;
    const canonical = canonicalRaidSource(item.source);
    if (!canonical) continue;
    source.set(canonical, (source.get(canonical) ?? 0) + 1);
  }
  return sortFacetCounts(source);
}

/** Distinct facet values (with counts) for building filter UIs. */
export function collectFacets(weapons: WeaponSummary[]): Record<string, FacetOption[]> {
  const element = new Map<string, number>();
  const type = new Map<string, number>();
  const ammo = new Map<string, number>();
  const rarity = new Map<string, number>();
  const slot = new Map<string, number>();
  const frame = new Map<string, number>();
  const source = new Map<string, number>();
  const season = new Map<string, number>();

  let craftableYes = 0;
  let craftableNo = 0;

  for (const w of weapons) {
    if (!isCatalogWeapon(w)) continue;
    if (w.element) element.set(w.element, (element.get(w.element) ?? 0) + 1);
    if (w.type) type.set(w.type, (type.get(w.type) ?? 0) + 1);
    if (w.ammo) ammo.set(w.ammo, (ammo.get(w.ammo) ?? 0) + 1);
    if (w.rarity) rarity.set(w.rarity, (rarity.get(w.rarity) ?? 0) + 1);
    if (w.slot) slot.set(w.slot, (slot.get(w.slot) ?? 0) + 1);
    if (w.frame) frame.set(w.frame, (frame.get(w.frame) ?? 0) + 1);
    if (w.source) source.set(w.source, (source.get(w.source) ?? 0) + 1);
    const seasonValue = seasonFacetValue(w);
    if (seasonValue) season.set(seasonValue, (season.get(seasonValue) ?? 0) + 1);
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
    source: sortFacetCounts(source),
    season: sortFacetCounts(season),
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
  return [...byName.values()].sort((a, b) => compareStrings(a.name, b.name));
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
    [...m.values()].sort((a, b) => b.count - a.count || compareStrings(a.name, b.name));
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
