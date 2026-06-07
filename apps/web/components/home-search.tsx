"use client";

import dynamic from "next/dynamic";
import { ListFilterPlus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Badge,
  cn,
  CommandPalette,
  Input,
  PillSelect,
  type PaletteAction,
  type PaletteCategory,
  type PaletteChip,
  type PalettePanelState,
  type PaletteRecentItem,
  type PaletteValueOption,
  type PillSelectOption,
} from "@repo/ui";
import { collectColumnPerks, type WeaponSort } from "@repo/destiny";

import { useArmorActions } from "../hooks/use-armor-actions";
import { useArmorSearchResults } from "../hooks/use-armor-search-results";
import { useWeaponSearchResults } from "../hooks/use-weapon-search-results";
import { buildArmorCategories } from "../lib/palette/armor-categories";
import {
  ARMOR_LOGIN_URL,
  CUSTOM_FILTER_CATEGORY_ID,
  CUSTOM_FILTER_DRAFT_CATEGORY_ID,
  CUSTOM_FILTER_TRAIT_CATEGORY_IDS,
} from "../lib/palette/constants";
import { buildComposerCategories, buildWeaponCategories } from "../lib/palette/weapon-categories";
import { useOwnedArmor } from "../lib/use-owned-armor";
import { useCustomWeaponFilters } from "../lib/use-custom-weapon-filters";
import {
  filterRecentSearches,
  formatRecentSearchLabel,
  useRecentSearches,
} from "../lib/use-recent-searches";
import { useWeaponDps } from "../lib/use-weapon-dps";
import { useWeaponIconMaps } from "../lib/use-weapon-icon-maps";
import { useWeaponDetail, useWeapons } from "../lib/weapons-context";
import { getFilterChipAppearance } from "../lib/filter-chip-appearance";
import { ArmorResultRow } from "./armor-result-row";
import { PopularWeapons } from "./popular-weapons";
import { WeaponResultRow } from "./weapon-result-row";
import { trackWeaponView } from "../lib/track-weapon-view";

const loadWeaponDetailModal = () => import("./weapon-detail-modal").then((m) => m.WeaponDetailModal);

const WeaponDetailModal = dynamic(loadWeaponDetailModal, { ssr: false });

type Mode = "weapon" | "armor";

const MODES: PillSelectOption<Mode>[] = [
  { value: "weapon", label: "Weapons mode" },
  { value: "armor", label: "Armor mode" },
];

const WEAPON_SORT_OPTIONS: PillSelectOption<WeaponSort>[] = [
  { value: "name", label: "A–Z", direction: "asc" },
  { value: "dps-desc", label: "DPS", direction: "desc" },
  { value: "season-desc", label: "Newest", direction: "desc" },
  { value: "season-asc", label: "Oldest", direction: "asc" },
];

function scheduleIdle(callback: () => void): () => void {
  if (typeof requestIdleCallback !== "undefined") {
    const id = requestIdleCallback(callback);
    return () => cancelIdleCallback(id);
  }
  const id = window.setTimeout(callback, 250);
  return () => window.clearTimeout(id);
}

interface CustomFilterComposer {
  name: string;
  perkNames: string[];
}

function draftPerkChips(perkNames: string[]): PaletteChip[] {
  return perkNames.map((name) => ({
    id: `draft:${name.toLowerCase()}`,
    categoryId: CUSTOM_FILTER_DRAFT_CATEGORY_ID,
    categoryLabel: "Perk",
    value: name,
    valueId: name.toLowerCase(),
  }));
}

