"use client";

import { useEffect, useState } from "react";
import { Aurora, ChromaFlow, Dither, Shader } from "shaders/react";

import { useShaderPreference } from "../lib/shader-preference";

export function ShaderBackground() {
  const { enabled, webgpuSupported } = useShaderPreference();
  const [mounted, setMounted] = useState(false);

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
        <Dither colorMode="source" pixelSize={7} />
      </Shader>
    </div>
  );
}
