"use client";

import { useRouter } from "next/navigation";
import { useCallback, useTransition } from "react";

import type { WeaponSearchSelectionSource } from "../components/weapon-search-palette";
import { trackWeaponView } from "../lib/track-weapon-view";

export function useWeaponRouteNavigation() {
  const router = useRouter();
  const [isNavigating, startNavigation] = useTransition();

  const navigateToWeapon = useCallback(
    (hash: number, source: WeaponSearchSelectionSource, options?: { replace?: boolean }) => {
      trackWeaponView(hash, source);
      startNavigation(() => {
        const href = `/weapon/${hash}`;
        if (options?.replace) {
          router.replace(href, { scroll: false });
        } else {
          router.push(href, { scroll: false });
        }
      });
    },
    [router, startNavigation],
  );

  return { isNavigating, navigateToWeapon };
}
