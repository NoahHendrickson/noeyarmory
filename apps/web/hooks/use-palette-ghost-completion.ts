"use client";

import { useDeferredValue, useMemo } from "react";
import type { ValueSuggestion } from "@repo/ui";
import { bestGhostCompletion, suggestWeaponNames, type WeaponSummary } from "@repo/destiny";

import { useSearchPopularity } from "../lib/use-search-popularity";
import { useWeapons } from "../lib/weapons-context";

export interface UsePaletteGhostCompletionParams {
  enabled: boolean;
  query: string;
  mode: "weapon" | "armor";
  inlineSuggestions: ValueSuggestion[];
  weapons: WeaponSummary[];
  recentValues: ReadonlySet<string>;
}

export function usePaletteGhostCompletion({
  enabled,
  query,
  mode,
  inlineSuggestions,
  weapons,
  recentValues,
}: UsePaletteGhostCompletionParams) {
  const deferredQuery = useDeferredValue(query);
  const deferredInlineSuggestions = useDeferredValue(inlineSuggestions);
  const ghostQuery = deferredQuery;
  // Built-once name index from context (B1) — not rebuilt per hook.
  const { nameIndex } = useWeapons();
  const popularity = useSearchPopularity();

  const candidates = useMemo(() => {
    if (!enabled || !ghostQuery.trim()) return [];
    const items: { label: string; popularity?: number }[] = deferredInlineSuggestions.map((s) => ({
      label: s.value,
    }));
    if (mode === "weapon") {
      for (const weapon of suggestWeaponNames(weapons, ghostQuery, 5, nameIndex, popularity)) {
        items.push({ label: weapon.value, popularity: weapon.count });
      }
    }
    return items;
  }, [enabled, ghostQuery, deferredInlineSuggestions, mode, weapons, nameIndex, popularity]);

  const ghost = useMemo(
    () => (enabled ? bestGhostCompletion(ghostQuery, candidates, recentValues) : undefined),
    [enabled, ghostQuery, candidates, recentValues],
  );
  const ready = ghostQuery === query;

  return {
    ghostCompletion: ready ? ghost?.label : undefined,
    ghostSuffix: ready ? ghost?.suffix : undefined,
  };
}
