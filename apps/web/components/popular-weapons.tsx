"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { WeaponSummary } from "@repo/destiny";

import { bungieIcon } from "../lib/bungie";
import { useWeaponIconMaps } from "../lib/use-weapon-icon-maps";
import { useWeapons } from "../lib/weapons-context";
import { AmmoIcon } from "./ammo-icon";
import { CraftableBadge } from "./craftable-badge";
import { ElementIcon } from "./element-icon";
import { weaponTypeLabel } from "./weapon-result-row";

interface PopularWeaponResponse {
  weapons: { hash: number; views: number }[];
}

function PopularWeaponCard({
  weapon,
  onSelect,
  elementIconPath,
  ammoIconPath,
}: {
  weapon: WeaponSummary;
  onSelect: (hash: number) => void;
  elementIconPath?: string;
  ammoIconPath?: string;
}) {
  const icon = bungieIcon(weapon.icon);
  const watermark = bungieIcon(weapon.watermark);

  return (
    <button
      type="button"
      onClick={() => onSelect(weapon.hash)}
      className="group bg-card/80 hover:border-ring/60 w-full rounded-lg border p-3 text-left transition-colors"
    >
      <div className="flex gap-3">
        <div className="relative size-14 shrink-0 overflow-hidden rounded">
          {icon ? (
            <Image src={icon} alt="" width={56} height={56} className="size-14" unoptimized />
          ) : null}
          {watermark ? (
            <Image
              src={watermark}
              alt=""
              width={56}
              height={56}
              className="absolute inset-0 size-14"
              unoptimized
            />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="group-hover:text-primary truncate font-medium transition-colors">
            {weapon.name}
          </div>
          <div className="text-muted-foreground inline-flex items-center gap-2 text-sm">
            <span className="inline-flex items-center gap-1">
              <ElementIcon element={weapon.element} iconPath={elementIconPath} colored />
              <AmmoIcon ammo={weapon.ammo} iconPath={ammoIconPath} className="size-7" />
              <span className="sr-only">
                {weapon.element}, {weapon.ammo}
              </span>
            </span>
            {weaponTypeLabel(weapon.type, weapon.frame)}
          </div>
          {weapon.craftable ? (
            <div className="mt-1.5">
              <CraftableBadge />
            </div>
          ) : null}
        </div>
      </div>
    </button>
  );
}

export function PopularWeapons({ onSelectWeapon }: { onSelectWeapon: (hash: number) => void }) {
  const { byHash } = useWeapons();
  const { elementIconMap, ammoIconMap } = useWeaponIconMaps();
  const [weapons, setWeapons] = useState<WeaponSummary[]>([]);

  useEffect(() => {
    let cancelled = false;

    void fetch("/api/popular-weapons")
      .then((response) => {
        if (!response.ok) throw new Error("popular-weapons unavailable");
        return response.json() as Promise<PopularWeaponResponse>;
      })
      .then((data) => {
        if (cancelled) return;
        if (data.weapons.length === 0) {
          setWeapons([]);
          return;
        }

        const resolved = data.weapons
          .map((entry) => byHash.get(entry.hash))
          .filter((weapon): weapon is WeaponSummary => weapon != null);

        // Only show when every Redis entry resolves in the local weapon index.
        setWeapons(resolved.length === data.weapons.length ? resolved : []);
      })
      .catch(() => {
        if (!cancelled) setWeapons([]);
      });

    return () => {
      cancelled = true;
    };
  }, [byHash]);

  if (weapons.length === 0) return null;

  return (
    <section className="mx-auto mt-14 w-full max-w-3xl sm:mt-16">
      <h2 className="text-muted-foreground mb-3 text-center text-xs font-semibold tracking-wide">
        Popular lately
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {weapons.map((weapon) => (
          <PopularWeaponCard
            key={weapon.hash}
            weapon={weapon}
            onSelect={onSelectWeapon}
            elementIconPath={elementIconMap.get(weapon.element)}
            ammoIconPath={ammoIconMap.get(weapon.ammo)}
          />
        ))}
      </div>
    </section>
  );
}
