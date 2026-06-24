"use client";

import { ListFilterPlus } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  cn,
  CommandPalette,
  Input,
  PillSelect,
  type PaletteAction,
  type PaletteCategory,
  type PaletteSize,
  type PaletteValueOption,
  type PillSelectOption,
} from "@repo/ui";
import {
  collectColumnPerks,
  collectDamagePerkNames,
  collectFacets,
  createPerkNameFuse,
  type WeaponSort,
  type WeaponSummary,
} from "@repo/destiny";

import { useWeaponSearchPaletteState } from "../hooks/use-home-search-palette-state";
import {
  usePaletteSearchChrome,
  usePaletteSearchRecents,
} from "../hooks/use-palette-search-chrome";
import { useWeaponSearchPins } from "../hooks/use-weapon-search-pins";
import { getFilterChipAppearance } from "../lib/filter-chip-appearance";
import {
  CUSTOM_FILTER_CATEGORY_ID,
  CUSTOM_FILTER_DRAFT_CATEGORY_ID,
  CUSTOM_FILTER_TRAIT_CATEGORY_IDS,
} from "../lib/palette/constants";
import {
  allPerkNames,
  buildComposerCategories,
  buildWeaponCategories,
} from "../lib/palette/weapon-categories";
import type { PaletteResultsMode } from "../lib/palette/results-mode";
import { useCustomWeaponFilters } from "../lib/use-custom-weapon-filters";
import { useIsFirefox } from "../lib/use-is-firefox";
import { useWeaponDps } from "../lib/use-weapon-dps";
import { useWeaponIconMaps } from "../lib/use-weapon-icon-maps";
import {
  chipsToSnapshotChips,
  hasActiveWeaponSearch,
  readWeaponSearchSession,
  snapshotChipsToPaletteChips,
  writeWeaponSearchSession,
} from "../lib/weapon-search-session";
import { useWeapons } from "../lib/weapons-context";
import { PinnedFilterPills } from "./pinned-filter-pills";
import { PinnedWeaponsRail } from "./pinned-weapons-rail";
import { PopularWeapons } from "./popular-weapons";
import { WeaponResultRow } from "./weapon-result-row";

const WEAPON_SORT_OPTIONS: PillSelectOption<WeaponSort>[] = [
  { value: "name", label: "A-Z", direction: "asc" },
  { value: "dps-desc", label: "DPS", direction: "desc" },
  { value: "ammo-gen-desc", label: "Ammo gen", direction: "desc" },
  { value: "season-desc", label: "Newest", direction: "desc" },
  { value: "season-asc", label: "Oldest", direction: "asc" },
];

interface CustomFilterComposer {
  name: string;
  perkNames: string[];
}

export type WeaponSearchSelectionSource = "search" | "popular";

