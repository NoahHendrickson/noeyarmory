"use client";

import { useMemo } from "react";
import type { ValueSuggestion } from "@repo/ui";
import { bestGhostCompletion, suggestWeaponNames, type WeaponSummary } from "@repo/destiny";

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
  const candidates = useMemo(() => {
    if (!enabled || !query.trim()) return [];
    const items: { label: string; popularity?: number }[] = inlineSuggestions.map((s) => ({
      label: s.value,
    }));
    if (mode === "weapon") {
      for (const weapon of suggestWeaponNames(weapons, query, 5)) {
        items.push({ label: weapon.value, popularity: weapon.count });
      }
    }
    return items;
  }, [enabled, query, inlineSuggestions, mode, weapons]);

  const ghost = useMemo(
    () => (enabled ? bestGhostCompletion(query, candidates, recentValues) : undefined),
    [enabled, query, candidates, recentValues],
  );

  return {
    ghostCompletion: ghost?.label,
    ghostSuffix: ghost?.suffix,
  };
}
