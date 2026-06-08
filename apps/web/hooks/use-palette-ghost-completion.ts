"use client";

import { useDeferredValue, useMemo } from "react";
import type { ValueSuggestion } from "@repo/ui";
import { bestGhostCompletion, suggestWeaponNames, type WeaponSummary } from "@repo/destiny";

import { isFirefox } from "../lib/is-firefox";

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
  const ghostQuery = isFirefox() ? deferredQuery : query;

  const candidates = useMemo(() => {
    if (!enabled || !ghostQuery.trim()) return [];
    const items: { label: string; popularity?: number }[] = inlineSuggestions.map((s) => ({
      label: s.value,
    }));
    if (mode === "weapon") {
      for (const weapon of suggestWeaponNames(weapons, ghostQuery, 5)) {
        items.push({ label: weapon.value, popularity: weapon.count });
      }
    }
    return items;
  }, [enabled, ghostQuery, inlineSuggestions, mode, weapons]);

  const ghost = useMemo(
    () => (enabled ? bestGhostCompletion(ghostQuery, candidates, recentValues) : undefined),
    [enabled, ghostQuery, candidates, recentValues],
  );

  return {
    ghostCompletion: ghost?.label,
    ghostSuffix: ghost?.suffix,
  };
}
