"use client";

import { useEffect, useMemo, useState } from "react";

import { useWeapons } from "./weapons-context";

interface PopularWeaponEntry {
  hash: number;
  views: number;
}

// Module-cached so the rolling popularity list is fetched once per session and
// shared across every search hook that ranks with it.
let cache: PopularWeaponEntry[] | null = null;
let inflight: Promise<PopularWeaponEntry[]> | null = null;

function loadPopularWeapons(): Promise<PopularWeaponEntry[]> {
  if (cache) return Promise.resolve(cache);
  if (!inflight) {
    inflight = fetch("/api/popular-weapons")
      .then((res) => (res.ok ? (res.json() as Promise<{ weapons?: PopularWeaponEntry[] }>) : { weapons: [] }))
      .then((data) => {
        cache = data.weapons ?? [];
        return cache;
      })
      .catch(() => {
        cache = [];
        return cache;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/**
 * Lowercase weapon name → rolling view count, used as a search-ranking tiebreak.
 * Resolves Redis hashes to names against the loaded weapon index; empty until the
 * popularity endpoint returns data (and stays empty when popularity is disabled).
 */
export function useSearchPopularity(): ReadonlyMap<string, number> {
  const { byHash } = useWeapons();
  const [entries, setEntries] = useState<PopularWeaponEntry[] | null>(cache);

  useEffect(() => {
    let active = true;
    void loadPopularWeapons().then((loaded) => {
      if (active) setEntries(loaded);
    });
    return () => {
      active = false;
    };
  }, []);

  return useMemo(() => {
    const map = new Map<string, number>();
    if (entries) {
      for (const entry of entries) {
        const weapon = byHash.get(entry.hash);
        if (weapon) map.set(weapon.name.toLowerCase(), entry.views);
      }
    }
    return map;
  }, [entries, byHash]);
}
