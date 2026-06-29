"use client";

import type { ReactNode } from "react";

import { WeaponDetailHeaderChrome } from "./weapon-detail-header-chrome";
import { WeaponSearchPalette, type WeaponSearchSelectionSource } from "./weapon-search-palette";

function WeaponDetailAppHeader({
  onSelectWeapon,
}: {
  onSelectWeapon: (hash: number, source: WeaponSearchSelectionSource) => void;
}) {
  return (
    <WeaponDetailHeaderChrome
      searchSlot={
        <WeaponSearchPalette
          onSelectWeapon={onSelectWeapon}
          className="mx-auto max-w-md sm:w-full"
          paletteClassName="mx-0 max-w-none sm:w-full"
          floatingPanel
          size="compact"
          restoreSession
          autoOpenRestoredSession={false}
        />
      }
    />
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
