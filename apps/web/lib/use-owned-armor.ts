"use client";

import { useCallback, useEffect, useState } from "react";

import type { OwnedArmorItem } from "./armor-types";

export interface OwnedArmorState {
  armor: OwnedArmorItem[];
  loading: boolean;
  error?: string;
}

let cache: OwnedArmorItem[] | null = null;
let inflight: Promise<OwnedArmorItem[]> | null = null;

/** Pre-source API responses never included `source` — refetch once after deploy. */
function isOwnedArmorCacheStale(armor: OwnedArmorItem[]): boolean {
  return armor.length > 0 && !armor.some((piece) => piece.source != null && piece.source !== "");
}

/** Drop the client armor cache so the next fetch hits the server. */
export function clearOwnedArmorCache(): void {
  cache = null;
}

function fetchOwnedArmor(): Promise<OwnedArmorItem[]> {
  if (cache !== null) {
    if (isOwnedArmorCacheStale(cache)) {
      cache = null;
    } else {
      return Promise.resolve(cache);
    }
  }
  if (inflight) return inflight;

  inflight = fetch("/api/armor")
    .then(async (res) => {
      if (res.status === 401) {
        return [] as OwnedArmorItem[];
      }
      const json = (await res.json()) as { armor?: OwnedArmorItem[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      return json.armor ?? [];
    })
    .then((armor) => {
      cache = armor;
      return armor;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

/** Fetch owned armor when signed in. Cached after first load for instant mode switches. */
export function useOwnedArmor(enabled: boolean): OwnedArmorState & { refetch: () => Promise<void> } {
  const [state, setState] = useState<OwnedArmorState>(() => ({
    armor: cache ?? [],
    loading: enabled && cache === null,
  }));

  const refetch = useCallback(async () => {
    clearOwnedArmorCache();
    setState((prev) => ({ ...prev, loading: true, error: undefined }));
    try {
      const armor = await fetchOwnedArmor();
      setState({ armor, loading: false });
    } catch (e: unknown) {
      setState({
        armor: [],
        loading: false,
        error: e instanceof Error ? e.message : "Failed to load armor",
      });
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setState((prev) => ({ armor: cache ?? prev.armor, loading: false }));
      return;
    }

    if (cache !== null) {
      if (isOwnedArmorCacheStale(cache)) {
        clearOwnedArmorCache();
      } else {
        setState({ armor: cache, loading: false });
        return;
      }
    }

    let active = true;
    setState((prev) => ({ ...prev, loading: true, error: undefined }));

    fetchOwnedArmor()
      .then((armor) => {
        if (active) setState({ armor, loading: false });
      })
      .catch((e: unknown) => {
        if (active) {
          setState({
            armor: [],
            loading: false,
            error: e instanceof Error ? e.message : "Failed to load armor",
          });
        }
      });

    return () => {
      active = false;
    };
  }, [enabled]);

  return { ...state, refetch };
}
