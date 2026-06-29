"use client";

import { useEffect, useState } from "react";
import type { WeaponSort } from "@repo/destiny";
import type { PaletteChip } from "@repo/ui";

import type { PaletteResultsMode } from "../lib/palette/results-mode";
import {
  chipsToSnapshotChips,
  hasActiveWeaponSearch,
  readWeaponSearchSession,
  snapshotChipsToPaletteChips,
  writeWeaponSearchSession,
} from "../lib/weapon-search-session";

export function useHydratedWeaponSearchSession({
  enabled,
  autoOpenRestoredSession = true,
  query,
  chips,
  sort,
  resultsMode,
  setQuery,
  setChips,
  setSort,
  setResultsMode,
  setPaletteOpen,
}: {
  enabled: boolean;
  autoOpenRestoredSession?: boolean;
  query: string;
  chips: PaletteChip[];
  sort: WeaponSort;
  resultsMode: PaletteResultsMode | null;
  setQuery: (query: string) => void;
  setChips: (chips: PaletteChip[] | ((prev: PaletteChip[]) => PaletteChip[])) => void;
  setSort: (sort: WeaponSort) => void;
  setResultsMode: (mode: PaletteResultsMode | null) => void;
  setPaletteOpen: (open: boolean) => void;
}) {
  const [hydrated, setHydrated] = useState(!enabled);

  useEffect(() => {
    if (!enabled) return;

    const snapshot = readWeaponSearchSession();
    if (snapshot) {
      setSort(snapshot.sort);
      setResultsMode(snapshot.resultsMode);
      setQuery(snapshot.query);
      setChips(snapshotChipsToPaletteChips(snapshot.chips));
      setPaletteOpen(autoOpenRestoredSession && hasActiveWeaponSearch(snapshot));
    }
    setHydrated(true);
  }, [
    enabled,
    autoOpenRestoredSession,
    setChips,
    setPaletteOpen,
    setQuery,
    setResultsMode,
    setSort,
  ]);

  useEffect(() => {
    if (!enabled || !hydrated) return;

    writeWeaponSearchSession({
      query,
      chips: chipsToSnapshotChips(chips),
      sort,
      resultsMode,
    });
  }, [enabled, hydrated, query, chips, sort, resultsMode]);
}
