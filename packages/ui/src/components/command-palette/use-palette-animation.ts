import { useCallback, useEffect, useRef, useState } from "react";

import {
  dormantSnapshotMatches,
  PANEL_TRANSITION_MS,
  shouldDeferPreviews,
  stripPreviewItems,
} from "./palette-reducer";
import type { ClosingSnapshot, DormantSnapshot, ListMode, PaletteItem } from "./types";

export interface UsePaletteAnimationParams {
  open: boolean;
  query: string;
  chipsLength: number;
  onPreviewsReadyChange?: (ready: boolean) => void;
}

export function usePaletteAnimation({
  open,
  query,
  chipsLength,
  onPreviewsReadyChange,
}: UsePaletteAnimationParams) {
  const [closingSnapshot, setClosingSnapshot] = useState<ClosingSnapshot | null>(null);
  const [openingSnapshot, setOpeningSnapshot] = useState<ClosingSnapshot | null>(null);
  const [previewsMounted, setPreviewsMounted] = useState(false);

  const closeAnimationTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const openAnimationTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const dormantSnapshotRef = useRef<DormantSnapshot | null>(null);
  const openingFingerprintRef = useRef<Pick<DormantSnapshot, "query" | "chipsLength"> | null>(
    null,
  );

  const clearOpenAnimationTimer = useCallback(() => {
    clearTimeout(openAnimationTimerRef.current);
    openAnimationTimerRef.current = undefined;
  }, []);

  const clearOpeningSnapshot = useCallback(() => {
    setOpeningSnapshot(null);
    openingFingerprintRef.current = null;
  }, []);

  const finishOpenAnimation = useCallback(
    (deferPreviews: boolean) => {
      clearOpenAnimationTimer();
      clearOpeningSnapshot();
      if (deferPreviews) setPreviewsMounted(true);
    },
    [clearOpenAnimationTimer, clearOpeningSnapshot],
  );

  const startPreviewDeferTimer = useCallback(() => {
    if (!shouldDeferPreviews(query, chipsLength)) return;
    clearOpenAnimationTimer();
    openAnimationTimerRef.current = setTimeout(
      () => finishOpenAnimation(true),
      PANEL_TRANSITION_MS,
    );
  }, [query, chipsLength, clearOpenAnimationTimer, finishOpenAnimation]);

  const invalidateDormantSnapshot = useCallback(() => {
    const dormant = dormantSnapshotRef.current;
    if (dormant && !dormantSnapshotMatches(dormant, query, chipsLength)) {
      dormantSnapshotRef.current = null;
    }
  }, [query, chipsLength]);

  const seedOpeningSnapshot = useCallback(() => {
    invalidateDormantSnapshot();
    const dormant = dormantSnapshotRef.current;
    if (!dormant || !dormantSnapshotMatches(dormant, query, chipsLength)) {
      dormantSnapshotRef.current = null;
      return;
    }
    setOpeningSnapshot({ mode: dormant.mode, items: [...dormant.items] });
    openingFingerprintRef.current = { query: dormant.query, chipsLength: dormant.chipsLength };
    if (shouldDeferPreviews(query, chipsLength)) setPreviewsMounted(false);
    startPreviewDeferTimer();
  }, [invalidateDormantSnapshot, query, chipsLength, startPreviewDeferTimer]);

  const beginCloseAnimation = useCallback(
    (currentMode: ListMode | null, currentItems: PaletteItem[]) => {
      if (!currentMode) return;
      setClosingSnapshot({ mode: currentMode, items: [...currentItems] });
      if (shouldDeferPreviews(query, chipsLength)) {
        dormantSnapshotRef.current = {
          mode: currentMode,
          items: stripPreviewItems(currentItems),
          query: query.trim(),
          chipsLength,
        };
      }
      clearTimeout(closeAnimationTimerRef.current);
      closeAnimationTimerRef.current = setTimeout(() => {
        setClosingSnapshot(null);
      }, PANEL_TRANSITION_MS);
    },
    [query, chipsLength],
  );

  useEffect(() => () => clearTimeout(closeAnimationTimerRef.current), []);

  useEffect(() => {
    if (!open) return;
    clearTimeout(closeAnimationTimerRef.current);
    setClosingSnapshot(null);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setPreviewsMounted(false);
      clearOpeningSnapshot();
      clearOpenAnimationTimer();
      return;
    }
    if (!shouldDeferPreviews(query, chipsLength)) {
      setPreviewsMounted(true);
      return;
    }
    if (!previewsMounted && openAnimationTimerRef.current === undefined) {
      startPreviewDeferTimer();
    }
  }, [
    open,
    query,
    chipsLength,
    previewsMounted,
    clearOpeningSnapshot,
    clearOpenAnimationTimer,
    startPreviewDeferTimer,
  ]);

  useEffect(() => {
    invalidateDormantSnapshot();
    const fingerprint = openingFingerprintRef.current;
    if (fingerprint && !dormantSnapshotMatches(fingerprint, query, chipsLength)) {
      clearOpeningSnapshot();
      clearOpenAnimationTimer();
    }
  }, [
    query,
    chipsLength,
    invalidateDormantSnapshot,
    clearOpeningSnapshot,
    clearOpenAnimationTimer,
  ]);

  useEffect(() => {
    onPreviewsReadyChange?.(open && previewsMounted);
  }, [open, previewsMounted, onPreviewsReadyChange]);

  return {
    previewsMounted,
    previewResultsForItems: open && previewsMounted,
    panelClosing: closingSnapshot != null,
    closingSnapshot,
    openingSnapshot,
    seedOpeningSnapshot,
    beginCloseAnimation,
  };
}
