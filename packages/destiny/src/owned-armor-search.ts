import Fuse from "fuse.js";

import { matchRank } from "@repo/search-rank";

import { matchesWeaponSource } from "./weapon-provenance";
import type { FacetOption } from "./search";

export interface OwnedArmorSearchItem {
  name: string;
  classType: string;
  /** Raid or activity source from the armor definition, e.g. "Root of Nightmares". */
  source?: string;
  setName?: string;
  archetype?: string;
  tertiaryStat?: string;
  tunableStat?: string;
  isArmor30?: boolean;
}

export interface OwnedArmorFilters {
  classType?: string[];
  source?: string[];
  setName?: string[];
  archetype?: string[];
  tertiaryStat?: string[];
  tunableStat?: string[];
}

const lower = (s: string) => s.toLowerCase();
const MIN_SEARCH_LENGTH = 2;

function matchesFacet(value: string | undefined, selected?: string[]): boolean {
  if (!selected || selected.length === 0) return true;
  if (!value) return false;
  return selected.some((s) => lower(s) === lower(value));
}

export function filterOwnedArmor<T extends OwnedArmorSearchItem>(
  armor: T[],
  filters: OwnedArmorFilters,
): T[] {
  return armor.filter((a) => {
    if (!matchesFacet(a.classType, filters.classType)) return false;
    if (!matchesWeaponSource(a.source, filters.source)) return false;
    if (!matchesFacet(a.setName, filters.setName)) return false;
    if (!matchesFacet(a.archetype, filters.archetype)) return false;
    if (!matchesFacet(a.tertiaryStat, filters.tertiaryStat)) return false;
    if (!matchesFacet(a.tunableStat, filters.tunableStat)) return false;
    return true;
  });
}

function armorSearchFields(item: OwnedArmorSearchItem): string[] {
  return [
    item.name,
    item.classType,
    item.setName ?? "",
    item.archetype ?? "",
    item.tertiaryStat ?? "",
    item.tunableStat ?? "",
  ].filter(Boolean);
}

function armorMatchScore(item: OwnedArmorSearchItem, query: string): number | null {
  let best: number | null = null;
  for (const field of armorSearchFields(item)) {
    const rank = matchRank(field, query);
    if (rank != null && (best == null || rank < best)) best = rank;
  }
  return best;
}

/** Build a reusable Fuse index for owned armor text search. */
export function createOwnedArmorFuse<T extends OwnedArmorSearchItem>(
  armor: T[],
): Fuse<T> {
  return new Fuse(armor, {
    keys: [
      { name: "name", weight: 3 },
      { name: "classType", weight: 1 },
      { name: "setName", weight: 1 },
      { name: "archetype", weight: 1 },
      { name: "tertiaryStat", weight: 1 },
      { name: "tunableStat", weight: 1 },
    ],
    threshold: 0.35,
    ignoreLocation: true,
  });
}

export function searchOwnedArmor<T extends OwnedArmorSearchItem>(
  armor: T[],
  query: string,
  armorFuse?: Fuse<T> | null,
): T[] {
  const q = query.trim();
  if (!q) return armor;
  if (q.length < MIN_SEARCH_LENGTH) {
    const ql = q.toLowerCase();
    return armor.filter((a) =>
      armorSearchFields(a).some((field) => field.toLowerCase().includes(ql)),
    );
  }

  const ranked = armor
    .map((item) => ({ item, rank: armorMatchScore(item, q) }))
    .filter((entry): entry is { item: T; rank: number } => entry.rank != null)
    .sort(
      (a, b) => a.rank - b.rank || a.item.name.localeCompare(b.item.name),
    );

  if (ranked.length > 0) {
    return ranked.map((entry) => entry.item);
  }

  if (armorFuse) {
    return armorFuse.search(q, { limit: 200 }).map((r) => r.item);
  }

  const ql = q.toLowerCase();
  return armor.filter((a) =>
    armorSearchFields(a).some((field) => field.toLowerCase().includes(ql)),
  );
}

export function sortOwnedArmor<T extends OwnedArmorSearchItem>(armor: T[]): T[] {
  return [...armor].sort((a, b) => a.name.localeCompare(b.name));
}

function facetWithField<T extends OwnedArmorSearchItem>(
  armor: T[],
  select: (a: T) => string | undefined,
  predicate: (a: T) => boolean = () => true,
): FacetOption[] {
  const counts = new Map<string, number>();
  for (const a of armor) {
    if (!predicate(a)) continue;
    const value = select(a);
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

export function collectOwnedArmorFacets<T extends OwnedArmorSearchItem>(
  armor: T[],
): Record<string, FacetOption[]> {
  const armor30 = (a: T) => a.isArmor30 === true;
  return {
    classType: facetWithField(armor, (a) => a.classType),
    setName: facetWithField(armor, (a) => a.setName, armor30),
    archetype: facetWithField(armor, (a) => a.archetype, armor30),
    tertiaryStat: facetWithField(armor, (a) => a.tertiaryStat, armor30),
    tunableStat: facetWithField(armor, (a) => a.tunableStat, armor30),
  };
}
