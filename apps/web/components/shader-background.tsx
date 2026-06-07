"use client";

import { useEffect, useState } from "react";
import { Aurora, ChromaFlow, Dither, Shader } from "shaders/react";

import { useShaderPreference } from "../lib/shader-preference";

/** Dither pixel size tuned for ~1920px-wide viewports; scales with screen width. */
const REFERENCE_VIEWPORT_WIDTH = 1920;
const BASE_DITHER_PIXEL_SIZE = 7;
const MIN_DITHER_PIXEL_SIZE = 1;
const MAX_DITHER_PIXEL_SIZE = 20;

function ditherPixelSizeForWidth(width: number): number {
  const scaled = Math.round((BASE_DITHER_PIXEL_SIZE * width) / REFERENCE_VIEWPORT_WIDTH);
  return Math.min(MAX_DITHER_PIXEL_SIZE, Math.max(MIN_DITHER_PIXEL_SIZE, scaled));
}

function useDitherPixelSize(): number {
  const [pixelSize, setPixelSize] = useState(BASE_DITHER_PIXEL_SIZE);

  useEffect(() => {
    const update = () => setPixelSize(ditherPixelSizeForWidth(window.innerWidth));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return pixelSize;
}

export function ShaderBackground() {
  const { enabled, webgpuSupported } = useShaderPreference();
  const [mounted, setMounted] = useState(false);
  const ditherPixelSize = useDitherPixelSize();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !enabled || webgpuSupported !== true) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-[0.22]"
      aria-hidden
    >
      <Shader className="size-full">
        <ChromaFlow
          baseColor="#00ffff"
          downColor="#ea00ff"
          leftColor="#bfe66a"
          rightColor="#6be637"
          visible={false}
        />
        <Aurora
          colorA="#33f87e"
          colorB="#22ee44"
          colorC="#1a97eb"
          intensity={99}
          rayDensity={18}
          transform={{ rotation: 180 }}
          waviness={133}
        />
        <Dither colorMode="source" pixelSize={ditherPixelSize} />
      </Shader>
    </div>
  );
}
