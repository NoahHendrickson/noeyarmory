import type { ClarityDescriptionMap, ClarityLine, ClarityPerk } from "./clarity-types";

const CLARITY_BASE = "https://database-clarity.github.io/Live-Clarity-Database";
const VERSION_KEY = "noeyarmory-clarity-version";
const DATA_KEY = "noeyarmory-clarity-data";

let memoryCache: ClarityDescriptionMap | null = null;
let loadPromise: Promise<ClarityDescriptionMap | null> | null = null;

function readSessionCache(): ClarityDescriptionMap | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(DATA_KEY);
    return raw ? (JSON.parse(raw) as ClarityDescriptionMap) : null;
  } catch {
    return null;
  }
}

function writeSessionCache(data: ClarityDescriptionMap, version: number): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(DATA_KEY, JSON.stringify(data));
    localStorage.setItem(VERSION_KEY, String(version));
  } catch {
    // Quota exceeded — keep in-memory cache only.
  }
}

/** Fetch Clarity perk descriptions (deduped across callers). */
export function loadClarityDescriptions(): Promise<ClarityDescriptionMap | null> {
  if (memoryCache) return Promise.resolve(memoryCache);
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const versionRes = await fetch(`${CLARITY_BASE}/versions.json`);
      if (!versionRes.ok) throw new Error(`versions ${versionRes.status}`);
      const { descriptions: remoteVersion } = (await versionRes.json()) as { descriptions: number };

      const savedVersion =
        typeof localStorage !== "undefined" ? localStorage.getItem(VERSION_KEY) : null;
      if (savedVersion === String(remoteVersion)) {
        const cached = readSessionCache();
        if (cached) {
          memoryCache = cached;
          return cached;
        }
      }

      const dataRes = await fetch(`${CLARITY_BASE}/descriptions/dim.json`);
      if (!dataRes.ok) throw new Error(`descriptions ${dataRes.status}`);
      const data = (await dataRes.json()) as ClarityDescriptionMap;
      memoryCache = data;
      writeSessionCache(data, remoteVersion);
      return data;
    } catch {
      return readSessionCache();
    } finally {
      loadPromise = null;
    }
  })();

  return loadPromise;
}

export function clarityLines(perk: ClarityPerk | undefined) {
  return perk?.descriptions.en;
}

export function clarityHasEnhancedMarkers(lines: ClarityLine[] | undefined): boolean {
  if (!lines) return false;
  return lines.some(
    (line) =>
      line.classNames?.includes("enhancedArrow") ||
      line.linesContent?.some((part) => part.classNames?.includes("enhancedArrow")),
  );
}
