import { useSyncExternalStore } from "react";

/** True when the primary pointer supports hover (mouse / trackpad). */
const HOVER_QUERY = "(hover: hover) and (pointer: fine)";

function subscribe(onStoreChange: () => void) {
  const mql = window.matchMedia(HOVER_QUERY);
  mql.addEventListener("change", onStoreChange);
  return () => mql.removeEventListener("change", onStoreChange);
}

function getHasHover(): boolean {
  return window.matchMedia(HOVER_QUERY).matches;
}

export function useHasHover(): boolean {
  return useSyncExternalStore(subscribe, getHasHover, () => true);
}
