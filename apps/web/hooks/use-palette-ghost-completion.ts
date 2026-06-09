"use client";

import { useDeferredValue, useMemo } from "react";
import type { ValueSuggestion } from "@repo/ui";
import {
  bestGhostCompletion,
  ghostSuffix,
  suggestWeaponNamesFromIndex,
  type WeaponNameIndex,
} from "@repo/destiny";

export interface UsePaletteGhostCompletionParams {
  enabled: boolean;
  query: string;
  mode: "weapon" | "armor";
  inlineSuggestions: ValueSuggestion[];
  weaponNameIndex: WeaponNameIndex;
  recentValues: ReadonlySet<string>;
}

export function usePaletteGhostCompletion({
  enabled,
  query,
  mode,
  inlineSuggestions,
  weaponNameIndex,
  recentValues,
}: UsePaletteGhostCompletionParams) {
  const deferredEnabled = useDeferredValue(enabled);
  const deferredQuery = useDeferredValue(query);
  const ghostQuery = deferredQuery;

  const candidates = useMemo(() => {
    if (!deferredEnabled || !ghostQuery.trim()) return [];
    const items: { label: string; popularity?: number }[] = inlineSuggestions.map((s) => ({
      label: s.value,
    }));
    if (mode === "weapon") {
      for (const weapon of suggestWeaponNamesFromIndex(weaponNameIndex, ghostQuery, 5)) {
        items.push({ label: weapon.value, popularity: weapon.count });
      }
    }
    return items;
  }, [deferredEnabled, ghostQuery, inlineSuggestions, mode, weaponNameIndex]);

  const ghost = useMemo(() => {
    if (!deferredEnabled) return undefined;
    const completion = bestGhostCompletion(ghostQuery, candidates, recentValues);
    if (!completion) return undefined;
    const suffix = ghostSuffix(completion.label, query);
    if (!suffix) return undefined;
    return { label: completion.label, suffix };
  }, [deferredEnabled, ghostQuery, candidates, recentValues, query]);

  return {
    ghostCompletion: ghost?.label,
    ghostSuffix: ghost?.suffix,
  };
}