export function WeaponSearchPalette({
  onSelectWeapon,
  toolbarTrailing,
  showPinnedFilters = false,
  showPinnedWeapons = false,
  showPopularWeapons = false,
  showSampleNotice = false,
  className,
  toolbarClassName,
  paletteClassName,
  floatingPanel = false,
  floatingPanelClassName,
  size = "default",
  restoreSession = false,
  autoOpenRestoredSession = restoreSession,
}: {
  onSelectWeapon: (hash: number, source: WeaponSearchSelectionSource) => void;
  toolbarTrailing?: ReactNode;
  showPinnedFilters?: boolean;
  showPinnedWeapons?: boolean;
  showPopularWeapons?: boolean;
  showSampleNotice?: boolean;
  className?: string;
  toolbarClassName?: string;
  paletteClassName?: string;
  floatingPanel?: boolean;
  floatingPanelClassName?: string;
  size?: PaletteSize;
  restoreSession?: boolean;
  autoOpenRestoredSession?: boolean;
}) {
  const [restoredSession] = useState(() => (restoreSession ? readWeaponSearchSession() : null));
  const { weapons, perks, isSample, byHash, nameIndex } = useWeapons();
  const { elementIconMap, typeIconMap, ammoIconMap } = useWeaponIconMaps();
  const { dpsByName } = useWeaponDps();
  const { filters: customFilters, createFilter } = useCustomWeaponFilters();
  const paletteRecents = usePaletteSearchRecents("weapon");
  const firefoxPalettePerf = useIsFirefox();
  const [sort, setSort] = useState<WeaponSort>(() => restoredSession?.sort ?? "season-desc");
  const [showAllResults, setShowAllResults] = useState(false);
  const [resultsMode, setResultsMode] = useState<PaletteResultsMode | null>(
    () => restoredSession?.resultsMode ?? null,
  );
  const [customFilterComposer, setCustomFilterComposer] = useState<CustomFilterComposer | null>(
    null,
  );

  const weaponColumnPerks = useMemo(() => collectColumnPerks(weapons, perks), [weapons, perks]);
  const facets = useMemo(() => collectFacets(weapons), [weapons]);
  const perkFuse = useMemo(
    () => createPerkNameFuse(allPerkNames(weaponColumnPerks)),
    [weaponColumnPerks],
  );
  const damagePerkNames = useMemo(() => collectDamagePerkNames(perks), [perks]);

  const weaponCategories = useMemo(
    () =>
      buildWeaponCategories(
        weapons,
        weaponColumnPerks,
        customFilters,
        facets,
        perkFuse,
        damagePerkNames,
      ),
    [weapons, weaponColumnPerks, customFilters, facets, perkFuse, damagePerkNames],
  );

  const composingCustomFilter = customFilterComposer != null;
  const composerCategories = useMemo(
    () => buildComposerCategories(weaponColumnPerks, perkFuse),
    [weaponColumnPerks, perkFuse],
  );
  const categories: PaletteCategory[] = composingCustomFilter
    ? composerCategories
    : weaponCategories;

  const {
    query,
    setQuery,
    chips,
    setChips,
    paletteOpen,
    setPaletteOpen,
    setPreviewsReady,
    previewsReady,
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
  } = useWeaponSearchPaletteState({
    weapons,
    perks,
    customFilters,
    weaponCategories,
    categories,
    composingCustomFilter,
    draftPerkNames: customFilterComposer?.perkNames ?? [],
    sort,
    dpsByName,
    showAllResults,
    resultsMode,
    recentValues: paletteRecents.recentValues,
    recordSearch: paletteRecents.recordSearch,
    setResultsMode,
    initialState: restoredSession
      ? {
          query: restoredSession.query,
          chips: snapshotChipsToPaletteChips(restoredSession.chips),
          paletteOpen: autoOpenRestoredSession && hasActiveWeaponSearch(restoredSession),
        }
      : undefined,
  });

  const paletteChrome = usePaletteSearchChrome({
    mode: "weapon",
    recents: paletteRecents,
    query,
    chips,
    paletteChips,
    paletteOpen,
    setQuery,
    setChips,
    setPaletteOpen,
    resultsMode,
    suppressRecent: composingCustomFilter,
    suppressResults: composingCustomFilter,
    onBeforeSelectRecent: () => setCustomFilterComposer(null),
    onBeforeClose: () => setCustomFilterComposer(null),
  });

  const {
    pinnedFilters,
    pinnedWeapons,
    pinnedWeaponHashSet,
    applyPinnedFilter,
    removePinnedFilter,
    toggleWeaponHash,
    removeWeaponHash,
    renderValueTrailing,
  } = useWeaponSearchPins({
    mode: "weapon",
    composingCustomFilter,
    weaponCategories,
    weaponByHash: byHash,
    weaponNameIndex: nameIndex,
    addChip,
    setQuery,
    setPaletteOpen,
  });

  const weaponResultIds = useMemo(
    () => weaponShown.map((weapon) => String(weapon.hash)),
    [weaponShown],
  );
  const weaponPreviewIds = useMemo(
    () => weaponPreviewWeapons.map((weapon) => String(weapon.hash)),
    [weaponPreviewWeapons],
  );
  const weaponById = useMemo(
    () => new Map(weaponShown.map((weapon) => [String(weapon.hash), weapon] as const)),
    [weaponShown],
  );
  const weaponPreviewById = useMemo(
    () => new Map(weaponPreviewWeapons.map((weapon) => [String(weapon.hash), weapon] as const)),
    [weaponPreviewWeapons],
  );
  const lastWeaponPreviewByIdRef = useRef<ReadonlyMap<string, WeaponSummary>>(new Map());

  useEffect(() => {
    if (weaponPreviewById.size > 0) {
      lastWeaponPreviewByIdRef.current = weaponPreviewById;
    }
  }, [weaponPreviewById]);

  const renderWeaponResult = useCallback(
    (id: string) => {
      const weapon =
        weaponById.get(id) ?? weaponPreviewById.get(id) ?? lastWeaponPreviewByIdRef.current.get(id);
      if (!weapon) return null;
      return (
        <WeaponResultRow
          weapon={weapon}
          elementIconPath={elementIconMap.get(weapon.element)}
          dps={dpsByName.get(weapon.name)}
          pinned={pinnedWeaponHashSet.has(weapon.hash)}
          onTogglePin={() => toggleWeaponHash(weapon.hash)}
        />
      );
    },
    [
      weaponById,
      weaponPreviewById,
      elementIconMap,
      dpsByName,
      pinnedWeaponHashSet,
      toggleWeaponHash,
    ],
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
      setChips((prev) => prev.filter((chip) => chip.id !== chipId));
    },
    [composingCustomFilter, setChips],
  );

  const handleClearChips = useCallback(() => {
    if (composingCustomFilter) {
      setCustomFilterComposer((prev) => (prev ? { ...prev, perkNames: [] } : null));
      return;
    }
    setChips([]);
  }, [composingCustomFilter, setChips]);

  const handleCreateCustomFilter = useCallback(() => {
    if (!customFilterComposer) return;
    const name = customFilterComposer.name.trim();
    if (!name || customFilterComposer.perkNames.length === 0) return;

    const created = createFilter({ name, perkNames: customFilterComposer.perkNames });
    if (!created) return;

    const category = weaponCategories.find(
      (candidate) => candidate.id === CUSTOM_FILTER_CATEGORY_ID,
    );
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

  useEffect(() => {
    if (!restoreSession) return;
    writeWeaponSearchSession({
      query,
      chips: chipsToSnapshotChips(chips),
      sort,
      resultsMode,
    });
  }, [restoreSession, query, chips, sort, resultsMode]);

  useEffect(() => {
    if (!firefoxPalettePerf) return;
    const previousBrowser = document.documentElement.dataset.browser;
    document.documentElement.dataset.browser = "firefox";
    return () => {
      if (previousBrowser) {
        document.documentElement.dataset.browser = previousBrowser;
      } else {
        delete document.documentElement.dataset.browser;
      }
    };
  }, [firefoxPalettePerf]);

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

  useEffect(() => {
    setShowAllResults(false);
  }, [chips, query, sort]);

  useEffect(() => {
    if (!query.trim() || chips.length > 0) {
      setResultsMode(null);
    }
  }, [query, chips]);

  const placeholder = composingCustomFilter
    ? customFilterComposer?.perkNames.length
      ? "Add more perks..."
      : "Search trait perks"
    : "Search weapons, perks, or names";

  const weaponResults = useMemo(() => weaponResultIds.map((id) => ({ id })), [weaponResultIds]);
  const weaponPreviewResults = useMemo(
    () => weaponPreviewIds.map((id) => ({ id })),
    [weaponPreviewIds],
  );

  const { hasFilters, isFiltering, showResults } = paletteChrome;
  const showToolbar = toolbarTrailing != null || (showPinnedFilters && pinnedFilters.length > 0);

  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-[calc(100vw-2rem)] flex-col sm:w-[min(calc(100vw-2rem),calc(640px+var(--chip-count,0)*96px))]",
        className,
      )}
      style={{ "--chip-count": paletteChips.length } as CSSProperties}
    >
      {showToolbar ? (
        <div className={cn("mb-4 flex flex-wrap items-center gap-2", toolbarClassName)}>
          {showPinnedFilters && pinnedFilters.length > 0 ? (
            <PinnedFilterPills
              filters={pinnedFilters}
              onApplyFilter={applyPinnedFilter}
              onRemoveFilter={removePinnedFilter}
            />
          ) : null}
          {toolbarTrailing ? (
            <div data-palette-ignore-close className="ml-auto shrink-0">
              {toolbarTrailing}
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="flex w-full flex-col items-stretch gap-4">
        <CommandPalette
          className={cn("mx-0", paletteClassName)}
          instantPreviewExpand={firefoxPalettePerf}
          instantInputSizing={firefoxPalettePerf}
          floatingPanel={floatingPanel}
          floatingPanelClassName={floatingPanelClassName}
          size={size}
          placeholder={placeholder}
          categories={categories}
          categoryActions={categoryActions}
          {...paletteChrome.paletteProps}
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
            customFilterComposer ? (
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
          onSubmit={handleSubmit}
          onPanelStateChange={handlePanelStateChange}
          onPreviewsReadyChange={setPreviewsReady}
          renderValueTrailing={renderValueTrailing}
          ghostCompletion={paletteOpen ? ghostCompletion : undefined}
          ghostSuffix={paletteOpen ? ghostSuffixText : undefined}
          chipSuggestions={chipSuggestions}
          previewResults={previewsReady && !showResults ? weaponPreviewResults : undefined}
          previewSectionLabel="Results"
          results={weaponResults}
          renderResult={renderWeaponResult}
          onSelectResult={(id) => {
            paletteChrome.recordCurrentSearch();
            const weapon = byHash.get(Number(id));
            if (weapon) {
              setPaletteOpen(false);
              onSelectWeapon(weapon.hash, "search");
            }
          }}
          resultsEmpty="No weapons match."
          resultsHeader={
            showResults ? (
              <div data-palette-ignore-close className="flex items-center justify-between gap-3">
                <span className="text-xs tracking-body text-muted-foreground">
                  {weaponResultCount} {weaponResultCount === 1 ? "result" : "results"}
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
            weaponResultCount > weaponShownCount ? (
              <button
                type="button"
                data-palette-ignore-close
                className="w-full cursor-pointer transition-colors hover:text-foreground"
                onClick={(event) => {
                  event.stopPropagation();
                  setShowAllResults(true);
                }}
              >
                Showing {weaponShownCount} of {weaponResultCount}
              </button>
            ) : undefined
          }
        />
        {showPinnedWeapons ? (
          <PinnedWeaponsRail
            weapons={pinnedWeapons}
            onSelectWeapon={(hash) => onSelectWeapon(hash, "search")}
            onUnpinWeapon={removeWeaponHash}
          />
        ) : null}
      </div>

      {showPopularWeapons && !hasFilters && !isFiltering ? (
        <PopularWeapons onSelectWeapon={(hash) => onSelectWeapon(hash, "popular")} />
      ) : null}

      {showSampleNotice && !hasFilters && !isFiltering && isSample ? (
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Sample data - run <code>pnpm setup:bungie</code> for the full index.
        </p>
      ) : null}
    </div>
  );
}
