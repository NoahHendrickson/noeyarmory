import { useCallback, useMemo } from "react";
import type { PaletteCategory, PaletteValueOption } from "@repo/ui";
import {
  primaryCatalogWeaponForHash,
  type WeaponNameIndex,
  type WeaponSummary,
} from "@repo/destiny";

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
  weaponNameIndex: WeaponNameIndex;
  addChip: (categoryId: string, option: PaletteValueOption) => void;
  setQuery: (query: string) => void;
  setPaletteOpen: (open: boolean) => void;
}

export function useWeaponSearchPins({
  mode,
  composingCustomFilter,
  weaponCategories,
  weaponByHash,
  weaponNameIndex,
  addChip,
  setQuery,
  setPaletteOpen,
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

  const primaryHashForPinnedHash = useMemo(() => {
    const hashes = new Map<number, number>();
    for (const hash of pinnedWeaponHashes) {
      const weapon = primaryCatalogWeaponForHash(hash, weaponByHash, weaponNameIndex.byName);
      if (weapon) hashes.set(hash, weapon.hash);
    }
    return hashes;
  }, [pinnedWeaponHashes, weaponByHash, weaponNameIndex]);

  const pinnedWeaponHashSet = useMemo(
    () => new Set(primaryHashForPinnedHash.values()),
    [primaryHashForPinnedHash],
  );

  const pinnedWeapons = useMemo(() => {
    const seen = new Set<number>();
    return pinnedWeaponHashes.flatMap((hash) => {
      const weapon = primaryCatalogWeaponForHash(hash, weaponByHash, weaponNameIndex.byName);
      if (!weapon || seen.has(weapon.hash)) return [];
      seen.add(weapon.hash);
      return [weapon];
    });
  }, [pinnedWeaponHashes, weaponByHash, weaponNameIndex]);

  const removePinnedWeaponHash = useCallback(
    (hash: number) => {
      const weapon = primaryCatalogWeaponForHash(hash, weaponByHash, weaponNameIndex.byName);
      const targetHash = weapon?.hash ?? hash;
      for (const pinnedHash of pinnedWeaponHashes) {
        if ((primaryHashForPinnedHash.get(pinnedHash) ?? pinnedHash) === targetHash) {
          removeWeaponHash(pinnedHash);
        }
      }
    },
    [pinnedWeaponHashes, primaryHashForPinnedHash, removeWeaponHash, weaponByHash, weaponNameIndex],
  );

  const togglePinnedWeaponHash = useCallback(
    (hash: number) => {
      const weapon = primaryCatalogWeaponForHash(hash, weaponByHash, weaponNameIndex.byName);
      const targetHash = weapon?.hash ?? hash;
      if (pinnedWeaponHashSet.has(targetHash)) {
        removePinnedWeaponHash(targetHash);
      } else {
        toggleWeaponHash(targetHash);
      }
    },
    [pinnedWeaponHashSet, removePinnedWeaponHash, toggleWeaponHash, weaponByHash, weaponNameIndex],
  );

  const applyPinnedFilter = useCallback(
    (filter: PinnedFilter) => {
      if (mode !== "weapon") return;
      setQuery("");
      addChip(filter.categoryId, { id: filter.valueId, label: filter.value });
      setPaletteOpen(true);
    },
    [mode, addChip, setQuery, setPaletteOpen],
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
    toggleWeaponHash: togglePinnedWeaponHash,
    removeWeaponHash: removePinnedWeaponHash,
    renderValueTrailing,
  };
}
