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
}

const ShaderPreferenceContext = createContext<ShaderPreferenceContextValue | null>(null);

export function ShaderPreferenceProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        setEnabledState(stored === "true");
      }
    } catch {
      // Ignore storage read failures.
    }
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
    <ShaderPreferenceContext.Provider value={{ enabled, setEnabled }}>
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
