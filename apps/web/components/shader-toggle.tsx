"use client";

import { Check } from "lucide-react";

import { cn } from "@repo/ui";

import { useShaderPreference } from "../lib/shader-preference";

function toggleTitle(
  enabled: boolean,
  webgpuSupported: boolean | null,
): string {
  if (webgpuSupported === false) {
    return "Pretty shader requires WebGPU (update your browser)";
  }
  if (webgpuSupported === null) {
    return "Checking WebGPU support…";
  }
  return enabled ? "Pretty shader on" : "Pretty shader off";
}

export function ShaderToggle() {
  const { enabled, setEnabled, webgpuSupported } = useShaderPreference();
  const disabled = webgpuSupported === false;

  return (
    <label
      className={cn(
        "flex h-7 cursor-pointer items-center gap-2 rounded-[8px] border border-white/16 bg-white/[0.04] px-2 text-xs font-medium text-white transition-colors hover:bg-white/10",
        disabled && "cursor-not-allowed opacity-50 hover:bg-white/[0.04]",
      )}
      title={toggleTitle(enabled, webgpuSupported)}
    >
      <span className="relative inline-flex size-3.5 shrink-0">
        <input
          type="checkbox"
          checked={disabled ? false : enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          disabled={disabled}
          className="peer sr-only"
        />
        <span
          aria-hidden
          className={cn(
            "flex size-full items-center justify-center rounded-[4px] border transition-colors",
            "border-input bg-transparent",
            "peer-checked:border-primary peer-checked:bg-primary",
            "peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:outline-none",
            "peer-disabled:cursor-not-allowed",
          )}
        >
          {enabled && !disabled ? (
            <Check className="size-2.5 text-primary-foreground" strokeWidth={3} aria-hidden />
          ) : null}
        </span>
      </span>
      Pretty shader
    </label>
  );
}
