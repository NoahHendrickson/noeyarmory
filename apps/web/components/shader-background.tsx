"use client";

import { useEffect, useState } from "react";
import {
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

export function ShaderBackground() {
  const { enabled, webgpuSupported } = useShaderPreference();
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const onVisibilityChange = () => setVisible(!document.hidden);
    onVisibilityChange();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  if (!mounted || !enabled || webgpuSupported !== true || !visible) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-50"
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
