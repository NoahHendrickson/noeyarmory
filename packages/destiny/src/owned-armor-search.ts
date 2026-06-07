import type { FacetOption } from "./search";

export interface OwnedArmorSearchItem {
  name: string;
  classType: string;
  setName?: string;
  archetype?: string;
  tertiaryStat?: string;
  tunableStat?: string;
  isArmor30?: boolean;
}

export interface OwnedArmorFilters {
  classType?: string[];
  setName?: string[];
  archetype?: string[];
  tertiaryStat?: string[];
  tunableStat?: string[];
}

const lower = (s: string) => s.toLowerCase();

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
    if (!matchesFacet(a.setName, filters.setName)) return false;
    if (!matchesFacet(a.archetype, filters.archetype)) return false;
    if (!matchesFacet(a.tertiaryStat, filters.tertiaryStat)) return false;
    if (!matchesFacet(a.tunableStat, filters.tunableStat)) return false;
    return true;
  });
}

export function searchOwnedArmor<T extends OwnedArmorSearchItem>(
  armor: T[],
  query: string,
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return armor;
  return armor.filter(
    (a) =>
      a.name.toLowerCase().includes(q) ||
      a.classType.toLowerCase().includes(q) ||
      a.setName?.toLowerCase().includes(q) ||
      a.archetype?.toLowerCase().includes(q) ||
      a.tertiaryStat?.toLowerCase().includes(q) ||
      a.tunableStat?.toLowerCase().includes(q),
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
