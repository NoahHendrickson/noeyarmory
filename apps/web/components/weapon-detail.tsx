"use client";

import Image from "next/image";
import Link from "next/link";
import { Badge, cn } from "@repo/ui";

import { useWeapons } from "../lib/use-weapons";
import { bungieIcon, ELEMENT_COLOR, RARITY_RING } from "../lib/bungie";
import { PerkColumnView } from "./perk-column";
import { StatBars } from "./stat-bars";

export function WeaponDetail({ hash }: { hash: number }) {
  const { weapons, loading } = useWeapons();

  if (loading) {
    return <div className="text-muted-foreground p-6">Loading…</div>;
  }

  const weapon = weapons.find((w) => w.hash === hash);
  if (!weapon) {
    return (
      <div className="space-y-2 p-6">
        <p>Weapon not found.</p>
        <Link href="/" className="text-sm underline">
          ← Back to search
        </Link>
      </div>
    );
  }

  const icon = bungieIcon(weapon.icon);
  const watermark = bungieIcon(weapon.watermark);

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-4 md:p-6">
      <Link href="/" className="text-muted-foreground hover:text-foreground text-sm">
        ← Back to search
      </Link>

      <header className="flex flex-col gap-4 sm:flex-row">
        <div
          className={cn(
            "relative size-20 shrink-0 overflow-hidden rounded ring-1",
            RARITY_RING[weapon.rarity] ?? "ring-border",
          )}
        >
          {icon && (
            <Image src={icon} alt="" width={80} height={80} className="size-20" unoptimized />
          )}
          {watermark && (
            <Image
              src={watermark}
              alt=""
              width={80}
              height={80}
              className="absolute inset-0 size-20"
              unoptimized
            />
          )}
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">{weapon.name}</h1>
          <div className="text-muted-foreground mt-0.5">
            <span className={ELEMENT_COLOR[weapon.element] ?? ""}>{weapon.element}</span>
            {" · "}
            {weapon.type}
            {" · "}
            {weapon.rarity}
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            <Badge variant="outline">{weapon.ammo}</Badge>
            {weapon.frame && <Badge variant="secondary">{weapon.frame}</Badge>}
            {weapon.adept && <Badge>Adept</Badge>}
          </div>
          {weapon.flavor && (
            <p className="text-muted-foreground mt-3 max-w-prose text-sm italic">{weapon.flavor}</p>
          )}
        </div>
      </header>

      <section>
        <h2 className="text-muted-foreground mb-3 text-sm font-semibold tracking-wide uppercase">
          Perks
        </h2>
        {weapon.columns.length > 0 ? (
          <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            {weapon.columns.map((column, i) => (
              <PerkColumnView key={`${column.kind}-${i}`} column={column} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">No perk data.</p>
        )}
      </section>

      <section>
        <h2 className="text-muted-foreground mb-3 text-sm font-semibold tracking-wide uppercase">
          Stats
        </h2>
        <StatBars stats={weapon.stats} />
      </section>
    </div>
  );
}
