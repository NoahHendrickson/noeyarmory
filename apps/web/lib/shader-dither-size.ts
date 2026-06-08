"use client";

import { useEffect, useState } from "react";

/** Dither pixel size tuned for ~1920px-wide viewports; scales with screen width. */
const REFERENCE_VIEWPORT_WIDTH = 1920;
const BASE_DITHER_PIXEL_SIZE = 5;
const MIN_DITHER_PIXEL_SIZE = 2;
const MAX_DITHER_PIXEL_SIZE = 12;
/** Finer grain on 2560×1440 panels (width-scaled default would be ~7). */
const QHD_DITHER_PIXEL_SIZE = 4;

function isQhdMonitor(): boolean {
  if (typeof window === "undefined") return false;
  const { width, height } = window.screen;
  return width >= 2400 && width <= 2800 && height >= 1300 && height <= 1600;
}

export function ditherPixelSizeForViewport(innerWidth: number): number {
  if (isQhdMonitor()) return QHD_DITHER_PIXEL_SIZE;
  const scaled = Math.round((BASE_DITHER_PIXEL_SIZE * innerWidth) / REFERENCE_VIEWPORT_WIDTH);
  return Math.min(MAX_DITHER_PIXEL_SIZE, Math.max(MIN_DITHER_PIXEL_SIZE, scaled));
}

export function useDitherPixelSize(): number {
  const [pixelSize, setPixelSize] = useState(BASE_DITHER_PIXEL_SIZE);

  useEffect(() => {
    const update = () => setPixelSize(ditherPixelSizeForViewport(window.innerWidth));
    update();
    window.addEventListener("resize", update, { passive: true });
    return () => window.removeEventListener("resize", update);
  }, []);

  return pixelSize;
}
