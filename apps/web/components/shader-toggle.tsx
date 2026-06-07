"use client";

import { Switch } from "@repo/ui";

import { useShaderPreference } from "../lib/shader-preference";

function toggleTitle(
  enabled: boolean,
  webgpuSupported: boolean | null,
): string {
  if (webgpuSupported === false) {
    return "Background animation requires WebGPU (update your browser)";
  }
  if (webgpuSupported === null) {
    return "Checking WebGPU support…";
  }
  return enabled ? "Background animation on" : "Background animation off";
}

export function ShaderToggle() {
  const { enabled, setEnabled, webgpuSupported } = useShaderPreference();
  const disabled = webgpuSupported === false;

  return (
    <Switch
      checked={disabled ? false : enabled}
      onCheckedChange={setEnabled}
      disabled={disabled}
      aria-label="Background animation"
      title={toggleTitle(enabled, webgpuSupported)}
    />
  );
}
