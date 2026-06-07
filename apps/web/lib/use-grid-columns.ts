import { useSyncExternalStore } from "react";

const SM = "(min-width: 640px)";
const LG = "(min-width: 1024px)";
const XL = "(min-width: 1280px)";

function subscribe(onStoreChange: () => void) {
  const queries = [SM, LG, XL];
  const media = queries.map((query) => window.matchMedia(query));
  for (const mql of media) {
    mql.addEventListener("change", onStoreChange);
  }
  return () => {
    for (const mql of media) {
      mql.removeEventListener("change", onStoreChange);
    }
  };
}

/** Matches `sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` on VirtualizedWeaponGrid. */
function getWeaponGridColumns(): number {
  if (window.matchMedia(XL).matches) return 4;
  if (window.matchMedia(LG).matches) return 3;
  if (window.matchMedia(SM).matches) return 2;
  return 1;
}

export function useWeaponGridColumns(): number {
  return useSyncExternalStore(subscribe, getWeaponGridColumns, () => 1);
}
