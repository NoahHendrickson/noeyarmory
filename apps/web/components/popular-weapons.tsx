"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { primaryCatalogWeaponForHash, type WeaponSummary } from "@repo/destiny";

import { bungieIcon } from "../lib/bungie";
import { loadPopularWeapons } from "../lib/use-search-popularity";
import { useWeaponIconMaps } from "../lib/use-weapon-icon-maps";
import { useWeapons } from "../lib/weapons-context";
import { AmmoIcon } from "./ammo-icon";
import { CraftableBadge } from "./craftable-badge";
import { ElementIcon } from "./element-icon";
import { weaponTypeLabel } from "./weapon-result-row";

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
      className="group w-full rounded-lg border bg-card/80 p-3 text-left transition-colors hover:border-ring/60"
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
          <div className="truncate font-medium transition-colors group-hover:text-primary">
            {weapon.name}
          </div>
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
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
  const { byHash, nameIndex } = useWeapons();
  const { elementIconMap, ammoIconMap } = useWeaponIconMaps();
  const [weapons, setWeapons] = useState<WeaponSummary[]>([]);

  useEffect(() => {
    let cancelled = false;

    void loadPopularWeapons()
      .then((entries) => {
        if (cancelled) return;
        if (entries.length === 0) {
          setWeapons([]);
          return;
        }

        const resolved: WeaponSummary[] = [];
        const seen = new Set<number>();
        let missing = false;
        for (const entry of entries) {
          const weapon = primaryCatalogWeaponForHash(entry.hash, byHash, nameIndex.byName);
          if (!weapon) {
            missing = true;
            break;
          }
          if (seen.has(weapon.hash)) continue;
          seen.add(weapon.hash);
          resolved.push(weapon);
        }

        // Only show when every Redis entry resolves in the local weapon index.
        setWeapons(missing ? [] : resolved);
      })
      .catch(() => {
        if (!cancelled) setWeapons([]);
      });

    return () => {
      cancelled = true;
    };
  }, [byHash, nameIndex]);

  if (weapons.length === 0) return null;

  return (
    <section className="mx-auto mt-14 w-full max-w-3xl sm:mt-16">
      <h2 className="mb-3 text-center text-xs font-semibold tracking-wide text-muted-foreground">
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
