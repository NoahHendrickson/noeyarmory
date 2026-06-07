"use client";

export function scheduleIdle(callback: () => void, fallbackDelay = 1): () => void {
  if (typeof requestIdleCallback !== "undefined") {
    const id = requestIdleCallback(callback);
    return () => cancelIdleCallback(id);
  }
  const id = window.setTimeout(callback, fallbackDelay);
  return () => window.clearTimeout(id);
}
