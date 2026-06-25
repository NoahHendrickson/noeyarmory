"use client";

import { ListFilterPlus } from "lucide-react";
import {
  useCallback,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import {
  Input,
  valueSuggestionsToChipItems,
  type PaletteAction,
  type PaletteCategory,
  type PaletteChip,
  type PaletteItem,
  type PalettePanelState,
  type PaletteValueOption,
} from "@repo/ui";
import type { PerkRef, WeaponDpsEntry, WeaponSort, WeaponSummary } from "@repo/destiny";

import type { PaletteResultsMode } from "../lib/palette/results-mode";
import type { OwnedArmorItem } from "../lib/armor-types";
import type { CustomWeaponFilter } from "../lib/use-custom-weapon-filters";
import {
  CUSTOM_FILTER_CATEGORY_ID,
  CUSTOM_FILTER_DRAFT_CATEGORY_ID,
  CUSTOM_FILTER_TRAIT_CATEGORY_IDS,
  DAMAGE_PERKS_VALUE_ID,
} from "../lib/palette/constants";
import { buildComposerCategories, isWeaponPerkFilterCategory } from "../lib/palette/weapon-categories";
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

export interface PaletteInitialState {
  query?: string;
  chips?: PaletteChip[];
  paletteOpen?: boolean;
}

type PaletteSearchMode = "weapon" | "armor";

type RecordPaletteSearch = (
  mode: PaletteSearchMode,
  query: string,
  chips: Array<{
    categoryId: string;
    categoryLabel: string;
    value: string;
    valueId: string;
  }>,
) => void;

interface UsePaletteSearchStateCoreParams {
  mode: PaletteSearchMode;
  weapons: WeaponSummary[];
  categories: PaletteCategory[];
  composingCustomFilter: boolean;
  draftPerkNames: string[];
  recentValues: ReadonlySet<string>;
  recordSearch: RecordPaletteSearch;
  setResultsMode: Dispatch<SetStateAction<PaletteResultsMode | null>>;
  initialState?: PaletteInitialState;
}

function usePaletteSearchStateCore({
  mode,
  weapons,
  categories,
  composingCustomFilter,
  draftPerkNames,
  recentValues,
  recordSearch,
  setResultsMode,
  initialState,
}: UsePaletteSearchStateCoreParams) {
  const [query, setQuery] = useState(() => initialState?.query ?? "");
  const [chips, setChips] = useState<PaletteChip[]>(() => initialState?.chips ?? []);
  const [paletteOpen, setPaletteOpen] = useState(() => initialState?.paletteOpen ?? false);
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
        // The "Damage perks" pseudo-option is not a real perk name — skip popularity tracking.
        if (isWeaponPerkFilterCategory(categoryId) && option.id !== DAMAGE_PERKS_VALUE_ID) {
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

  const { ghostCompletion, ghostSuffix: ghostSuffixText } = usePaletteGhostCompletion({
    enabled: suggestionScanEnabled,
    query,
    mode,
    inlineSuggestions,
    weapons,
    recentValues,
  });

  const handleSubmit = usePaletteSubmit({
    query,
    mode,
    weapons,
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
    panelState,
    inlineSuggestions,
  };
}

interface CustomFilterComposerState {
  name: string;
  perkNames: string[];
}

export interface UseWeaponSearchPaletteStateParams {
  weapons: WeaponSummary[];
  perks: PerkRef[];
  customFilters: CustomWeaponFilter[];
  weaponCategories: PaletteCategory[];
  weaponColumnPerks: Parameters<typeof buildComposerCategories>[0];
  perkFuse: Parameters<typeof buildComposerCategories>[1];
  createFilter: (input: { name: string; perkNames: string[] }) => CustomWeaponFilter | null;
  sort: WeaponSort;
  dpsByName: ReadonlyMap<string, WeaponDpsEntry>;
  showAllResults: boolean;
  resultsMode: PaletteResultsMode | null;
  recentValues: ReadonlySet<string>;
  recordSearch: RecordPaletteSearch;
  setResultsMode: Dispatch<SetStateAction<PaletteResultsMode | null>>;
  initialState?: PaletteInitialState;
}

export function useWeaponSearchPaletteState({
  weapons,
  perks,
  customFilters,
  weaponCategories,
  weaponColumnPerks,
  perkFuse,
  createFilter,
  sort,
  dpsByName,
  showAllResults,
  resultsMode,
  recentValues,
  recordSearch,
  setResultsMode,
  initialState,
}: UseWeaponSearchPaletteStateParams) {
  const [customFilterComposer, setCustomFilterComposer] = useState<CustomFilterComposerState | null>(
    null,
  );
  const composingCustomFilter = customFilterComposer != null;
  const composerCategories = useMemo(
    () => buildComposerCategories(weaponColumnPerks, perkFuse),
    [weaponColumnPerks, perkFuse],
  );
  const categories = composingCustomFilter ? composerCategories : weaponCategories;
  const draftPerkNames = customFilterComposer?.perkNames ?? [];

  const core = usePaletteSearchStateCore({
    mode: "weapon",
    weapons,
    categories,
    composingCustomFilter,
    draftPerkNames,
    recentValues,
    recordSearch,
    setResultsMode,
    initialState,
  });

  const { addChip, setQuery, setChips } = core;

  const addComposerPerk = useCallback((categoryId: string, option: PaletteValueOption) => {
    if (!CUSTOM_FILTER_TRAIT_CATEGORY_IDS.has(categoryId)) return;
    setCustomFilterComposer((prev) => {
      if (!prev) return prev;
      if (prev.perkNames.some((perk) => perk.toLowerCase() === option.id)) return prev;
      return { ...prev, perkNames: [...prev.perkNames, option.label] };
    });
  }, []);

  const handleAddChip = useCallback(
    (categoryId: string, option: PaletteValueOption) => {
      if (composingCustomFilter) {
        addComposerPerk(categoryId, option);
        return;
      }
      addChip(categoryId, option);
    },
    [composingCustomFilter, addComposerPerk, addChip],
  );

  const handleRemoveChip = useCallback(
    (chipId: string) => {
      if (composingCustomFilter) {
        setCustomFilterComposer((prev) => {
          if (!prev) return prev;
          const perkKey = chipId.replace(/^draft:/, "");
          return {
            ...prev,
            perkNames: prev.perkNames.filter((perk) => perk.toLowerCase() !== perkKey),
          };
        });
        return;
      }
      setChips((prev) => prev.filter((chip) => chip.id !== chipId));
    },
    [composingCustomFilter, setChips],
  );

  const handleClearChips = useCallback(() => {
    if (composingCustomFilter) {
      setCustomFilterComposer((prev) => (prev ? { ...prev, perkNames: [] } : null));
      return;
    }
    setChips(() => []);
  }, [composingCustomFilter, setChips]);

  const handleCreateCustomFilter = useCallback(() => {
    if (!customFilterComposer) return;
    const name = customFilterComposer.name.trim();
    if (!name || customFilterComposer.perkNames.length === 0) return;

    const created = createFilter({ name, perkNames: customFilterComposer.perkNames });
    if (!created) return;

    const category = weaponCategories.find((candidate) => candidate.id === CUSTOM_FILTER_CATEGORY_ID);
    if (category) {
      addChip(CUSTOM_FILTER_CATEGORY_ID, { id: created.id, label: created.name });
    }
    setCustomFilterComposer(null);
    setQuery("");
  }, [customFilterComposer, createFilter, weaponCategories, addChip, setQuery]);

  const canCreateCustomFilter =
    customFilterComposer != null &&
    customFilterComposer.name.trim().length > 0 &&
    customFilterComposer.perkNames.length > 0;

  const categoryActions = useMemo<PaletteAction[]>(() => {
    if (composingCustomFilter) {
      return [
        {
          id: "create-custom-filter-save",
          label: "Create filter",
          hint: canCreateCustomFilter ? undefined : "Add a name and at least one perk",
          variant: "primary",
          alwaysShow: true,
          keepPanelOpen: true,
          disabled: !canCreateCustomFilter,
          hideKeyboardHint: true,
          onSelect: handleCreateCustomFilter,
        },
        {
          id: "cancel-custom-filter",
          label: "Cancel",
          hint: "Discard this filter",
          alwaysShow: true,
          keepPanelOpen: true,
          hideKeyboardHint: true,
          onSelect: () => setCustomFilterComposer(null),
        },
      ];
    }
    return [
      {
        id: "create-custom-filter",
        label: "Create custom filter",
        hint: "Group perks into a reusable filter",
        icon: <ListFilterPlus className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />,
        hideKeyboardHint: true,
        keepPanelOpen: true,
        onSelect: () => setCustomFilterComposer({ name: "", perkNames: [] }),
      },
    ];
  }, [composingCustomFilter, canCreateCustomFilter, handleCreateCustomFilter]);

  const placeholder = composingCustomFilter
    ? customFilterComposer?.perkNames.length
      ? "Add more perks…"
      : "Search trait perks"
    : "Search weapons, perks, or names";

  const panelHeader: ReactNode | undefined = customFilterComposer ? (
    <div className="space-y-3 py-3" data-palette-ignore-close>
      <div className="space-y-1">
        <p className="text-sm font-medium text-white">New custom filter</p>
        <p className="text-xs text-muted-foreground">
          Combine different perks to create a custom filter.
        </p>
      </div>
      <Input
        id="custom-filter-name"
        value={customFilterComposer.name}
        onChange={(event) =>
          setCustomFilterComposer((prev) => (prev ? { ...prev, name: event.target.value } : prev))
        }
        placeholder="Name your custom filter, e.g. reload perks"
        className="h-8 rounded-[8px] text-xs"
        aria-label="Filter name"
      />
    </div>
  ) : undefined;

  const resetComposer = useCallback(() => {
    setCustomFilterComposer(null);
  }, []);

  const getChipAppearanceOverride = useCallback(
    (chip: PaletteChip) => {
      if (chip.categoryId === CUSTOM_FILTER_DRAFT_CATEGORY_ID) {
        return { tone: "trait" as const, hideLabel: true as const };
      }
      return undefined;
    },
    [],
  );

  const {
    weaponShown,
    weaponPreviewWeapons,
    resultCount: weaponResultCount,
    shownCount: weaponShownCount,
  } = useWeaponSearchResults({
    weapons,
    perks,
    chips: core.chips,
    customFilters,
    query: core.query,
    panelState: core.panelState,
    weaponCategories,
    sort,
    dpsByName,
    showAllResults,
    composingCustomFilter,
    resultsMode,
    paletteOpen: core.paletteOpen,
    previewsEnabled: core.previewsReady,
    inlineSuggestions: core.inlineSuggestions,
  });

  return {
    ...core,
    composing: composingCustomFilter,
    categories,
    placeholder,
    categoryActions,
    panelHeader,
    handleAddChip,
    handleRemoveChip,
    handleClearChips,
    onBeforePaletteClose: resetComposer,
    onBeforeSelectRecent: resetComposer,
    getChipAppearanceOverride,
    weaponShown,
    weaponPreviewWeapons,
    weaponResultCount,
    weaponShownCount,
  };
}

export interface UseArmorSearchPaletteStateParams {
  owned: OwnedArmorItem[];
  categories: PaletteCategory[];
  showAllResults: boolean;
  recentValues: ReadonlySet<string>;
  recordSearch: RecordPaletteSearch;
  setResultsMode: Dispatch<SetStateAction<PaletteResultsMode | null>>;
  initialState?: PaletteInitialState;
}

export function useArmorSearchPaletteState({
  owned,
  categories,
  showAllResults,
  recentValues,
  recordSearch,
  setResultsMode,
  initialState,
}: UseArmorSearchPaletteStateParams) {
  const core = usePaletteSearchStateCore({
    mode: "armor",
    weapons: [],
    categories,
    composingCustomFilter: false,
    draftPerkNames: [],
    recentValues,
    recordSearch,
    setResultsMode,
    initialState,
  });

  const {
    armorShown,
    armorPreviewItems,
    armorDuplicateDiffs,
    resultCount: armorResultCount,
    shownCount: armorShownCount,
  } = useArmorSearchResults({
    owned,
    chips: core.chips,
    query: core.query,
    showAllResults,
    paletteOpen: core.paletteOpen,
    previewsEnabled: core.previewsReady,
    inlineSuggestions: core.inlineSuggestions,
  });

  return {
    ...core,
    armorShown,
    armorPreviewItems,
    armorDuplicateDiffs,
    armorResultCount,
    armorShownCount,
  };
}
