import type { PaletteCategory } from "@repo/ui";

import type { OwnedArmorItem } from "../armor-types";
import { collectOwnedArmorFacets } from "../owned-armor-search";
import { facetCategory } from "./weapon-categories";

export function buildArmorCategories(owned: OwnedArmorItem[]): PaletteCategory[] {
  const facets = collectOwnedArmorFacets(owned);
  return [
    facetCategory("classType", "Class", facets.classType ?? []),
    facetCategory("setName", "Set bonus", facets.setName ?? []),
    facetCategory("archetype", "Archetype", facets.archetype ?? []),
    facetCategory("tertiaryStat", "Tertiary stat", facets.tertiaryStat ?? []),
    facetCategory("tunableStat", "Tunable stat", facets.tunableStat ?? []),
  ];
}
