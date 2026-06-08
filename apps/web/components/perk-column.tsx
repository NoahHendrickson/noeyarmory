"use client";

import Image from "next/image";
import Link from "next/link";
import { memo } from "react";
import type { ReactNode } from "react";
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
import type { ClarityDescriptionMap, ClarityLine } from "../lib/clarity-types";
import type { ClarityPerkTiers } from "../lib/clarity-provider";
import {
  getClarityDisplayLines,
  getClarityPerkTiers,
  hasClarityOrBungieTooltip,
  useClarityDescriptions,
} from "../lib/clarity-provider";

/** Match weapon detail modal / command palette frosted surfaces. */
const glassTooltipBase =
  "relative overflow-hidden border border-border bg-card/35 p-0 shadow-lg shadow-black/25 backdrop-blur-xl";

function perkTooltipMaxWidth(clarityLines: ClarityLine[] | undefined): string {
  if (!clarityLines?.length) return "max-w-md";

  const contentLines = clarityLines.filter((line) => !line.classNames?.includes("spacer"));
  const charCount = contentLines.reduce(
    (total, line) => total + (line.linesContent?.map((part) => part.text ?? "").join("").length ?? 0),
    0,
  );

  if (contentLines.length >= 5 || charCount > 320) return "max-w-lg";
  return "max-w-md";
}

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
  tiers,
  clarityLines,
}: {
  perk: PerkRef;
  tiers: ClarityPerkTiers;
  clarityLines?: ReturnType<typeof getClarityDisplayLines>;
}) {
  const hasEnhanced = Boolean(perk.enhancedDescription || tiers.enhanced);
  const hasClarity = clarityLines != null && clarityLines.length > 0;
  const showEnhancedText =
    perk.enhancedDescription != null &&
    perk.enhancedDescription !== perk.description;
  const hasBungieText = Boolean(perk.description || showEnhancedText);

  return (
    <div className="overflow-hidden rounded-md text-xs">
      <div className="px-3 pt-2.5 pb-2">
        <div className="text-foreground text-sm font-bold tracking-wide uppercase">
          {perk.name}
        </div>
        {hasEnhanced && (
          <div className="text-[#eade8b] mt-1.5 flex items-center gap-1 font-semibold">
            <span aria-hidden>↑</span>
            <span>Enhanced Trait</span>
          </div>
        )}
      </div>

      {hasBungieText && (
        <div className="border-border/40 bg-card/55 space-y-2.5 border-t px-3 py-2.5">
          {perk.description && (
            <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
              {perk.description}
            </p>
          )}
          {showEnhancedText && (
            <p className="text-muted-foreground/90 leading-relaxed whitespace-pre-line">
              {perk.enhancedDescription}
            </p>
          )}
        </div>
      )}

      {hasClarity && (
        <div className="border-border/40 bg-card/35 border-t px-3 py-2">
          <div className="text-muted-foreground/80 mb-1.5 text-[10px] font-semibold tracking-wide uppercase">
            Community Insight
          </div>
          <div className="text-muted-foreground">
            <ClarityDescription lines={clarityLines} />
          </div>
          <ClarityAttribution />
        </div>
      )}
    </div>
  );
}

