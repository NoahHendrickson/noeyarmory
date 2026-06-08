import type { PaletteCategory } from "@repo/ui";
import {
  collectColumnPerks,
  collectFacets,
  createPerkNameFuse,
  filterPerkNames,
  filterWeaponNames,
  type FacetOption,
  type ModOption,
  type PerkOption,
  type WeaponSummary,
} from "@repo/destiny";

import type { CustomWeaponFilter } from "../use-custom-weapon-filters";
import { CUSTOM_FILTER_CATEGORY_ID } from "./constants";

function formatExamples(labels: string[], limit = 3): string {
  return labels.slice(0, limit).join(", ");
}

function filterFacetOptions(options: FacetOption[], q: string): FacetOption[] {
  const ql = q.trim().toLowerCase();
  if (!ql) return options;
  return options.filter((o) => o.value.toLowerCase().includes(ql));
}

export function weaponNameCategory(weapons: WeaponSummary[]): PaletteCategory {
  const examples = formatExamples(weapons.slice(0, 3).map((weapon) => weapon.name));
  return {
    id: "name",
    label: "Exact Weapon",
    single: true,
    inlineSuggestions: false,
    examples,
    getValues: (q) =>
      filterWeaponNames(weapons, q).map((o) => ({
        id: o.value.toLowerCase(),
        label: o.value,
        hint: String(o.count),
        searchRank: o.searchRank,
      })),
  };
}

export function facetCategory(
  id: string,
  label: string,
  options: FacetOption[],
  config?: { omitWeakInlineMatches?: boolean },
): PaletteCategory {
  return {
    id,
    label,
    omitWeakInlineMatches: config?.omitWeakInlineMatches,
    examples: formatExamples(options.map((option) => option.value)),
    getValues: (q) =>
      filterFacetOptions(options, q).map((o) => ({
        id: o.value.toLowerCase(),
        label: o.value,
        hint: String(o.count),
      })),
  };
}

export function perkCategory(
  id: string,
  label: string,
  options: PerkOption[] | ModOption[],
  perkFuse: ReturnType<typeof createPerkNameFuse> | null = null,
): PaletteCategory {
  const names = options.map((o) => o.name);
  return {
    id,
    label,
    single: true,
    examples: formatExamples(
      options.slice(0, 2).map((option) => option.name),
      2,
    ),
    getValues: (q) => {
      const ql = q.trim();
      if (!ql) {
        return options.map((o) => ({
          id: o.name.toLowerCase(),
          label: o.name,
          hint: String(o.count),
          dimmed: "currentlyCanRoll" in o && o.currentlyCanRoll === false,
        }));
      }
      return filterPerkNames(names, ql, perkFuse, options.length).flatMap((entry) => {
        const source = options.find((o) => o.name === entry.name);
        if (!source) return [];
        return [
          {
            id: source.name.toLowerCase(),
            label: source.name,
            hint: String(source.count),
            searchRank: entry.searchRank,
            dimmed: "currentlyCanRoll" in source && source.currentlyCanRoll === false,
          },
        ];
      });
    },
  };
}

export function mergeTraitPerkOptions(cols: ReturnType<typeof collectColumnPerks>): PerkOption[] {
  const byName = new Map<string, PerkOption>();
  for (const perk of [...cols.trait1, ...cols.trait2]) {
    const key = perk.name.toLowerCase();
    const existing = byName.get(key);
    if (existing) {
      existing.count += perk.count;
      existing.currentlyCanRoll = existing.currentlyCanRoll || perk.currentlyCanRoll;
    } else {
      byName.set(key, { ...perk });
    }
  }
  return [...byName.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export function customFilterCategory(filters: CustomWeaponFilter[]): PaletteCategory {
  return {
    id: CUSTOM_FILTER_CATEGORY_ID,
    label: "Custom filters",
    examples: formatExamples(
      filters.slice(0, 2).map((filter) => filter.name),
      2,
    ),
    getValues: (q) => {
      const ql = q.trim().toLowerCase();
      const matched = ql
        ? filters.filter((filter) => filter.name.toLowerCase().includes(ql))
        : filters;
      return matched.map((filter) => ({
        id: filter.id,
        label: filter.name,
        hint: `${filter.perkNames.length} ${filter.perkNames.length === 1 ? "perk" : "perks"}`,
      }));
    },
  };
}

function allPerkNames(cols: ReturnType<typeof collectColumnPerks>): string[] {
  const names = new Set<string>();
  for (const list of [cols.trait1, cols.trait2, cols.originTrait]) {
    for (const perk of list) names.add(perk.name);
  }
  return [...names];
}

export function buildWeaponCategories(
  weapons: WeaponSummary[],
  weaponColumnPerks: ReturnType<typeof collectColumnPerks>,
  customFilters: CustomWeaponFilter[],
): PaletteCategory[] {
  const facets = collectFacets(weapons);
  const perkFuse = createPerkNameFuse(allPerkNames(weaponColumnPerks));
  return [
    perkCategory("trait1", "Trait 1", weaponColumnPerks.trait1, perkFuse),
    perkCategory("trait2", "Trait 2", weaponColumnPerks.trait2, perkFuse),
    ...(customFilters.length > 0 ? [customFilterCategory(customFilters)] : []),
    facetCategory("type", "Weapon type", facets.type ?? []),
    facetCategory("element", "Element", facets.element ?? []),
    facetCategory("slot", "Slot", facets.slot ?? []),
    facetCategory("ammo", "Ammo type", facets.ammo ?? []),
    facetCategory("frame", "Frame", facets.frame ?? [], { omitWeakInlineMatches: true }),
    facetCategory("craftable", "Craftable", facets.craftable ?? []),
    facetCategory("rarity", "Rarity", facets.rarity ?? []),
    perkCategory("originTrait", "Origin Trait", weaponColumnPerks.originTrait, perkFuse),
    weaponNameCategory(weapons),
  ];
}

export function buildComposerCategories(
  weaponColumnPerks: ReturnType<typeof collectColumnPerks>,
): PaletteCategory[] {
  const perkFuse = createPerkNameFuse(allPerkNames(weaponColumnPerks));
  return [perkCategory("trait", "Trait", mergeTraitPerkOptions(weaponColumnPerks), perkFuse)];
}
