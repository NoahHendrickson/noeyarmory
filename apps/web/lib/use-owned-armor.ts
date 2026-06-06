"use client";

import { useEffect, useState } from "react";

import type { OwnedArmorItem } from "./armor-types";

export interface OwnedArmorState {
  armor: OwnedArmorItem[];
  loading: boolean;
  error?: string;
}

/** Fetch owned armor from the server when the user is signed in. */
export function useOwnedArmor(enabled: boolean): OwnedArmorState {
  const [state, setState] = useState<OwnedArmorState>({
    armor: [],
    loading: enabled,
  });

  useEffect(() => {
    if (!enabled) {
      setState({ armor: [], loading: false });
      return;
    }

    let active = true;
    setState((prev) => ({ ...prev, loading: true, error: undefined }));

    fetch("/api/armor")
      .then(async (res) => {
        if (res.status === 401) {
          return { armor: [] as OwnedArmorItem[] };
        }
        const json = (await res.json()) as { armor?: OwnedArmorItem[]; error?: string };
        if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
        return { armor: json.armor ?? [] };
      })
      .then(({ armor }) => {
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

  return state;
}
