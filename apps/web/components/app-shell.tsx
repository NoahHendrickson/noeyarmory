"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { TooltipProvider } from "@repo/ui";

import { ClarityProvider } from "../lib/clarity-provider";
import { WeaponsProvider } from "../lib/weapons-context";
import { AppBackground } from "./app-background";
import { MoonfangScreensaver } from "./moonfang-screensaver";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const showSiteTitle = pathname === "/";
  const isWeaponDetailPage = pathname.startsWith("/weapon/");

  return (
    <TooltipProvider delay={300}>
      <WeaponsProvider>
        <ClarityProvider>
          {!isWeaponDetailPage ? <AppBackground /> : null}
          {!isWeaponDetailPage ? <MoonfangScreensaver /> : null}
          <div className="relative z-10">
            {showSiteTitle ? (
              <header className="sticky top-0 z-50 flex justify-center px-[max(0.75rem,env(safe-area-inset-right))] pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 pl-[max(0.75rem,env(safe-area-inset-left))]">
                <span className="font-pixel text-base font-bold">moonfang armory</span>
              </header>
            ) : null}
            {children}
          </div>
        </ClarityProvider>
      </WeaponsProvider>
    </TooltipProvider>
  );
}
