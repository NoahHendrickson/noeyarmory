"use client";

import { useCallback, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import type {
  PaletteCategory,
  PaletteChip,
  PaletteItem,
  PalettePanelState,
  PaletteValueOption,
} from "@repo/ui";
import { valueSuggestionsToChipItems } from "@repo/ui";
import type {
  PerkRef,
  WeaponDpsEntry,
  WeaponNameIndex,
  WeaponSort,
  WeaponSummary,
} from "@repo/destiny";

import type { PaletteResultsMode } from "../lib/palette/results-mode";
import type { OwnedArmorItem } from "../lib/armor-types";
import type { CustomWeaponFilter } from "../lib/use-custom-weapon-filters";
import { CUSTOM_FILTER_DRAFT_CATEGORY_ID } from "../lib/palette/constants";
import { isWeaponPerkFilterCategory } from "../lib/palette/weapon-categories";
import { trackPerkCommit } from "../lib/track-perk-commit";
import { useArmorSearchResults } from "./use-armor-search-results";
import { usePaletteGhostCompletion } from "./use-palette-ghost-completion";
import { usePaletteInlineSuggestions } from "./use-palette-inline-suggestions";
import { usePaletteSubmit } from "./use-palette-submit";
import { useWeaponSearchResults } from "./use-weapon-search-results";

function draftPerkChips(perkNames: string[]): PaletteChip[] {
  return perkNames.map((name) => ({
    id: `draft:${name.toLowerCase()}`,
    categoryId: CUSTOM_FILTER_DRAFT_CATEGORY_ID,
    categoryLabel: "Perk",
    value: name,
    valueId: name.toLowerCase(),
  }));
}

export interface UseHomeSearchPaletteStateParams {
  mode: "weapon" | "armor";
  weapons: WeaponSummary[];
  weaponNameIndex: WeaponNameIndex;
  perks: PerkRef[];
  owned: OwnedArmorItem[];
  customFilters: CustomWeaponFilter[];
  weaponCategories: PaletteCategory[];
  categories: PaletteCategory[];
  composingCustomFilter: boolean;
  draftPerkNames: string[];
  sort: WeaponSort;
  dpsByName: ReadonlyMap<string, WeaponDpsEntry>;
  showAllResults: boolean;
  resultsMode: PaletteResultsMode | null;
  recentValues: ReadonlySet<string>;
  recordSearch: (
    mode: "weapon" | "armor",
    query: string,
    chips: Array<{
      categoryId: string;
      categoryLabel: string;
      value: string;
      valueId: string;
    }>,
  ) => void;
  setResultsMode: Dispatch<SetStateAction<PaletteResultsMode | null>>;
}

export function useHomeSearchPaletteState({
  mode,
  weapons,
  weaponNameIndex,
  perks,
  owned,
  customFilters,
  weaponCategories,
  categories,
  composingCustomFilter,
  draftPerkNames,
  sort,
  dpsByName,
  showAllResults,
  resultsMode,
  recentValues,
  recordSearch,
  setResultsMode,
}: UseHomeSearchPaletteStateParams) {
  const [query, setQuery] = useState("");
  const [chips, setChips] = useState<PaletteChip[]>([]);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [previewsReady, setPreviewsReady] = useState(false);
  const [panelState, setPanelState] = useState<PalettePanelState>({
    panel: "closed",
    categoryId: null,
    valueQuery: "",
  });

  const handlePanelStateChange = useCallback((state: PalettePanelState) => {
    setPanelState(state);
  }, []);

  const addChip = useCallback(
    (categoryId: string, option: PaletteValueOption) => {
      const category = categories.find((c) => c.id === categoryId);
      if (!category) return;
      const id = `${categoryId}:${option.id}`;
      let added = false;
      setChips((prev) => {
        if (prev.some((c) => c.id === id)) return prev;
        added = true;
        return [
          ...prev,
          {
            id,
            categoryId,
            categoryLabel: category.label,
            value: option.label,
            valueId: option.id,
          },
        ];
      });
      if (added) {
        if (isWeaponPerkFilterCategory(categoryId)) {
          trackPerkCommit(option.label, "filter");
        }
        recordSearch(mode, "", [
          {
            categoryId,
            categoryLabel: category.label,
            value: option.label,
            valueId: option.id,
          },
        ]);
      }
    },
    [categories, mode, recordSearch],
  );

  const paletteChips = composingCustomFilter ? draftPerkChips(draftPerkNames) : chips;
  const suggestionScanEnabled = paletteOpen && !composingCustomFilter;

  const inlineSuggestions = usePaletteInlineSuggestions({
    enabled: suggestionScanEnabled,
    categories,
    chips: paletteChips,
    query,
    recentValues,
  });

  const chipSuggestions = useMemo<PaletteItem[] | undefined>(() => {
    if (!suggestionScanEnabled) return undefined;
    return valueSuggestionsToChipItems(inlineSuggestions, categories);
  }, [suggestionScanEnabled, inlineSuggestions, categories]);

  const {
    weaponShown,
    weaponPreviewWeapons,
    resultCount: weaponResultCount,
    shownCount: weaponShownCount,
  } = useWeaponSearchResults({
    weapons,
    weaponNameIndex,
    perks,
    chips,
    customFilters,
    query,
    panelState,
    weaponCategories,
    sort,
    dpsByName,
    showAllResults,
    composingCustomFilter,
    mode,
    resultsMode,
    paletteOpen,
    previewsEnabled: previewsReady,
    inlineSuggestions,
  });

  const {
    armorShown,
    armorPreviewItems,
    resultCount: armorResultCount,
    shownCount: armorShownCount,
  } = useArmorSearchResults({
    owned,
    chips,
    query,
    showAllResults,
    paletteOpen,
    previewsEnabled: previewsReady,
    inlineSuggestions,
  });

  const { ghostCompletion, ghostSuffix: ghostSuffixText } = usePaletteGhostCompletion({
    enabled: suggestionScanEnabled,
    query,
    mode,
    inlineSuggestions,
    weaponNameIndex,
    recentValues,
  });

  const handleSubmit = usePaletteSubmit({
    query,
    mode,
    weaponNameIndex,
    composingCustomFilter,
    addChip,
    setQuery,
    setResultsMode,
  });

  return {
    query,
    setQuery,
    chips,
    setChips,
    paletteOpen,
    setPaletteOpen,
    previewsReady,
    setPreviewsReady,
    handlePanelStateChange,
    chipSuggestions,
    ghostCompletion,
    ghostSuffixText,
    handleSubmit,
    addChip,
    paletteChips,
    weaponShown,
    weaponPreviewWeapons,
    weaponResultCount,
    weaponShownCount,
    armorShown,
    armorPreviewItems,
    armorResultCount,
    armorShownCount,
  };
}
