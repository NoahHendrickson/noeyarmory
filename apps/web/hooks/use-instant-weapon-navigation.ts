"use client";

import { useCallback, useEffect, useState } from "react";

import { trackWeaponView } from "../lib/track-weapon-view";
import type { WeaponSearchSelectionSource } from "../components/weapon-search-palette";

const WEAPON_PATH_RE = /^\/weapon\/(\d+)/;

function weaponHashFromPath(pathname: string): number | null {
  const match = WEAPON_PATH_RE.exec(pathname);
  if (!match) return null;
  const hash = Number(match[1]);
  return Number.isFinite(hash) ? hash : null;
}

export interface InstantWeaponNavigation {
  /** Currently displayed weapon hash, or null when the search view should show. */
  activeHash: number | null;
  /** Open a weapon: tracks the view, updates the URL, and renders the detail in-place. */
  openWeapon: (hash: number, source: WeaponSearchSelectionSource) => void;
  /** Swap to a sibling version: replaces the URL entry (no new history step, no view event). */
  replaceWeapon: (hash: number) => void;
  /** Return to the search view (used for an explicit back affordance). */
  closeWeapon: () => void;
}

/**
 * Client-side weapon navigation that renders the detail straight from the in-memory index and
 * syncs the URL via the History API — no server round-trip, no RSC fetch. The SSR
 * `/weapon/[hash]` route still owns direct loads, hard refresh, and shared links; this hook
 * reconciles browser back/forward (`popstate`) against the current path so the two stay in sync.
 *
 * @param initialHash seed for the active hash (the SSR route passes its own hash so the detail
 *   shows immediately; the home view passes null so it starts on search).
 */
export function useInstantWeaponNavigation(initialHash: number | null = null): InstantWeaponNavigation {
  const [activeHash, setActiveHash] = useState<number | null>(initialHash);

  const navigate = useCallback((hash: number, replace: boolean) => {
    const href = `/weapon/${hash}`;
    // Next.js patches history.pushState/replaceState to keep its router state in sync, so this
    // updates the URL (and usePathname) without triggering a navigation or server render.
    if (replace) {
      window.history.replaceState(null, "", href);
    } else {
      window.history.pushState(null, "", href);
    }
    setActiveHash(hash);
  }, []);

  const openWeapon = useCallback(
    (hash: number, source: WeaponSearchSelectionSource) => {
      trackWeaponView(hash, source);
      navigate(hash, false);
    },
    [navigate],
  );

  const replaceWeapon = useCallback((hash: number) => navigate(hash, true), [navigate]);

  const closeWeapon = useCallback(() => {
    setActiveHash(null);
  }, []);

  useEffect(() => {
    // Back/forward changes the URL without a React navigation; read the path and toggle the
    // detail accordingly (reading window.location is correct regardless of listener order).
    const onPopState = () => setActiveHash(weaponHashFromPath(window.location.pathname));
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  return { activeHash, openWeapon, replaceWeapon, closeWeapon };
}
