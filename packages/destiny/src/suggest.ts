import Fuse from "fuse.js";

import { rankLabeledOptions, type RankedLabel } from "@repo/search-rank";

export type { GhostCompletion, RankedLabel } from "@repo/search-rank";
export {
  bestGhostCompletion,
  bestGhostSuffix,
  effectiveRank,
  ghostSuffix,
  matchRank,
  rankLabeledOptions,
} from "@repo/search-rank";

const lower = (s: string) => s.toLowerCase();

export interface PerkNameEntry {
  name: string;
}

/** Fuzzy index over perk names for typo-tolerant autocomplete. */
export function createPerkNameFuse(names: string[]): Fuse<PerkNameEntry> {
  const entries = [...new Set(names)].map((name) => ({ name }));
  return new Fuse(entries, {
    keys: [{ name: "name", weight: 1 }],
    threshold: 0.35,
    ignoreLocation: true,
  });
}

export interface FilteredPerkName {
  name: string;
  /** Set when matched only via fuzzy search (for cross-category ranking). */
  searchRank?: number;
}

/** Substring filter with optional fuzzy fallback — no global sort (caller ranks). */
export function filterPerkNames(
  names: readonly string[],
  query: string,
  perkFuse: Fuse<PerkNameEntry> | null,
  limit = 20,
): FilteredPerkName[] {
  const ql = query.trim().toLowerCase();
  if (!ql) return names.slice(0, limit).map((name) => ({ name }));

  const results: FilteredPerkName[] = [];
  const seen = new Set<string>();

  for (const name of names) {
    if (name.toLowerCase().includes(ql)) {
      results.push({ name });
      seen.add(lower(name));
      if (results.length >= limit) return results;
    }
  }

  if (results.length < 3 && ql.length >= 3 && perkFuse) {
    const fuzzy = perkFuse.search(query.trim(), { limit: limit - results.length });
    for (const result of fuzzy) {
      const key = lower(result.item.name);
      if (seen.has(key)) continue;
      seen.add(key);
      results.push({ name: result.item.name, searchRank: 4 });
      if (results.length >= limit) break;
    }
  }

  return results;
}

/** Rank perk names for drill-down lists (values mode). */
export function rankPerkNames(
  names: readonly string[],
  query: string,
  perkFuse: Fuse<PerkNameEntry> | null,
  limit = 20,
  recentValues?: ReadonlySet<string>,
): RankedLabel[] {
  const filtered = filterPerkNames(names, query, perkFuse, limit);
  return rankLabeledOptions(
    filtered.map((entry) => ({
      label: entry.name,
      fallbackRank: entry.searchRank,
    })),
    query,
    limit,
    recentValues,
  );
}

/** @deprecated Use filterPerkNames + rankLabeledOptions at the call site. */
export function suggestPerkNames(
  names: readonly string[],
  query: string,
  perkFuse: Fuse<PerkNameEntry> | null,
  limit = 20,
  recentValues?: ReadonlySet<string>,
): RankedLabel[] {
  return rankPerkNames(names, query, perkFuse, limit, recentValues);
}
