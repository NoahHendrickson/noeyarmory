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
              <header className="pointer-events-none sticky top-0 z-50 flex justify-end px-[max(0.75rem,env(safe-area-inset-right))] pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 pl-[max(0.75rem,env(safe-area-inset-left))]">
                <div className="pointer-events-auto flex items-center gap-2 sm:gap-3">
                  <ShaderToggle />
                  <ChangelogDialog />
                  <FeedbackDialog />
                </div>
              </header>
              {children}
            </div>
          </ShaderPreferenceProvider>
        </ClarityProvider>
      </WeaponsProvider>
    </TooltipProvider>
  );
}