/** One perk icon tile (light.gg-style): outline when rollable, grey when retired. */
const PerkTile = memo(function PerkTile({
  perk,
  linkPerks,
  size = "md",
  highlighted = false,
  selected = false,
  onSelect,
  onHover,
  onHoverEnd,
  clarityDescriptions,
}: {
  perk: PerkRef;
  linkPerks: boolean;
  size?: "md" | "lg";
  highlighted?: boolean;
  selected?: boolean;
  onSelect?: (perk: PerkRef) => void;
  onHover?: (perk: PerkRef) => void;
  onHoverEnd?: () => void;
  clarityDescriptions: ClarityDescriptionMap | null;
}) {
  const tiers = getClarityPerkTiers(clarityDescriptions, perk);
  const clarityLines = getClarityDisplayLines(tiers);
  const icon = bungieIcon(perk.icon);
  const canRoll = perk.currentlyCanRoll;
  const tileDim = size === "lg" ? "size-14" : "size-12";
  const iconDim = size === "lg" ? "size-9" : "size-8";
  const imgPx = size === "lg" ? 36 : 32;

  const hoverHandlers =
    onHover || onHoverEnd
      ? {
          onMouseEnter: () => onHover?.(perk),
          onMouseLeave: () => onHoverEnd?.(),
        }
      : undefined;

  const tile = (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-full border transition-colors",
        tileDim,
        canRoll
          ? selected
            ? "border-transparent bg-[#3b6ea5]"
            : "border-white/35 bg-transparent group-hover:bg-[#3b6ea5]/40"
          : "border-transparent bg-white/10 opacity-45",
        selected && "ring-2 ring-white ring-offset-1 ring-offset-background",
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
      {highlighted && (
        <span
          className="absolute -top-2 -right-2 text-3xl font-medium leading-none text-amber-400"
          title="Community DPS benchmark perk"
          aria-hidden
        >
          *
        </span>
      )}
    </span>
  );

  const wrapInteractive = (content: ReactNode) => {
    if (onSelect) {
      return (
        <button
          type="button"
          aria-label={perk.name}
          aria-pressed={selected}
          onClick={() => onSelect(perk)}
          {...hoverHandlers}
          className="group inline-flex rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {content}
        </button>
      );
    }
    if (linkPerks) {
      return (
        <Link
          href={`/perk/${perk.hash}`}
          className="group inline-flex rounded-full"
        >
          {content}
        </Link>
      );
    }
    return content;
  };

  if (!hasClarityOrBungieTooltip(perk, tiers)) {
    return (
      <span title={onSelect ? undefined : perk.name} className="inline-flex">
        {wrapInteractive(tile)}
      </span>
    );
  }

  return (
    <Tooltip disableHoverablePopup>
      <TooltipTrigger
        delay={0}
        render={
          onSelect ? (
            <button
              type="button"
              aria-label={perk.name}
              aria-pressed={selected}
              onClick={() => onSelect(perk)}
              {...hoverHandlers}
              className="group inline-flex rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          ) : linkPerks ? (
            <Link
              href={`/perk/${perk.hash}`}
              className="group inline-flex rounded-full"
            />
          ) : (
            <span className="inline-flex" />
          )
        }
      >
        {tile}
      </TooltipTrigger>
      <TooltipPortal>
        <TooltipPositioner
          side="right"
          align="center"
          sideOffset={2}
          collisionAvoidance={{
            side: "none",
            align: "none",
            fallbackAxisSide: "none",
          }}
        >
          <TooltipPopup
            className={cn(glassTooltipBase, perkTooltipMaxWidth(clarityLines), "pointer-events-none")}
          >
            <PerkTooltipContent perk={perk} tiers={tiers} clarityLines={clarityLines} />
          </TooltipPopup>
        </TooltipPositioner>
      </TooltipPortal>
    </Tooltip>
  );
});

/** One weapon perk column: vertical stack of perk icons (light.gg-style). */
export function PerkColumnView({
  column,
  linkPerks = true,
  highlightedPerks,
  selectedPerkHash,
  onSelectPerk,
  onHoverPerk,
  onHoverEnd,
  clarityDescriptions,
}: {
  column: PerkColumn;
  linkPerks?: boolean;
  /** Lowercase perk names from the community DPS benchmark build. */
  highlightedPerks?: ReadonlySet<string>;
  selectedPerkHash?: number;
  onSelectPerk?: (perk: PerkRef) => void;
  onHoverPerk?: (perk: PerkRef) => void;
  onHoverEnd?: () => void;
  clarityDescriptions?: ClarityDescriptionMap | null;
}) {
  const contextDescriptions = useClarityDescriptions();
  const descriptions = clarityDescriptions ?? contextDescriptions;

  return (
    <div className="flex flex-col gap-2 pt-2 pb-1.5">
      {dedupePerksByName(column.perks).map((perk) => (
        <PerkTile
          key={perk.hash}
          perk={perk}
          linkPerks={linkPerks}
          highlighted={highlightedPerks?.has(perk.name.toLowerCase())}
          selected={selectedPerkHash === perk.hash}
          onSelect={onSelectPerk}
          onHover={onHoverPerk}
          onHoverEnd={onHoverEnd}
          clarityDescriptions={descriptions}
        />
      ))}
    </div>
  );
}
