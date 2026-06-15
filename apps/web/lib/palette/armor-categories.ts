import type { PaletteCategory } from "@repo/ui";

import { collectActivitySourceFacets } from "@repo/destiny";

import type { OwnedArmorItem } from "../armor-types";
import { collectOwnedArmorFacets } from "../owned-armor-search";
import { activitySourceCategory, facetCategory } from "./weapon-categories";

export function buildArmorCategories(owned: OwnedArmorItem[]): PaletteCategory[] {
  const facets = collectOwnedArmorFacets(owned);
  return [
    facetCategory("classType", "Class", facets.classType ?? []),
    activitySourceCategory(collectActivitySourceFacets(owned, { includeAllKnownLabels: true })),
    facetCategory("setName", "Set bonus", facets.setName ?? []),
    facetCategory("archetype", "Archetype", facets.archetype ?? []),
    facetCategory("tertiaryStat", "Tertiary stat", facets.tertiaryStat ?? []),
    facetCategory("tunableStat", "Tunable stat", facets.tunableStat ?? []),
  ];
}
