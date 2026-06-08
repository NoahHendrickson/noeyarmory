"use client";

import { useEffect, useState } from "react";
import {
  Aurora,
  ChromaFlow,
  Dither,
  FlowingGradient,
  Group,
  ImageTexture,
  Shader,
  SineWave,
} from "shaders/react";

import { useShaderPreference } from "../lib/shader-preference";

const TEXTURE_URLS = [
  "/shaders/texture-primary.jpg",
  "/shaders/texture-alt-1.jpg",
  "/shaders/texture-alt-2.jpg",
] as const;

/** Dither pixel size tuned for ~1920px-wide viewports; scales with screen width. */
const REFERENCE_VIEWPORT_WIDTH = 1920;
const BASE_DITHER_PIXEL_SIZE = 6;
const MIN_DITHER_PIXEL_SIZE = 1;
const MAX_DITHER_PIXEL_SIZE = 20;
/** Finer grain on 2560×1440 panels (width-scaled default would be ~8). */
const QHD_DITHER_PIXEL_SIZE = 2;

function isQhdMonitor(): boolean {
  const { width, height } = window.screen;
  return width >= 2400 && width <= 2800 && height >= 1300 && height <= 1600;
}

function ditherPixelSizeForViewport(innerWidth: number): number {
  if (isQhdMonitor()) return QHD_DITHER_PIXEL_SIZE;
  const scaled = Math.round((BASE_DITHER_PIXEL_SIZE * innerWidth) / REFERENCE_VIEWPORT_WIDTH);
  return Math.min(MAX_DITHER_PIXEL_SIZE, Math.max(MIN_DITHER_PIXEL_SIZE, scaled));
}

function useDitherPixelSize(): number {
  const [pixelSize, setPixelSize] = useState(BASE_DITHER_PIXEL_SIZE);

  useEffect(() => {
    const update = () => setPixelSize(ditherPixelSizeForViewport(window.innerWidth));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return pixelSize;
}

function useBundledTexturesAvailable(): boolean | null {
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;

    void Promise.all(
      TEXTURE_URLS.map(
        (url) =>
          new Promise<boolean>((resolve) => {
            const image = new Image();
            image.onload = () => resolve(true);
            image.onerror = () => resolve(false);
            image.src = url;
          }),
      ),
    ).then((results) => {
      if (active) setAvailable(results.every(Boolean));
    });

    return () => {
      active = false;
    };
  }, []);

  return available;
}

function ProceduralShaderBackground({ opacityClass }: { opacityClass: string }) {
  const ditherPixelSize = useDitherPixelSize();

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-0 overflow-hidden ${opacityClass}`}
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

function TexturedShaderBackground({ opacityClass }: { opacityClass: string }) {
  return (
    <div
      className={`pointer-events-none fixed inset-0 z-0 overflow-hidden ${opacityClass}`}
      aria-hidden
    >
      <Shader className="size-full">
        <ImageTexture url={TEXTURE_URLS[0]} />
        <ImageTexture url={TEXTURE_URLS[1]} visible={false} />
        <ImageTexture url={TEXTURE_URLS[2]} visible={false} />
        <Group>
          <SineWave visible={false} />
          <FlowingGradient />
          <Dither colorB="#1c90e8" visible />
        </Group>
      </Shader>
    </div>
  );
}

export function ShaderBackground() {
  const { enabled, webgpuSupported } = useShaderPreference();
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(true);
  const texturesAvailable = useBundledTexturesAvailable();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const onVisibilityChange = () => setVisible(!document.hidden);
    onVisibilityChange();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  if (!mounted || !enabled || webgpuSupported !== true || !visible || texturesAvailable === null) {
    return null;
  }

  if (texturesAvailable) {
    return <TexturedShaderBackground opacityClass="opacity-50" />;
  }

  return <ProceduralShaderBackground opacityClass="opacity-[0.22]" />;
}
