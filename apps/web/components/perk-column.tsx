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
            <div className="text-muted-foreground/80 mb-1 text-[10px] font-semibold tracking-wide uppercase">
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
              <div className="text-[#eade8b] text-[10px] font-semibold tracking-wide uppercase">
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
  clarityDescriptions,
}: {
  perk: PerkRef;
  linkPerks: boolean;
  size?: "md" | "lg";
  clarityDescriptions: ClarityDescriptionMap | null;
}) {
  const tiers = getClarityPerkTiers(clarityDescriptions, perk);
  const clarityLines = getClarityDisplayLines(tiers);
  const icon = bungieIcon(perk.icon);
  const canRoll = perk.currentlyCanRoll;
  const dim = size === "lg" ? "size-10" : "size-8";
  const img = size === "lg" ? 40 : 32;

  const tile = (
    <span
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
        <TooltipPositioner side="right" align="start">
          <TooltipPopup className="max-w-sm">
            <PerkTooltipContent perk={perk} clarityLines={clarityLines} />
          </TooltipPopup>
        </TooltipPositioner>
      </TooltipPortal>
    </Tooltip>
  );
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
  clarityDescriptions,
}: {
  column: PerkColumn;
  linkPerks?: boolean;
  compactIntrinsic?: boolean;
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
        clarityDescriptions={descriptions}
      />
    );
  }

  return (
    <div className="flex shrink-0 flex-col gap-1.5">
      <div className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
        {column.kind}
      </div>
      <div className="flex flex-col gap-1">
        {dedupePerksByName(column.perks).map((perk) => (
          <PerkTile
            key={perk.hash}
            perk={perk}
            linkPerks={linkPerks}
            clarityDescriptions={descriptions}
          />
        ))}
      </div>
    </div>
  );
}
