"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "noeyarmory-shader-background";

interface ShaderPreferenceContextValue {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  /** null while probing WebGPU support */
  webgpuSupported: boolean | null;
}

const ShaderPreferenceContext = createContext<ShaderPreferenceContextValue | null>(null);

function readStoredPreference(): boolean | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) return stored === "true";
  } catch {
    // Ignore storage read failures.
  }
  return null;
}

function readDefaultEnabled(): boolean {
  const stored = readStoredPreference();
  if (stored !== null) return stored;
  if (typeof window === "undefined") return true;

  // Respect reduced motion until the user explicitly opts in via the toggle.
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;

  // Avoid defaulting on when the user asked the browser to save data.
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (connection?.saveData) return false;

  // Low-memory devices struggle with full-viewport WebGPU rendering.
  const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (deviceMemory !== undefined && deviceMemory <= 4) return false;

  return true;
}

async function probeWebGpu(): Promise<boolean> {
  if (typeof navigator === "undefined" || !("gpu" in navigator) || !navigator.gpu) {
    return false;
  }
  try {
    const adapter = await navigator.gpu.requestAdapter();
    return adapter !== null;
  } catch {
    return false;
  }
}

export function ShaderPreferenceProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState(true);
  const [webgpuSupported, setWebgpuSupported] = useState<boolean | null>(null);

  useEffect(() => {
    setEnabledState(readDefaultEnabled());
    void probeWebGpu().then(setWebgpuSupported);
  }, []);

  const setEnabled = useCallback((next: boolean) => {
    setEnabledState(next);
    try {
      localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      // Ignore storage write failures.
    }
  }, []);

  return (
    <ShaderPreferenceContext.Provider value={{ enabled, setEnabled, webgpuSupported }}>
      {children}
    </ShaderPreferenceContext.Provider>
  );
}

export function useShaderPreference(): ShaderPreferenceContextValue {
  const value = useContext(ShaderPreferenceContext);
  if (!value) {
    throw new Error("useShaderPreference must be used within ShaderPreferenceProvider");
  }
  return value;
}
