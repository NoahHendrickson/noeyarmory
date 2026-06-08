const lower = (s: string) => s.toLowerCase();

function wordBoundaryPrefix(labelLower: string, queryLower: string): boolean {
  if (labelLower.startsWith(queryLower)) return true;
  const parts = labelLower.split(/[\s\-–—]+/);
  return parts.some((part) => part.startsWith(queryLower));
}

/** Match quality ladder — lower is better. */
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

export function effectiveRank(
  rank: number,
  label: string,
  recentValues?: ReadonlySet<string>,
): number {
  if (!recentValues || recentValues.size === 0) return rank;
  return recentValues.has(lower(label)) ? rank - 0.5 : rank;
}
