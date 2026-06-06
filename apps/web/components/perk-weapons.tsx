"use client";

import Link from "next/link";
import type { WeaponDoc } from "@repo/destiny";

import { useWeapons } from "../lib/weapons-context";
import { WeaponCard } from "./weapon-card";

export function PerkWeapons({
  hash,
  initialPerkName,
  initialMatches,
}: {
  hash: number;
  initialPerkName?: string;
  initialMatches?: WeaponDoc[];
}) {
  const { perkMap, weaponsByPerkName, weapons, loading } = useWeapons();

  const hasSeed = initialMatches !== undefined;
  if (!hasSeed && loading) {
    return <div className="text-muted-foreground p-6">Loading…</div>;
  }

  const perk = perkMap.get(hash);
  const perkName = initialPerkName ?? perk?.name;
  const matches =
    initialMatches ??
    (perkName
      ? (weaponsByPerkName.get(perkName.toLowerCase()) ?? [])
      : weapons.filter((w) => w.perkHashes.includes(hash)));

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <Link href="/" className="text-muted-foreground hover:text-foreground text-sm">
        ← Back to search
      </Link>

      <div>
        <div className="text-muted-foreground text-xs tracking-wide uppercase">
          Weapons that can roll
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{perkName ?? "Unknown perk"}</h1>
        <p className="text-muted-foreground text-sm">
          {matches.length} weapon{matches.length === 1 ? "" : "s"}
        </p>
      </div>

      {matches.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {matches.map((weapon) => (
            <WeaponCard key={weapon.hash} weapon={weapon} />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">No weapons found for this perk.</p>
      )}
    </div>
  );
}
