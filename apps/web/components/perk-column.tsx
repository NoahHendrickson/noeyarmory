"use client";

import Image from "next/image";
import Link from "next/link";
import {
  cn,
  Tooltip,
  TooltipPortal,
  TooltipPopup,
  TooltipPositioner,
  TooltipTrigger,
} from "@repo/ui";
import type { PerkRef, PerkColumn } from "@repo/destiny";

import { ClarityAttribution, ClarityDescription } from "./clarity-description";
import { bungieIcon } from "../lib/bungie";
import type { ClarityDescriptionMap } from "../lib/clarity-types";
import {
  getClarityDisplayLines,
  getClarityPerkTiers,
  hasClarityOrBungieTooltip,
  useClarityDescriptions,
} from "../lib/clarity-provider";

/** Safety net for stale indexes that still list base + enhanced separately. */
function dedupePerksByName(perks: PerkRef[]): PerkRef[] {
  const byName = new Map<string, PerkRef>();
  for (const perk of perks) {
    if (!byName.has(perk.name)) byName.set(perk.name, perk);
  }
  return [...byName.values()];
}

function PerkTooltipContent({
  perk,
  clarityLines,
}: {
  perk: PerkRef;
  clarityLines?: ReturnType<typeof getClarityDisplayLines>;
}) {
  return (
    <div className="max-w-sm space-y-2">
      <div className="font-semibold">{perk.name}</div>

      {clarityLines && clarityLines.length > 0 ? (
        <>
          <div className="text-muted-foreground space-y-0.5 text-xs">
            <div className="text-muted-foreground/80 mb-1 text-sm font-semibold tracking-wide uppercase">
              Community research
            </div>
            <ClarityDescription lines={clarityLines} />
          </div>
          <ClarityAttribution />
        </>
      ) : (
        <>
          {perk.description && (
            <p className="text-muted-foreground text-xs leading-relaxed whitespace-pre-line">
              {perk.description}
            </p>
          )}
          {perk.enhancedDescription && (
            <div className="space-y-1 border-t border-white/10 pt-2">
              <div className="text-[#eade8b] text-sm font-semibold tracking-wide uppercase">
                Enhanced
              </div>
              <p className="text-muted-foreground text-xs leading-relaxed whitespace-pre-line">
                {perk.enhancedDescription}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** One perk icon tile (light.gg-style): blue tile when rollable, grey when retired. */
function PerkTile({
  perk,
  linkPerks,
  size = "md",
  highlighted = false,
  clarityDescriptions,
}: {
  perk: PerkRef;
  linkPerks: boolean;
  size?: "md" | "lg";
  highlighted?: boolean;
  clarityDescriptions: ClarityDescriptionMap | null;
}) {
  const tiers = getClarityPerkTiers(clarityDescriptions, perk);
  const clarityLines = getClarityDisplayLines(tiers);
  const icon = bungieIcon(perk.icon);
  const canRoll = perk.currentlyCanRoll;
  const tileDim = size === "lg" ? "size-14" : "size-12";
  const iconDim = size === "lg" ? "size-12" : "size-10";
  const imgPx = size === "lg" ? 48 : 40;

  const tile = (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-md",
        tileDim,
        canRoll ? "bg-[#3b6ea5]" : "bg-white/10 opacity-45",
        highlighted && "ring-2 ring-amber-400/90 ring-offset-2 ring-offset-background",
      )}
    >
      {icon ? (
        <Image
          src={icon}
          alt=""
          width={imgPx}
          height={imgPx}
          className={cn("object-contain", iconDim)}
          unoptimized
        />
      ) : (
        <span className={cn("bg-muted rounded-full", iconDim)} />
      )}
    </span>
  );

  if (!hasClarityOrBungieTooltip(perk, tiers)) {
    const wrapped = linkPerks ? (
      <Link
        href={`/perk/${perk.hash}`}
        className="inline-flex rounded-md transition-opacity hover:opacity-80"
      >
        {tile}
      </Link>
    ) : (
      tile
    );
    return (
      <span title={perk.name} className="inline-flex">
        {wrapped}
      </span>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger
        delay={0}
        render={
          linkPerks ? (
            <Link
              href={`/perk/${perk.hash}`}
              className="inline-flex rounded-md transition-opacity hover:opacity-80"
            />
          ) : (
            <span className="inline-flex" />
          )
        }
      >
        {tile}
      </TooltipTrigger>
      <TooltipPortal>
        <TooltipPositioner side="top" align="center" sideOffset={6}>
          <TooltipPopup className="max-w-sm">
            <PerkTooltipContent perk={perk} clarityLines={clarityLines} />
          </TooltipPopup>
        </TooltipPositioner>
      </TooltipPortal>
    </Tooltip>
  );
}

/** One weapon perk column: vertical stack of perk icons (light.gg-style). */
export function PerkColumnView({
  column,
  linkPerks = true,
  /** Intrinsic columns use a larger lone icon. */
  compactIntrinsic = false,
  highlightedPerks,
  clarityDescriptions,
}: {
  column: PerkColumn;
  linkPerks?: boolean;
  compactIntrinsic?: boolean;
  /** Lowercase perk names from the community DPS benchmark build. */
  highlightedPerks?: ReadonlySet<string>;
  clarityDescriptions?: ClarityDescriptionMap | null;
}) {
  const contextDescriptions = useClarityDescriptions();
  const descriptions = clarityDescriptions ?? contextDescriptions;

  if (compactIntrinsic && column.kind === "Intrinsic" && column.perks[0]) {
    return (
      <PerkTile
        perk={column.perks[0]}
        linkPerks={linkPerks}
        size="lg"
        highlighted={highlightedPerks?.has(column.perks[0].name.toLowerCase())}
        clarityDescriptions={descriptions}
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {dedupePerksByName(column.perks).map((perk) => (
        <PerkTile
          key={perk.hash}
          perk={perk}
          linkPerks={linkPerks}
          highlighted={highlightedPerks?.has(perk.name.toLowerCase())}
          clarityDescriptions={descriptions}
        />
      ))}
    </div>
  );
}
