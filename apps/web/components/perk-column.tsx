import Image from "next/image";
import Link from "next/link";
import { cn } from "@repo/ui";
import type { PerkRef, PerkColumn } from "@repo/destiny";

import { bungieIcon } from "../lib/bungie";

/** Safety net for stale indexes that still list base + enhanced separately. */
function dedupePerksByName(perks: PerkRef[]): PerkRef[] {
  const byName = new Map<string, PerkRef>();
  for (const perk of perks) {
    if (!byName.has(perk.name)) byName.set(perk.name, perk);
  }
  return [...byName.values()];
}

/** One perk icon tile (light.gg-style): blue tile when rollable, grey when retired. */
function PerkTile({
  perk,
  linkPerks,
  size = "md",
}: {
  perk: PerkRef;
  linkPerks: boolean;
  size?: "md" | "lg";
}) {
  const icon = bungieIcon(perk.icon);
  const canRoll = perk.currentlyCanRoll;
  const dim = size === "lg" ? "size-10" : "size-8";
  const img = size === "lg" ? 40 : 32;

  const tile = (
    <span
      title={perk.name}
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-md",
        dim,
        canRoll ? "bg-[#3b6ea5]" : "bg-white/10 opacity-45",
      )}
    >
      {icon ? (
        <Image
          src={icon}
          alt=""
          width={img}
          height={img}
          className={cn("object-contain", size === "lg" ? "size-8" : "size-6")}
          unoptimized
        />
      ) : (
        <span className="bg-muted size-6 rounded-full" />
      )}
    </span>
  );

  if (linkPerks) {
    return (
      <Link
        href={`/perk/${perk.hash}`}
        title={`See every weapon that can roll ${perk.name}`}
        className="rounded-md transition-opacity hover:opacity-80"
      >
        {tile}
      </Link>
    );
  }
  return tile;
}

/**
 * One weapon perk column (light.gg-style): label over a vertical stack of perk
 * icons. Retired perks are dimmed. Intrinsic is
 * rendered as a single larger icon when passed alone.
 */
export function PerkColumnView({
  column,
  linkPerks = true,
  /** Intrinsic columns use a larger lone icon with no header. */
  compactIntrinsic = false,
}: {
  column: PerkColumn;
  linkPerks?: boolean;
  compactIntrinsic?: boolean;
}) {
  if (compactIntrinsic && column.kind === "Intrinsic" && column.perks[0]) {
    return <PerkTile perk={column.perks[0]} linkPerks={linkPerks} size="lg" />;
  }

  return (
    <div className="flex shrink-0 flex-col gap-1.5">
      <div className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
        {column.kind}
      </div>
      <div className="flex flex-col gap-1">
        {dedupePerksByName(column.perks).map((perk) => (
          <PerkTile key={perk.hash} perk={perk} linkPerks={linkPerks} />
        ))}
      </div>
    </div>
  );
}
