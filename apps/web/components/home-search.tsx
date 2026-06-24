"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Badge, CommandPalette, PillSelect, type PillSelectOption } from "@repo/ui";

import { useArmorActions } from "../hooks/use-armor-actions";
import { useArmorSearchPaletteState } from "../hooks/use-home-search-palette-state";
import { usePaletteResultList } from "../hooks/use-palette-result-list";
import {
  usePaletteSearchChrome,
  usePaletteSearchRecents,
} from "../hooks/use-palette-search-chrome";
import type { OwnedArmorItem } from "../lib/armor-types";
import { ARMOR_LOGIN_URL } from "../lib/palette/constants";
import { buildArmorCategories } from "../lib/palette/armor-categories";
import type { PaletteResultsMode } from "../lib/palette/results-mode";
import { useOwnedArmor } from "../lib/use-owned-armor";
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
  const {
    armor: owned,
    loading: armorLoading,
    error: armorLoadError,
    refetch: refetchArmor,
  } = useOwnedArmor(signedIn);
  const { armorAction, runArmorAction, clearArmorAction } = useArmorActions(refetchArmor);
  const [showAllResults, setShowAllResults] = useState(false);
  const [resultsMode, setResultsMode] = useState<PaletteResultsMode | null>(null);

  const categories = useMemo(() => buildArmorCategories(owned), [owned]);
  const paletteRecents = usePaletteSearchRecents("armor");

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
  } = useArmorSearchPaletteState({
    owned: signedIn ? owned : EMPTY_ARMOR,
    categories,
    showAllResults,
    recentValues: paletteRecents.recentValues,
    recordSearch: paletteRecents.recordSearch,
    setResultsMode,
  });

  const paletteChrome = usePaletteSearchChrome({
    mode: "armor",
    recents: paletteRecents,
    query,
    chips,
    paletteChips,
    paletteOpen,
    setQuery,
    setChips,
    setPaletteOpen,
    resultsMode,
  });

  const armorResultList = usePaletteResultList({
    shown: armorShown,
    previewItems: armorPreviewItems,
    resultCount: armorResultCount,
    shownCount: armorShownCount,
    getId: (armor) => armor.instanceId,
    renderRow: (armor) => (
      <ArmorResultRow
        armor={armor}
        duplicateDiff={armorDuplicateDiffs.get(armor.instanceId)}
        actionState={armorAction}
        onEquip={() => void runArmorAction(armor.instanceId, "equip", "/api/armor/equip")}
        onMoveToCharacter={() =>
          void runArmorAction(armor.instanceId, "transfer", "/api/armor/transfer")
        }
      />
    ),
    resetPaginationDeps: [chips, query],
    showAllResults,
    setShowAllResults,
  });

  useEffect(() => {
    if (!query.trim() || chips.length > 0) {
      setResultsMode(null);
    }
  }, [query, chips]);

  useEffect(() => {
    clearArmorAction();
  }, [clearArmorAction]);

  const armorOverlay = !signedIn ? (
    <a href={ARMOR_LOGIN_URL} className="inline-flex">
      <Badge variant="warning">Reconnect your bungie account ↗</Badge>
    </a>
  ) : armorLoadError ? (
    <span className="text-sm text-destructive">{armorLoadError}</span>
  ) : undefined;

  const placeholder = armorLoading ? "Loading your armor…" : "Search armor by class, set, or stats";
  const resultCount = armorResultCount;

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
        {...paletteChrome.paletteProps}
        onAddChip={addChip}
        onRemoveChip={(chipId) => setChips((prev) => prev.filter((chip) => chip.id !== chipId))}
        onClearChips={() => setChips([])}
        onSubmit={handleSubmit}
        onPanelStateChange={handlePanelStateChange}
        onPreviewsReadyChange={setPreviewsReady}
        ghostCompletion={paletteOpen ? ghostCompletion : undefined}
        ghostSuffix={paletteOpen ? ghostSuffixText : undefined}
        chipSuggestions={chipSuggestions}
        previewResults={
          previewsReady && !paletteChrome.showResults ? armorResultList.previewResults : undefined
        }
        previewSectionLabel="Results"
        results={armorResultList.results}
        renderResult={armorResultList.renderResult}
        resultsEmpty="Go farm!"
        resultsHeader={
          paletteChrome.showResults ? (
            <div className="text-xs tracking-body text-muted-foreground">
              {resultCount} {resultCount === 1 ? "result" : "results"}
            </div>
          ) : undefined
        }
        resultsFooter={armorResultList.resultsFooter}
        disabled={!signedIn}
        renderBarOverlay={armorOverlay}
      />

      {signedIn && armorLoading ? (
        <p className="mt-3 text-center text-xs text-muted-foreground">Loading your armor…</p>
      ) : null}

      {signedIn && !armorLoading && !armorLoadError && owned.length === 0 ? (
        <p className="mt-3 text-center text-xs text-muted-foreground">
          No armor found — run <code>pnpm setup:bungie</code> to generate the armor index.
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
