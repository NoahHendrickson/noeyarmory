"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { FeedbackDialog, TooltipProvider } from "@repo/ui";

import { ClarityProvider } from "../lib/clarity-provider";
import { WeaponsProvider } from "../lib/weapons-context";
import { AppBackground } from "./app-background";
import { ChangelogDialog } from "./changelog-dialog";
import { MoonfangScreensaver } from "./moonfang-screensaver";
import { NewArmorButton } from "./new-armor-button";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const showSiteTitle = pathname === "/";

  return (
    <TooltipProvider delay={300}>
      <WeaponsProvider>
        <ClarityProvider>
          <AppBackground />
          <MoonfangScreensaver />
          <div className="relative z-10">
            <header className="pointer-events-none sticky top-0 z-50 grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-[max(0.75rem,env(safe-area-inset-right))] pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 pl-[max(0.75rem,env(safe-area-inset-left))]">
              <div aria-hidden="true" />
              {showSiteTitle ? (
                <span className="font-pixel text-base font-bold">moonfang armory</span>
              ) : (
                <div aria-hidden="true" />
              )}
              <div className="pointer-events-auto flex items-center justify-end gap-2 sm:gap-3">
                <NewArmorButton />
                <ChangelogDialog />
                <FeedbackDialog />
              </div>
            </header>
            {children}
          </div>
        </ClarityProvider>
      </WeaponsProvider>
    </TooltipProvider>
  );
}
