"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { TooltipProvider } from "@repo/ui";

import { ClarityProvider } from "../lib/clarity-provider";
import { WeaponsProvider } from "../lib/weapons-context";

const ShaderBackground = dynamic(
  () => import("./shader-background").then((m) => m.ShaderBackground),
  { ssr: false },
);

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider delay={300}>
      <WeaponsProvider>
        <ClarityProvider>
          <ShaderBackground />
          <div className="relative z-10">{children}</div>
        </ClarityProvider>
      </WeaponsProvider>
    </TooltipProvider>
  );
}
