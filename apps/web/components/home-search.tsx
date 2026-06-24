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
  Badge,
  CommandPalette,
  PANEL_TRANSITION_MS,
  PillSelect,
  type PaletteCategory,
  type PaletteRecentItem,
  type PillSelectOption,
} from "@repo/ui";
import type { WeaponDpsEntry, WeaponSort } from "@repo/destiny";

import { useArmorActions } from "../hooks/use-armor-actions";
import { useHomeSearchPaletteState } from "../hooks/use-home-search-palette-state";
import type { OwnedArmorItem } from "../lib/armor-types";
import { ARMOR_LOGIN_URL } from "../lib/palette/constants";
import { buildArmorCategories } from "../lib/palette/armor-categories";
import type { PaletteResultsMode } from "../lib/palette/results-mode";
import { useOwnedArmor } from "../lib/use-owned-armor";
import type { CustomWeaponFilter } from "../lib/use-custom-weapon-filters";
import {
  excludeCurrentRecentSearch,
  filterRecentSearches,
  formatRecentSearchLabel,
  useRecentSearches,
} from "../lib/use-recent-searches";
import { useWeapons } from "../lib/weapons-context";
import { trackWeaponView } from "../lib/track-weapon-view";
import { ArmorResultRow } from "./armor-result-row";
import { WeaponModeIcon } from "./icons/weapon-mode-icon";
import { WeaponSearchPalette, type WeaponSearchSelectionSource } from "./weapon-search-palette";

type Mode = "weapon" | "armor";

const WEAPON_MODE_LABEL = (
  <span className="inline-flex items-center gap-1.5">
    <WeaponModeIcon className="size-4 shrink-0" />
    <span>Weapons mode</span>
  </span>
);

const MODES: PillSelectOption<Mode>[] = [
  { value: "weapon", label: WEAPON_MODE_LABEL },
  { value: "armor", label: "Armor mode" },
];

const EMPTY_ARMOR: OwnedArmorItem[] = [];
const EMPTY_CUSTOM_FILTERS: CustomWeaponFilter[] = [];
const EMPTY_WEAPON_CATEGORIES: PaletteCategory[] = [];
const EMPTY_DPS_BY_NAME: ReadonlyMap<string, WeaponDpsEntry> = new Map();
const ARMOR_SORT: WeaponSort = "season-desc";

function ModeControl({ mode, onModeChange }: { mode: Mode; onModeChange: (mode: Mode) => void }) {
  return (
    <PillSelect
      aria-label="Search mode"
      options={MODES}
      value={mode}
      onValueChange={onModeChange}
    />
  );
}

