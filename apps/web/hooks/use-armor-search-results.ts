"use client";

import { useDeferredValue, useMemo } from "react";
import type { PaletteChip } from "@repo/ui";

import type { OwnedArmorItem } from "../lib/armor-types";
import { MAX_RESULTS, MAX_SHOW_ALL } from "../lib/palette/constants";
import { chipsToArmorFilters } from "../lib/palette/weapon-filters";
import {
  filterOwnedArmor,
  searchOwnedArmor,
  sortOwnedArmor,
} from "../lib/owned-armor-search";

export function useArmorSearchResults(
  owned: OwnedArmorItem[],
  chips: PaletteChip[],
  query: string,
  showAllResults: boolean,
) {
  const armorFilters = useMemo(() => chipsToArmorFilters(chips), [chips]);
  const deferredQuery = useDeferredValue(query);

  const armorResults = useMemo(() => {
    const armorBase = deferredQuery.trim() ? searchOwnedArmor(owned, deferredQuery) : owned;
    return sortOwnedArmor(filterOwnedArmor(armorBase, armorFilters));
  }, [owned, deferredQuery, armorFilters]);

  const resultLimit = showAllResults ? MAX_SHOW_ALL : MAX_RESULTS;
  const armorShown = armorResults.slice(0, resultLimit);

  return {
    armorFilters,
    armorResults,
    armorShown,
    resultCount: armorResults.length,
    shownCount: armorShown.length,
  };
}