export function HomeSearch({
  signedIn = false,
  initialMode = "weapon",
}: {
  signedIn?: boolean;
  initialMode?: Mode;
}) {
  const { weapons, perks, isSample, byHash, preloadWeaponDetails } = useWeapons();
  const { elementIconMap, typeIconMap, ammoIconMap } = useWeaponIconMaps();
  const { dpsByName } = useWeaponDps();
  const { filters: customFilters, createFilter } = useCustomWeaponFilters();
  const { recordSearch, getRecentForMode, findById } = useRecentSearches();
  const [mode, setMode] = useState<Mode>(initialMode);
  const armorEnabled = signedIn && mode === "armor";
  const {
    armor: owned,
    loading: armorLoading,
    error: armorLoadError,
    refetch: refetchArmor,
  } = useOwnedArmor(armorEnabled);
  const { armorAction, runArmorAction, clearArmorAction } = useArmorActions(refetchArmor);

  const [query, setQuery] = useState("");
  const [chips, setChips] = useState<PaletteChip[]>([]);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [panelState, setPanelState] = useState<PalettePanelState>({
    panel: "closed",
    categoryId: null,
    valueQuery: "",
  });
  const handlePanelStateChange = useCallback((state: PalettePanelState) => {
    setPanelState(state);
  }, []);
  const [sort, setSort] = useState<WeaponSort>("season-desc");
  const [showAllResults, setShowAllResults] = useState(false);
  const [customFilterComposer, setCustomFilterComposer] = useState<CustomFilterComposer | null>(
    null,
  );
  const [selectedHash, setSelectedHash] = useState<number | null>(null);
  const { weapon: selected } = useWeaponDetail(selectedHash);

  useEffect(() => {
    if (mode !== "weapon" || weapons.length === 0) return;
    return scheduleIdle(() => {
      void loadWeaponDetailModal();
      void preloadWeaponDetails();
    });
  }, [mode, weapons.length, preloadWeaponDetails]);

  const weaponColumnPerks = useMemo(() => collectColumnPerks(weapons, perks), [weapons, perks]);

  const weaponCategories = useMemo(
    () => buildWeaponCategories(weapons, weaponColumnPerks, customFilters),
    [weapons, weaponColumnPerks, customFilters],
  );

  const armorCategories = useMemo(() => buildArmorCategories(owned), [owned]);

  const composingCustomFilter = customFilterComposer != null && mode === "weapon";

  const composerCategories = useMemo(
    () => buildComposerCategories(weaponColumnPerks),
    [weaponColumnPerks],
  );

  const categories: PaletteCategory[] = composingCustomFilter
    ? composerCategories
    : mode === "weapon"
      ? weaponCategories
      : armorCategories;

  const {
    weaponShown,
    weaponPreviewWeapons,
    resultCount: weaponResultCount,
    shownCount: weaponShownCount,
  } = useWeaponSearchResults({
    weapons,
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
  });

  const {
    armorShown,
    resultCount: armorResultCount,
    shownCount: armorShownCount,
  } = useArmorSearchResults(owned, chips, query, showAllResults);

  const resultCount = mode === "weapon" ? weaponResultCount : armorResultCount;
  const shownCount = mode === "weapon" ? weaponShownCount : armorShownCount;

  const weaponResultIds = useMemo(
    () => weaponShown.map((weapon) => String(weapon.hash)),
    [weaponShown],
  );

  const weaponPreviewIds = useMemo(
    () => weaponPreviewWeapons.map((weapon) => String(weapon.hash)),
    [weaponPreviewWeapons],
  );

  const armorResultIds = useMemo(
    () => armorShown.map((armor) => armor.instanceId),
    [armorShown],
  );

  const weaponById = useMemo(
    () => new Map(weaponShown.map((weapon) => [String(weapon.hash), weapon] as const)),
    [weaponShown],
  );

  const weaponPreviewById = useMemo(
    () =>
      new Map(weaponPreviewWeapons.map((weapon) => [String(weapon.hash), weapon] as const)),
    [weaponPreviewWeapons],
  );

  const armorById = useMemo(
    () => new Map(armorShown.map((armor) => [armor.instanceId, armor] as const)),
    [armorShown],
  );

  const renderWeaponResult = useCallback(
    (id: string) => {
      const weapon = weaponById.get(id) ?? weaponPreviewById.get(id);
      if (!weapon) return null;
      return (
        <WeaponResultRow
          weapon={weapon}
          elementIconPath={elementIconMap.get(weapon.element)}
          dps={dpsByName.get(weapon.name)}
        />
      );
    },
    [weaponById, weaponPreviewById, elementIconMap, dpsByName],
  );

  const renderArmorResult = useCallback(
    (id: string) => {
      const armor = armorById.get(id);
      if (!armor) return null;
      return (
        <ArmorResultRow
          armor={armor}
          actionState={armorAction}
          onEquip={() => void runArmorAction(armor.instanceId, "equip", "/api/armor/equip")}
          onMoveToCharacter={() =>
            void runArmorAction(armor.instanceId, "transfer", "/api/armor/transfer")
          }
        />
      );
    },
    [armorById, armorAction, runArmorAction],
  );

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
      setChips((prev) => prev.filter((c) => c.id !== chipId));
    },
    [composingCustomFilter],
  );

  const handleClearChips = useCallback(() => {
    if (composingCustomFilter) {
      setCustomFilterComposer((prev) => (prev ? { ...prev, perkNames: [] } : null));
      return;
    }
    setChips([]);
  }, [composingCustomFilter]);

  const handleCreateCustomFilter = useCallback(() => {
    if (!customFilterComposer) return;
    const name = customFilterComposer.name.trim();
    if (!name || customFilterComposer.perkNames.length === 0) return;

    const created = createFilter({ name, perkNames: customFilterComposer.perkNames });
    if (!created) return;

    const category = weaponCategories.find((c) => c.id === CUSTOM_FILTER_CATEGORY_ID);
    if (category) {
      addChip(CUSTOM_FILTER_CATEGORY_ID, { id: created.id, label: created.name });
    }
    setCustomFilterComposer(null);
    setQuery("");
  }, [customFilterComposer, createFilter, weaponCategories, addChip]);

  const canCreateCustomFilter =
    customFilterComposer != null &&
    customFilterComposer.name.trim().length > 0 &&
    customFilterComposer.perkNames.length > 0;

  const recordCurrentSearch = useCallback(() => {
    if (composingCustomFilter) return;
    if (chips.length === 0 && !query.trim()) return;
    recordSearch(
      mode,
      query,
      chips.map((chip) => ({
        categoryId: chip.categoryId,
        categoryLabel: chip.categoryLabel,
        value: chip.value,
        valueId: chip.valueId,
      })),
    );
  }, [composingCustomFilter, chips, query, mode, recordSearch]);

  const handleSelectRecent = useCallback(
    (id: string) => {
      const recent = findById(id);
      if (!recent) return;
      setCustomFilterComposer(null);
      setChips(
        recent.chips.map((chip) => ({
          id: `${chip.categoryId}:${chip.valueId}`,
          categoryId: chip.categoryId,
          categoryLabel: chip.categoryLabel,
          value: chip.value,
          valueId: chip.valueId,
        })),
      );
      setQuery(recent.query);
    },
    [findById],
  );

  const categoryActions = useMemo<PaletteAction[]>(() => {
    if (mode !== "weapon") return [];
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
        icon: <ListFilterPlus className="text-muted-foreground size-3.5 shrink-0" aria-hidden />,
        hideKeyboardHint: true,
        keepPanelOpen: true,
        onSelect: () => setCustomFilterComposer({ name: "", perkNames: [] }),
      },
    ];
  }, [mode, composingCustomFilter, canCreateCustomFilter, handleCreateCustomFilter, customFilterComposer]);

  useEffect(() => {
    setShowAllResults(false);
  }, [chips, query, mode, sort]);

  const handleModeChange = useCallback((next: Mode) => {
    setMode(next);
    setChips([]);
    setQuery("");
    clearArmorAction();
  }, [clearArmorAction]);

  const armorOverlay = !signedIn ? (
    <a href={ARMOR_LOGIN_URL} className="inline-flex">
      <Badge variant="warning">Reconnect your bungie account ↗</Badge>
    </a>
  ) : armorLoadError ? (
    <span className="text-destructive text-sm">{armorLoadError}</span>
  ) : undefined;

  const paletteChips = composingCustomFilter
    ? draftPerkChips(customFilterComposer!.perkNames)
    : chips;

  const hasFilters = paletteChips.length > 0;
  const isFiltering = query.trim().length > 0;
  const showResults = hasFilters && !isFiltering && !composingCustomFilter;

  const recentPaletteItems = useMemo<PaletteRecentItem[]>(() => {
    if (composingCustomFilter) return [];
    const recents = query.trim()
      ? filterRecentSearches(getRecentForMode(mode), query)
      : getRecentForMode(mode);
    return recents.map((search) => ({
      id: search.id,
      label: formatRecentSearchLabel(search.chips, search.query),
    }));
  }, [composingCustomFilter, getRecentForMode, mode, query]);

  const placeholder = composingCustomFilter
    ? customFilterComposer!.perkNames.length > 0
      ? "Add more perks…"
      : "Search trait perks"
    : mode === "weapon"
      ? "Search weapons, perks, or names"
      : armorLoading
        ? "Loading your armor…"
        : "Search armor by class, set, or stats";

  const weaponResults = useMemo(
    () => weaponResultIds.map((id) => ({ id })),
    [weaponResultIds],
  );

  const weaponPreviewResults = useMemo(
    () => weaponPreviewIds.map((id) => ({ id })),
    [weaponPreviewIds],
  );

  const armorResults = useMemo(
    () => armorResultIds.map((id) => ({ id })),
    [armorResultIds],
  );

  return (
    <div className="flex min-h-screen flex-col">
      <main className="mx-auto flex w-full flex-1 flex-col px-4 pt-4 sm:pt-[12vh]">
        <div
          className={cn(
            "mx-auto flex w-full max-w-[calc(100vw-2rem)] flex-col transition-opacity duration-200 ease-out motion-reduce:transition-none sm:w-fit",
            selected && "pointer-events-none opacity-0",
          )}
        >
          <div className="mb-4 flex justify-end">
            <div
              data-palette-ignore-close
              className="mr-6 flex shrink-0 cursor-pointer items-center"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <PillSelect
                aria-label="Search mode"
                options={MODES}
                value={mode}
                onValueChange={handleModeChange}
              />
            </div>
          </div>
          <CommandPalette
            className="mx-0"
            placeholder={placeholder}
            categories={categories}
            categoryActions={categoryActions}
            suspendResults={selectedHash != null}
            chips={paletteChips}
            open={paletteOpen}
            onOpenChange={(open) => {
              if (!open) {
                recordCurrentSearch();
                setCustomFilterComposer(null);
              }
              setPaletteOpen(open);
            }}
            recentItems={recentPaletteItems}
            onSelectRecent={handleSelectRecent}
            onAddChip={handleAddChip}
            onRemoveChip={handleRemoveChip}
            onClearChips={handleClearChips}
            getChipAppearance={(chip) => {
              if (chip.categoryId === CUSTOM_FILTER_DRAFT_CATEGORY_ID) {
                return { tone: "trait", hideLabel: true };
              }
              return getFilterChipAppearance(chip.categoryId, chip.value, {
                elementIcons: elementIconMap,
                weaponTypeIcons: typeIconMap,
                ammoIcons: ammoIconMap,
              });
            }}
            hideCategoryList={composingCustomFilter}
            plainPanelHeader={composingCustomFilter}
            panelHeader={
              composingCustomFilter ? (
                <div
                  className="space-y-3 py-3"
                  data-palette-ignore-close
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-white">New custom filter</p>
                    <p className="text-muted-foreground text-xs">
                      Combine different perks to create a custom filter.
                    </p>
                  </div>
                  <Input
                    id="custom-filter-name"
                    value={customFilterComposer!.name}
                    onChange={(event) =>
                      setCustomFilterComposer((prev) =>
                        prev ? { ...prev, name: event.target.value } : prev,
                      )
                    }
                    placeholder="Name your custom filter, e.g. reload perks"
                    className="h-8 rounded-[8px] text-xs"
                    aria-label="Filter name"
                  />
                </div>
              ) : undefined
            }
            query={query}
            onQueryChange={setQuery}
            onPanelStateChange={handlePanelStateChange}
            showResults={showResults}
            previewResults={
              mode === "weapon" && !showResults ? weaponPreviewResults : undefined
            }
            previewSectionLabel="Results"
            results={mode === "weapon" ? weaponResults : armorResults}
            renderResult={mode === "weapon" ? renderWeaponResult : renderArmorResult}
            onSelectResult={(id) => {
              recordCurrentSearch();
              if (mode === "weapon") {
                const weapon = byHash.get(Number(id));
                if (weapon) {
                  trackWeaponView(weapon.hash, "search");
                  setSelectedHash(weapon.hash);
                }
              }
            }}
            resultsEmpty={mode === "weapon" ? "No weapons match." : "Go farm!"}
            resultsHeader={
              showResults && mode === "armor" ? (
                <div className="text-muted-foreground text-base tracking-body">
                  {resultCount} {resultCount === 1 ? "result" : "results"}
                </div>
              ) : showResults && mode === "weapon" ? (
                <div
                  data-palette-ignore-close
                  className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <span className="text-muted-foreground text-base tracking-body">
                    {resultCount} {resultCount === 1 ? "result" : "results"}
                  </span>
                  <PillSelect
                    variant="ghost"
                    aria-label="Sort weapons"
                    options={WEAPON_SORT_OPTIONS}
                    value={sort}
                    onValueChange={setSort}
                  />
                </div>
              ) : undefined
            }
            resultsFooter={
              resultCount > shownCount ? (
                <button
                  type="button"
                  data-palette-ignore-close
                  className="hover:text-foreground w-full cursor-pointer transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAllResults(true);
                  }}
                >
                  Showing {shownCount} of {resultCount}
                </button>
              ) : undefined
            }
            disabled={mode === "armor" && !signedIn}
            renderBarOverlay={mode === "armor" ? armorOverlay : undefined}
          />
        </div>

        {mode === "weapon" && !hasFilters && !isFiltering && selectedHash == null && (
          <PopularWeapons
            onSelectWeapon={(hash) => {
              trackWeaponView(hash, "popular");
              setSelectedHash(hash);
            }}
          />
        )}

        {mode === "weapon" && !hasFilters && !isFiltering && isSample && (
          <p className="text-muted-foreground mt-3 text-center text-xs">
            Sample data — run <code>pnpm setup:bungie</code> for the full index.
          </p>
        )}

        {mode === "armor" && signedIn && armorLoading && (
          <p className="text-muted-foreground mt-3 text-center text-xs">Loading your armor…</p>
        )}

        {mode === "armor" && signedIn && !armorLoading && !armorLoadError && owned.length === 0 && (
          <p className="text-muted-foreground mt-3 text-center text-xs">
            No armor found — run <code>pnpm setup:bungie</code> to generate the armor index.
          </p>
        )}
      </main>

      {selectedHash != null && (
        <WeaponDetailModal
          open
          weapon={selected ?? null}
          highlightedBuildPerks={selected ? dpsByName.get(selected.name)?.buildPerks : undefined}
          onClose={() => setSelectedHash(null)}
        />
      )}
    </div>
  );
}

/** @deprecated Use HomeSearch */
export const WeaponSearch = HomeSearch;
