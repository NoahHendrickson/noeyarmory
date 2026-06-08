"use client";

import { useEffect, useState, type ComponentType } from "react";

import { useShaderPreference } from "../lib/shader-preference";

/**
 * Loads the WebGPU shader background only when the user has it enabled and the
 * browser supports WebGPU. Keeps ~1MB of shaders/three.js out of the initial bundle.
 */
export function ShaderBackgroundLoader() {
  const { enabled, webgpuSupported } = useShaderPreference();
  const [ShaderBackground, setShaderBackground] = useState<ComponentType | null>(null);

  useEffect(() => {
    if (!enabled || webgpuSupported !== true) {
      setShaderBackground(null);
      return;
    }

    let cancelled = false;
    void import("./shader-background").then((mod) => {
      if (!cancelled) setShaderBackground(() => mod.ShaderBackground);
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, webgpuSupported]);

  return ShaderBackground ? <ShaderBackground /> : null;
}
