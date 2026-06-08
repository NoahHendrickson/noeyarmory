"use client";

import { useEffect, useState } from "react";
import { Dither, FlowingGradient, Group, ImageTexture, Shader } from "shaders/react";

import { useDitherPixelSize } from "../lib/shader-dither-size";
import { useShaderPreference } from "../lib/shader-preference";
import { scheduleIdle } from "../lib/schedule-idle";

const TEXTURE_URL = "/shaders/texture-primary.jpg";

export function ShaderBackground() {
  const { enabled, webgpuSupported } = useShaderPreference();
  const ditherPixelSize = useDitherPixelSize();
  const [mounted, setMounted] = useState(false);
  const [idleReady, setIdleReady] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    return scheduleIdle(() => setIdleReady(true));
  }, []);

  useEffect(() => {
    const onVisibilityChange = () => setVisible(!document.hidden);
    onVisibilityChange();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  if (!mounted || !idleReady || !enabled || webgpuSupported !== true || !visible) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-60 [contain:strict] isolate"
      aria-hidden
    >
      <Shader className="size-full" disableTelemetry>
        <ImageTexture url={TEXTURE_URL} />
        <Group>
          <FlowingGradient />
          <Dither colorB="#1c90e8" pixelSize={ditherPixelSize} visible />
        </Group>
      </Shader>
    </div>
  );
}
