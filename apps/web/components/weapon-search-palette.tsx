"use client";

import { useRouter } from "next/navigation";
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
  PillSelect,
  type PaletteSize,
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
import { useHydratedWeaponSearchSession } from "../hooks/use-hydrated-weapon-search-session";
import { usePaletteResultList } from "../hooks/use-palette-result-list";
import {
  usePaletteSearchChrome,
  usePaletteSearchRecents,
} from "../hooks/use-palette-search-chrome";
import { useWeaponSearchPins } from "../hooks/use-weapon-search-pins";
import { getFilterChipAppearance } from "../lib/filter-chip-appearance";
import { allPerkNames, buildWeaponCategories } from "../lib/palette/weapon-categories";
import type { PaletteResultsMode } from "../lib/palette/results-mode";
import { useCustomWeaponFilters } from "../lib/use-custom-weapon-filters";
import { useIsFirefox } from "../lib/use-is-firefox";
import { useWeaponDps } from "../lib/use-weapon-dps";
import { useWeaponIconMaps } from "../lib/use-weapon-icon-maps";
import { useWeapons } from "../lib/weapons-context";
import { PinnedFilterPills } from "./pinned-filter-pills";
import { PinnedWeaponsRail } from "./pinned-weapons-rail";
import { PopularWeapons } from "./popular-weapons";
import { WeaponResultRow } from "./weapon-result-row";

const WEAPON_SORT_OPTIONS: PillSelectOption<WeaponSort>[] = [
  { value: "name", label: "A–Z", direction: "asc" },
  { value: "dps-desc", label: "DPS", direction: "desc" },
  { value: "ammo-gen-desc", label: "Ammo gen", direction: "desc" },
  { value: "season-desc", label: "Newest", direction: "desc" },
  { value: "season-asc", label: "Oldest", direction: "asc" },
];

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
  const router = useRouter();
  const { weapons, perks, isSample, byHash, nameIndex } = useWeapons();
  const { elementIconMap, typeIconMap, ammoIconMap } = useWeaponIconMaps();
  const { dpsByName } = useWeaponDps();
  const { filters: customFilters, createFilter } = useCustomWeaponFilters();
  const paletteRecents = usePaletteSearchRecents("weapon");
  const firefoxPalettePerf = useIsFirefox();
  const [sort, setSort] = useState<WeaponSort>("season-desc");
  const [showAllResults, setShowAllResults] = useState(false);
  const [resultsMode, setResultsMode] = useState<PaletteResultsMode | null>(null);
  const prefetchedWeaponRoutesRef = useRef<Set<string>>(new Set());
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
    composing,
    categories,
    placeholder,
    categoryActions,
    panelHeader,
    handleAddChip,
    handleRemoveChip,
    handleClearChips,
    onBeforePaletteClose,
    onBeforeSelectRecent,
    getChipAppearanceOverride,
    weaponShown,
    weaponPreviewWeapons,
    weaponResultCount,
    weaponShownCount,
  } = useWeaponSearchPaletteState({
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
    recentValues: paletteRecents.recentValues,
    recordSearch: paletteRecents.recordSearch,
    setResultsMode,
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
    suppressRecent: composing,
    suppressResults: composing,
    onBeforeSelectRecent,
    onBeforeClose: onBeforePaletteClose,
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
    composingCustomFilter: composing,
    weaponCategories,
    weaponByHash: byHash,
    weaponNameIndex: nameIndex,
    addChip,
    setQuery,
    setPaletteOpen,
  });

  const weaponResultList = usePaletteResultList({
    shown: weaponShown,
    previewItems: weaponPreviewWeapons,
    resultCount: weaponResultCount,
    shownCount: weaponShownCount,
    getId: (weapon) => String(weapon.hash),
    renderRow: (weapon) => (
      <WeaponResultRow
        weapon={weapon}
        elementIconPath={elementIconMap.get(weapon.element)}
        dps={dpsByName.get(weapon.name)}
        pinned={pinnedWeaponHashSet.has(weapon.hash)}
        onTogglePin={() => toggleWeaponHash(weapon.hash)}
      />
    ),
    stickyPreview: true,
    resetPaginationDeps: [chips, query, sort],
    setShowAllResults,
  });

  useHydratedWeaponSearchSession({
    enabled: restoreSession,
    autoOpenRestoredSession,
    query,
    chips,
    sort,
    resultsMode,
    setQuery,
    setChips,
    setSort,
    setResultsMode,
    setPaletteOpen,
  });

  const prefetchWeaponResult = useCallback(
    (id: string) => {
      const hash = Number(id);
      if (!Number.isFinite(hash)) return;

      const weapon = byHash.get(hash);
      if (!weapon) return;

      const href = `/weapon/${weapon.hash}`;
      if (prefetchedWeaponRoutesRef.current.has(href)) return;
      prefetchedWeaponRoutesRef.current.add(href);
      router.prefetch(href);
    },
    [byHash, router],
  );

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

  useEffect(() => {
    if (!query.trim() || chips.length > 0) {
      setResultsMode(null);
    }
  }, [query, chips]);

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
            const composerAppearance = getChipAppearanceOverride(chip);
            if (composerAppearance) return composerAppearance;
            return getFilterChipAppearance(chip.categoryId, chip.value, {
              elementIcons: elementIconMap,
              weaponTypeIcons: typeIconMap,
              ammoIcons: ammoIconMap,
            });
          }}
          hideCategoryList={composing}
          plainPanelHeader={composing}
          panelHeader={panelHeader}
          onSubmit={handleSubmit}
          onPanelStateChange={handlePanelStateChange}
          onPreviewsReadyChange={setPreviewsReady}
          renderValueTrailing={renderValueTrailing}
          ghostCompletion={paletteOpen ? ghostCompletion : undefined}
          ghostSuffix={paletteOpen ? ghostSuffixText : undefined}
          chipSuggestions={chipSuggestions}
          previewResults={
            previewsReady && !showResults ? weaponResultList.previewResults : undefined
          }
          previewSectionLabel="Results"
          results={weaponResultList.results}
          renderResult={weaponResultList.renderResult}
          onIntentResult={prefetchWeaponResult}
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
          resultsFooter={weaponResultList.resultsFooter}
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
          Sample data — run <code>pnpm setup:bungie</code> for the full index.
        </p>
      ) : null}
    </div>
  );
}
