"use client";

import { useSyncExternalStore } from "react";

import { isFirefox } from "./is-firefox";

/** Client Firefox detection without SSR hydration mismatch. */
export function useIsFirefox(): boolean {
  return useSyncExternalStore(
    () => () => {},
    isFirefox,
    () => false,
  );
}
