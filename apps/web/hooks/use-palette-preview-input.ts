"use client";

import { useDeferredValue } from "react";

import { isFirefox } from "../lib/is-firefox";
import { MAX_PREVIEW_RESULTS, MAX_PREVIEW_RESULTS_FIREFOX } from "../lib/palette/constants";

export function usePalettePreviewInput<TPanelState, TSuggestions>(
  query: string,
  panelState: TPanelState,
  inlineSuggestions: TSuggestions,
) {
  const previewQuery = useDeferredValue(query);
  const querySettled = previewQuery === query;
  const deferredPanelState = useDeferredValue(panelState);
  const deferredInlineSuggestions = useDeferredValue(inlineSuggestions);

  return {
    previewQuery,
    previewPanelState: querySettled ? panelState : deferredPanelState,
    previewInlineSuggestions: querySettled ? inlineSuggestions : deferredInlineSuggestions,
    previewResultLimit: isFirefox() ? MAX_PREVIEW_RESULTS_FIREFOX : MAX_PREVIEW_RESULTS,
  };
}
