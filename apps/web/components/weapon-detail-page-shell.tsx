"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { WeaponSearchPalette, type WeaponSearchSelectionSource } from "./weapon-search-palette";

function WeaponDetailAppHeader({
  onSelectWeapon,
}: {
  onSelectWeapon: (hash: number, source: WeaponSearchSelectionSource) => void;
}) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background px-[max(1rem,env(safe-area-inset-right))] py-2 pl-[max(1rem,env(safe-area-inset-left))]">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-2 sm:grid-cols-[1fr_minmax(0,28rem)_1fr] sm:items-center">
        <Link
          href="/"
          className="font-pixel justify-self-center text-sm font-bold sm:justify-self-start sm:text-left"
        >
          moonfang armory
        </Link>
        <div className="min-w-0 sm:col-start-2 sm:row-start-1">
          <WeaponSearchPalette
            onSelectWeapon={onSelectWeapon}
            className="mx-auto max-w-md sm:w-full"
            paletteClassName="mx-0 max-w-none sm:w-full"
            floatingPanel
            size="compact"
            restoreSession
            autoOpenRestoredSession={false}
          />
        </div>
      </div>
    </header>
  );
}

export function WeaponDetailPageShell({
  onSelectWeapon,
  children,
}: {
  onSelectWeapon: (hash: number, source: WeaponSearchSelectionSource) => void;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <WeaponDetailAppHeader onSelectWeapon={onSelectWeapon} />
      {children}
    </div>
  );
}
