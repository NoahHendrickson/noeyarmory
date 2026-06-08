"use client";

import { useEffect, useState } from "react";
import { Dither, FlowingGradient, Group, ImageTexture, Shader } from "shaders/react";

import { useShaderPreference } from "../lib/shader-preference";

const TEXTURE_URL = "/shaders/texture-primary.jpg";

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
      <Shader className="size-full" disableTelemetry colorSpace="srgb">
        <ImageTexture url={TEXTURE_URL} />
        <Group>
          <FlowingGradient />
          <Dither colorB="#1c90e8" visible />
        </Group>
      </Shader>
    </div>
  );
}
