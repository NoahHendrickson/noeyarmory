"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { loadClarityDescriptions } from "./clarity-descriptions";
import type { ClarityDescriptionMap } from "./clarity-types";

export type { ClarityPerkLookup, ClarityPerkTiers } from "./clarity-perk-tiers";
export {
  getClarityDisplayLines,
  getClarityPerkTiers,
  hasClarityOrBungieTooltip,
  mergeLinePair,
} from "./clarity-perk-tiers";

const ClarityContext = createContext<ClarityDescriptionMap | null>(null);

export function ClarityProvider({ children }: { children: ReactNode }) {
  const [descriptions, setDescriptions] = useState<ClarityDescriptionMap | null>(null);

  useEffect(() => {
    void loadClarityDescriptions().then(setDescriptions);
  }, []);

  return <ClarityContext.Provider value={descriptions}>{children}</ClarityContext.Provider>;
}

export function useClarityDescriptions(): ClarityDescriptionMap | null {
  return useContext(ClarityContext);
}
