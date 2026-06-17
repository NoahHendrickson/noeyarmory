import type { PaletteCategory } from "@repo/ui";

import { collectActivitySourceFacets } from "@repo/destiny";

import type { OwnedArmorItem } from "../armor-types";
import {
  ARMOR_DUPLICATE_CATEGORY_ID,
  ARMOR_DUPLICATE_NO_LABEL,
  ARMOR_DUPLICATE_NO_VALUE_ID,
  ARMOR_DUPLICATE_YES_LABEL,
  ARMOR_DUPLICATE_YES_VALUE_ID,
} from "./constants";
import { collectOwnedArmorFacets } from "../owned-armor-search";
import { activitySourceCategory, facetCategory } from "./weapon-categories";

const DUPLICATE_OPTIONS = [
  { id: ARMOR_DUPLICATE_YES_VALUE_ID, label: ARMOR_DUPLICATE_YES_LABEL },
  { id: ARMOR_DUPLICATE_NO_VALUE_ID, label: ARMOR_DUPLICATE_NO_LABEL },
] as const;

function duplicateCategory(): PaletteCategory {
  return {
    id: ARMOR_DUPLICATE_CATEGORY_ID,
    label: "Duplicate",
    single: true,
    inlineSuggestions: false,
    getValues: (query) => {
      const q = query.trim().toLowerCase();
      if (!q) return [...DUPLICATE_OPTIONS];
      return DUPLICATE_OPTIONS.filter((option) => option.label.toLowerCase().includes(q));
    },
  };
}

export function buildArmorCategories(owned: OwnedArmorItem[]): PaletteCategory[] {
  const facets = collectOwnedArmorFacets(owned);
  return [
    duplicateCategory(),
    facetCategory("classType", "Class", facets.classType ?? []),
    activitySourceCategory(collectActivitySourceFacets(owned, { includeAllKnownLabels: true })),
    facetCategory("setName", "Set bonus", facets.setName ?? []),
    facetCategory("archetype", "Archetype", facets.archetype ?? []),
    facetCategory("tertiaryStat", "Tertiary stat", facets.tertiaryStat ?? []),
    facetCategory("tunableStat", "Tunable stat", facets.tunableStat ?? []),
  ];
}
