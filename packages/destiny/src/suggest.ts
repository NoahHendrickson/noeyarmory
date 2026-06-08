import Fuse from "fuse.js";

const lower = (s: string) => s.toLowerCase();

/** Word-boundary prefix: query matches start of a word in label. */
function wordBoundaryPrefix(labelLower: string, queryLower: string): boolean {
  if (labelLower.startsWith(queryLower)) return true;
  const parts = labelLower.split(/[\s\-–—]+/);
  return parts.some((part) => part.startsWith(queryLower));
}

/**
 * Match quality ladder — lower is better.
 * 0 exact, 1 prefix, 2 word-boundary prefix, 3 contains, null = no match.
 */
export function matchRank(label: string, query: string): number | null {
  const ql = query.trim().toLowerCase();
  if (!ql) return null;
  const ll = lower(label);
  if (ll === ql) return 0;
  if (ll.startsWith(ql)) return 1;
  if (wordBoundaryPrefix(ll, ql)) return 2;
  if (ll.includes(ql)) return 3;
  return null;
}

/** Apply recency boost — subtract when label matches a recent value. */
export function effectiveRank(rank: number, label: string, recentValues?: ReadonlySet<string>): number {
  if (!recentValues || recentValues.size === 0) return rank;
  return recentValues.has(lower(label)) ? rank - 0.5 : rank;
}

export interface RankedLabel {
  label: string;
  rank: number;
  popularity: number;
}

/** Rank and sort labeled options; drops non-matches. */
export function rankLabeledOptions(
  items: readonly { label: string; popularity?: number }[],
  query: string,
  limit: number,
  recentValues?: ReadonlySet<string>,
): RankedLabel[] {
  const ql = query.trim();
  if (!ql) return [];

  const ranked: RankedLabel[] = [];
  for (const item of items) {
    const baseRank = matchRank(item.label, ql);
    if (baseRank == null) continue;
    ranked.push({
      label: item.label,
      rank: effectiveRank(baseRank, item.label, recentValues),
      popularity: item.popularity ?? 0,
    });
  }

  ranked.sort(
    (a, b) =>
      a.rank - b.rank || b.popularity - a.popularity || a.label.localeCompare(b.label),
  );

  return ranked.slice(0, limit);
}

/** Suffix to append for Tab ghost completion, or undefined if none. */
export function ghostSuffix(label: string, query: string, maxRank = 1): string | undefined {
  const q = query;
  const ql = q.trim().toLowerCase();
  if (ql.length < 2) return undefined;
  const rank = matchRank(label, q);
  if (rank == null || rank > maxRank) return undefined;
  const ll = label.toLowerCase();
  if (!ll.startsWith(ql)) return undefined;
  const suffix = label.slice(q.trim().length);
  return suffix.length > 0 ? suffix : undefined;
}

/** Pick the best ghost completion from candidate labels. */
export function bestGhostSuffix(
  query: string,
  candidates: readonly { label: string; popularity?: number }[],
  recentValues?: ReadonlySet<string>,
): string | undefined {
  const ranked = rankLabeledOptions(candidates, query, 1, recentValues);
  const top = ranked[0];
  if (!top) return undefined;
  return ghostSuffix(top.label, query);
}

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

/** Substring matches first; fuzzy fallback when few hits and query length >= 3. */
export function suggestPerkNames(
  names: readonly string[],
  query: string,
  perkFuse: Fuse<PerkNameEntry> | null,
  limit = 20,
  recentValues?: ReadonlySet<string>,
): RankedLabel[] {
  const ql = query.trim();
  if (!ql) return [];

  const items = names.map((name) => ({ label: name, popularity: 0 }));
  let ranked = rankLabeledOptions(items, ql, limit, recentValues);

  if (ranked.length < 3 && ql.length >= 3 && perkFuse) {
    const seen = new Set(ranked.map((r) => lower(r.label)));
    const fuzzy = perkFuse.search(ql, { limit: limit - ranked.length });
    for (const result of fuzzy) {
      const name = result.item.name;
      const key = lower(name);
      if (seen.has(key)) continue;
      seen.add(key);
      ranked.push({ label: name, rank: 4, popularity: 0 });
      if (ranked.length >= limit) break;
    }
    ranked.sort(
      (a, b) =>
        a.rank - b.rank || b.popularity - a.popularity || a.label.localeCompare(b.label),
    );
  }

  return ranked.slice(0, limit);
}
