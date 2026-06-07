"use client";

import type { ReactNode } from "react";
import { FeedbackDialog, TooltipProvider } from "@repo/ui";

import { ClarityProvider } from "../lib/clarity-provider";
import { ShaderPreferenceProvider } from "../lib/shader-preference";
import { WeaponsProvider } from "../lib/weapons-context";
import { ChangelogDialog } from "./changelog-dialog";
import { MoonfangScreensaver } from "./moonfang-screensaver";
import { ShaderBackground } from "./shader-background";
import { ShaderToggle } from "./shader-toggle";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider delay={300}>
      <WeaponsProvider>
        <ClarityProvider>
          <ShaderPreferenceProvider>
            <ShaderBackground />
            <MoonfangScreensaver />
            <div className="relative z-10">
              <div className="pointer-events-none fixed top-[max(0.75rem,env(safe-area-inset-top))] right-[max(0.75rem,env(safe-area-inset-right))] z-50">
                <div className="pointer-events-auto flex items-center gap-2 sm:gap-3">
                  <ShaderToggle />
                  <ChangelogDialog />
                  <FeedbackDialog />
                </div>
              </div>
              {children}
            </div>
          </ShaderPreferenceProvider>
        </ClarityProvider>
      </WeaponsProvider>
    </TooltipProvider>
  );
}
