"use client";

import { ListFilterPlus } from "lucide-react";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import {
  Input,
  type PaletteAction,
  type PaletteCategory,
  type PaletteChip,
  type PaletteValueOption,
} from "@repo/ui";

import {
  CUSTOM_FILTER_CATEGORY_ID,
  CUSTOM_FILTER_DRAFT_CATEGORY_ID,
  CUSTOM_FILTER_TRAIT_CATEGORY_IDS,
} from "../lib/palette/constants";
import { buildComposerCategories } from "../lib/palette/weapon-categories";
import type { CustomWeaponFilter } from "../lib/use-custom-weapon-filters";

interface CustomFilterComposerState {
  name: string;
  perkNames: string[];
}

export interface UseCustomFilterComposerParams {
  weaponColumnPerks: Parameters<typeof buildComposerCategories>[0];
  perkFuse: Parameters<typeof buildComposerCategories>[1];
  weaponCategories: PaletteCategory[];
  createFilter: (input: { name: string; perkNames: string[] }) => CustomWeaponFilter | null;
  addChip: (categoryId: string, option: PaletteValueOption) => void;
  setQuery: (query: string) => void;
  setChips: (updater: (chips: PaletteChip[]) => PaletteChip[]) => void;
}

export interface UseCustomFilterComposerResult {
  composing: boolean;
  categories: PaletteCategory[];
  draftPerkNames: string[];
  placeholder: string;
  categoryActions: PaletteAction[];
  panelHeader: ReactNode | undefined;
  hideCategoryList: boolean;
  plainPanelHeader: boolean;
  suppressPaletteChrome: boolean;
  handleAddChip: (categoryId: string, option: PaletteValueOption) => void;
  handleRemoveChip: (chipId: string) => void;
  handleClearChips: () => void;
  onBeforePaletteClose: () => void;
  onBeforeSelectRecent: () => void;
  getChipAppearanceOverride: (chip: PaletteChip) => { tone: "trait"; hideLabel: true } | undefined;
}

export function useCustomFilterComposer({
  weaponColumnPerks,
  perkFuse,
  weaponCategories,
  createFilter,
  addChip,
  setQuery,
  setChips,
}: UseCustomFilterComposerParams): UseCustomFilterComposerResult {
  const [customFilterComposer, setCustomFilterComposer] = useState<CustomFilterComposerState | null>(null);

  const composingCustomFilter = customFilterComposer != null;
  const composerCategories = useMemo(
    () => buildComposerCategories(weaponColumnPerks, perkFuse),
    [weaponColumnPerks, perkFuse],
  );
  const categories: PaletteCategory[] = composingCustomFilter ? composerCategories : weaponCategories;

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

  const panelHeader = customFilterComposer ? (
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

  const resetComposer = () => {
    setCustomFilterComposer(null);
  };

  return {
    composing: composingCustomFilter,
    categories,
    draftPerkNames: customFilterComposer?.perkNames ?? [],
    placeholder,
    categoryActions,
    panelHeader,
    hideCategoryList: composingCustomFilter,
    plainPanelHeader: composingCustomFilter,
    suppressPaletteChrome: composingCustomFilter,
    handleAddChip,
    handleRemoveChip,
    handleClearChips,
    onBeforePaletteClose: resetComposer,
    onBeforeSelectRecent: resetComposer,
    getChipAppearanceOverride: (chip) => {
      if (chip.categoryId === CUSTOM_FILTER_DRAFT_CATEGORY_ID) {
        return { tone: "trait", hideLabel: true };
      }
      return undefined;
    },
  };
}
