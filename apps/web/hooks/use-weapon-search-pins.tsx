import { useCallback, useMemo } from "react";
import type { PaletteCategory, PaletteValueOption } from "@repo/ui";
import type { WeaponSummary } from "@repo/destiny";

import {
  pinnedFilterKey,
  usePinnedSearchItems,
  type PinnedFilter,
} from "../lib/use-pinned-search-items";
import { PinToggleButton } from "../components/pin-toggle-button";

interface UseWeaponSearchPinsParams {
  mode: "weapon" | "armor";
  composingCustomFilter: boolean;
  weaponCategories: PaletteCategory[];
  weaponByHash: ReadonlyMap<number, WeaponSummary>;
  addChip: (categoryId: string, option: PaletteValueOption) => void;
}

export function useWeaponSearchPins({
  mode,
  composingCustomFilter,
  weaponCategories,
  weaponByHash,
  addChip,
}: UseWeaponSearchPinsParams) {
  const {
    pinnedFilters,
    pinnedWeaponHashes,
    toggleFilter,
    removeFilter,
    toggleWeaponHash,
    removeWeaponHash,
  } = usePinnedSearchItems();

  const pinnedFilterKeys = useMemo(
    () => new Set(pinnedFilters.map((filter) => pinnedFilterKey(filter))),
    [pinnedFilters],
  );

  const pinnedWeaponHashSet = useMemo(() => new Set(pinnedWeaponHashes), [pinnedWeaponHashes]);

  const pinnedWeapons = useMemo(
    () =>
      pinnedWeaponHashes.flatMap((hash) => {
        const weapon = weaponByHash.get(hash);
        return weapon ? [weapon] : [];
      }),
    [pinnedWeaponHashes, weaponByHash],
  );

  const applyPinnedFilter = useCallback(
    (filter: PinnedFilter) => {
      if (mode !== "weapon") return;
      addChip(filter.categoryId, { id: filter.valueId, label: filter.value });
    },
    [mode, addChip],
  );

  const renderValueTrailing = useCallback(
    (categoryId: string, option: PaletteValueOption) => {
      if (mode !== "weapon" || composingCustomFilter) return null;
      const category = weaponCategories.find((candidate) => candidate.id === categoryId);
      if (!category) return null;

      const pinned = pinnedFilterKeys.has(`${categoryId}:${option.id}`);
      return (
        <PinToggleButton
          size="sm"
          pinned={pinned}
          label={`${pinned ? "Unpin" : "Pin"} ${category.label}: ${option.label}`}
          onToggle={() =>
            toggleFilter({
              categoryId,
              categoryLabel: category.label,
              value: option.label,
              valueId: option.id,
            })
          }
        />
      );
    },
    [mode, composingCustomFilter, weaponCategories, pinnedFilterKeys, toggleFilter],
  );

  return {
    pinnedFilters,
    pinnedWeapons,
    pinnedWeaponHashSet,
    applyPinnedFilter,
    removePinnedFilter: removeFilter,
    toggleWeaponHash,
    removeWeaponHash,
    renderValueTrailing,
  };
}