function ArmorSearchHome({ signedIn, modeControl }: { signedIn: boolean; modeControl: ReactNode }) {
  const { weapons, perks } = useWeapons();
  const {
    armor: owned,
    loading: armorLoading,
    error: armorLoadError,
    refetch: refetchArmor,
  } = useOwnedArmor(signedIn);
  const { armorAction, runArmorAction, clearArmorAction } = useArmorActions(refetchArmor);
  const { recordSearch, getRecentForMode, findById, removeRecent, clearRecentForMode } =
    useRecentSearches();
  const [showAllResults, setShowAllResults] = useState(false);
  const [resultsMode, setResultsMode] = useState<PaletteResultsMode | null>(null);

  const categories = useMemo(() => buildArmorCategories(owned), [owned]);
  const recentValues = useMemo(() => {
    const values = new Set<string>();
    for (const search of getRecentForMode("armor")) {
      for (const chip of search.chips) {
        values.add(chip.value.toLowerCase());
      }
      const trimmed = search.query.trim();
      if (trimmed) values.add(trimmed.toLowerCase());
    }
    return values;
  }, [getRecentForMode]);

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
    armorShown,
    armorPreviewItems,
    armorDuplicateDiffs,
    armorResultCount,
    armorShownCount,
  } = useHomeSearchPaletteState({
    mode: "armor",
    weapons,
    perks,
    owned: signedIn ? owned : EMPTY_ARMOR,
    customFilters: EMPTY_CUSTOM_FILTERS,
    weaponCategories: EMPTY_WEAPON_CATEGORIES,
    categories,
    composingCustomFilter: false,
    draftPerkNames: [],
    sort: ARMOR_SORT,
    dpsByName: EMPTY_DPS_BY_NAME,
    showAllResults,
    resultsMode,
    recentValues,
    recordSearch,
    setResultsMode,
  });

  const armorPreviewIds = useMemo(
    () => armorPreviewItems.map((armor) => armor.instanceId),
    [armorPreviewItems],
  );
  const armorPreviewResults = useMemo(
    () => armorPreviewIds.map((id) => ({ id })),
    [armorPreviewIds],
  );
  const armorResultIds = useMemo(() => armorShown.map((armor) => armor.instanceId), [armorShown]);
  const armorResults = useMemo(() => armorResultIds.map((id) => ({ id })), [armorResultIds]);
  const armorById = useMemo(
    () => new Map(armorShown.map((armor) => [armor.instanceId, armor] as const)),
    [armorShown],
  );
  const armorPreviewById = useMemo(
    () => new Map(armorPreviewItems.map((armor) => [armor.instanceId, armor] as const)),
    [armorPreviewItems],
  );

  const renderArmorResult = useCallback(
    (id: string) => {
      const armor = armorById.get(id) ?? armorPreviewById.get(id);
      if (!armor) return null;
      return (
        <ArmorResultRow
          armor={armor}
          duplicateDiff={armorDuplicateDiffs.get(armor.instanceId)}
          actionState={armorAction}
          onEquip={() => void runArmorAction(armor.instanceId, "equip", "/api/armor/equip")}
          onMoveToCharacter={() =>
            void runArmorAction(armor.instanceId, "transfer", "/api/armor/transfer")
          }
        />
      );
    },
    [armorById, armorPreviewById, armorDuplicateDiffs, armorAction, runArmorAction],
  );

  const recordCurrentSearch = useCallback(() => {
    if (chips.length === 0 && !query.trim()) return;
    recordSearch(
      "armor",
      query,
      chips.map((chip) => ({
        categoryId: chip.categoryId,
        categoryLabel: chip.categoryLabel,
        value: chip.value,
        valueId: chip.valueId,
      })),
    );
  }, [chips, query, recordSearch]);

  const recordSearchTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(recordSearchTimerRef.current), []);

  const handleSelectRecent = useCallback(
    (id: string) => {
      const recent = findById(id);
      if (!recent) return;
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
    [findById, setChips, setQuery],
  );

  const handleClearRecent = useCallback(() => clearRecentForMode("armor"), [clearRecentForMode]);

  useEffect(() => {
    setShowAllResults(false);
  }, [chips, query]);

  useEffect(() => {
    if (!query.trim() || chips.length > 0) {
      setResultsMode(null);
    }
  }, [query, chips]);

  useEffect(() => {
    clearArmorAction();
  }, [clearArmorAction]);

  const recentPaletteItems = useMemo<PaletteRecentItem[]>(() => {
    const recents = query.trim()
      ? filterRecentSearches(getRecentForMode("armor"), query)
      : getRecentForMode("armor");
    return excludeCurrentRecentSearch(recents, "armor", query, chips).map((search) => ({
      id: search.id,
      label: formatRecentSearchLabel(search.chips, search.query),
    }));
  }, [getRecentForMode, query, chips]);

  const armorOverlay = !signedIn ? (
    <a href={ARMOR_LOGIN_URL} className="inline-flex">
      <Badge variant="warning">Reconnect your bungie account -&gt;</Badge>
    </a>
  ) : armorLoadError ? (
    <span className="text-sm text-destructive">{armorLoadError}</span>
  ) : undefined;

  const placeholder = armorLoading
    ? "Loading your armor..."
    : "Search armor by class, set, or stats";
  const hasFilters = paletteChips.length > 0;
  const isFiltering = query.trim().length > 0;
  const showFilterResults = hasFilters && !isFiltering;
  const showTextResults = resultsMode === "text" && isFiltering;
  const showResults = showFilterResults || showTextResults;
  const resultsWhileFiltering = showTextResults;
  const resultCount = armorResultCount;
  const shownCount = armorShownCount;

  return (
    <div
      className="mx-auto flex w-full max-w-[calc(100vw-2rem)] flex-col sm:w-[min(calc(100vw-2rem),calc(640px+var(--chip-count,0)*96px))]"
      style={{ "--chip-count": paletteChips.length } as CSSProperties}
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div data-palette-ignore-close className="ml-auto shrink-0">
          {modeControl}
        </div>
      </div>
      <CommandPalette
        className="mx-0"
        placeholder={placeholder}
        categories={categories}
        chips={paletteChips}
        open={paletteOpen}
        onOpenChange={(open) => {
          if (!open) {
            clearTimeout(recordSearchTimerRef.current);
            recordSearchTimerRef.current = setTimeout(recordCurrentSearch, PANEL_TRANSITION_MS);
          }
          setPaletteOpen(open);
        }}
        recentItems={recentPaletteItems}
        onSelectRecent={handleSelectRecent}
        onRemoveRecent={removeRecent}
        onClearRecent={handleClearRecent}
        onAddChip={addChip}
        onRemoveChip={(chipId) => setChips((prev) => prev.filter((chip) => chip.id !== chipId))}
        onClearChips={() => setChips([])}
        query={query}
        onQueryChange={setQuery}
        onSubmit={handleSubmit}
        onPanelStateChange={handlePanelStateChange}
        onPreviewsReadyChange={setPreviewsReady}
        showResults={showResults}
        resultsWhileFiltering={resultsWhileFiltering}
        ghostCompletion={paletteOpen ? ghostCompletion : undefined}
        ghostSuffix={paletteOpen ? ghostSuffixText : undefined}
        recentValues={recentValues}
        chipSuggestions={chipSuggestions}
        previewResults={previewsReady && !showResults ? armorPreviewResults : undefined}
        previewSectionLabel="Results"
        results={armorResults}
        renderResult={renderArmorResult}
        resultsEmpty="Go farm!"
        resultsHeader={
          showResults ? (
            <div className="text-xs tracking-body text-muted-foreground">
              {resultCount} {resultCount === 1 ? "result" : "results"}
            </div>
          ) : undefined
        }
        resultsFooter={
          resultCount > shownCount ? (
            <button
              type="button"
              data-palette-ignore-close
              className="w-full cursor-pointer transition-colors hover:text-foreground"
              onClick={(event) => {
                event.stopPropagation();
                setShowAllResults(true);
              }}
            >
              Showing {shownCount} of {resultCount}
            </button>
          ) : undefined
        }
        disabled={!signedIn}
        renderBarOverlay={armorOverlay}
      />

      {signedIn && armorLoading ? (
        <p className="mt-3 text-center text-xs text-muted-foreground">Loading your armor...</p>
      ) : null}

      {signedIn && !armorLoading && !armorLoadError && owned.length === 0 ? (
        <p className="mt-3 text-center text-xs text-muted-foreground">
          No armor found - run <code>pnpm setup:bungie</code> to generate the armor index.
        </p>
      ) : null}
    </div>
  );
}

export function HomeSearch({
  signedIn = false,
  initialMode = "weapon",
}: {
  signedIn?: boolean;
  initialMode?: Mode;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);

  const handleSelectWeapon = useCallback(
    (hash: number, source: WeaponSearchSelectionSource) => {
      trackWeaponView(hash, source);
      router.push(`/weapon/${hash}`);
    },
    [router],
  );

  const modeControl = <ModeControl mode={mode} onModeChange={setMode} />;

  return (
    <div className="flex min-h-screen flex-col">
      <main className="mx-auto flex w-full flex-1 flex-col px-4 pt-4 sm:pt-[12vh]">
        {mode === "weapon" ? (
          <WeaponSearchPalette
            onSelectWeapon={handleSelectWeapon}
            toolbarTrailing={modeControl}
            showPinnedFilters
            showPinnedWeapons
            showPopularWeapons
            showSampleNotice
            restoreSession
          />
        ) : (
          <ArmorSearchHome signedIn={signedIn} modeControl={modeControl} />
        )}
      </main>
    </div>
  );
}

/** @deprecated Use HomeSearch */
export const WeaponSearch = HomeSearch;
