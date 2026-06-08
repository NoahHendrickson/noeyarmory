let cached: boolean | undefined;

/** Client-only; memoized after first read. Used to gate Firefox-specific perf paths. */
export function isFirefox(): boolean {
  if (cached !== undefined) return cached;
  cached = typeof navigator !== "undefined" && /firefox/i.test(navigator.userAgent);
  return cached;
}
