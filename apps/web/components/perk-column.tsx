"use client";

import Image from "next/image";
import Link from "next/link";
import { memo, useCallback } from "react";
import type { ReactNode } from "react";
import {
  cn,
  frostedSurface,
  Popover,
  PopoverPortal,
  PopoverPopup,
  PopoverPositioner,
  PopoverTrigger,
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

function perkInfoPanelClassName(clarityLines: ClarityLine[] | undefined): string {
  return cn("relative overflow-hidden rounded-md p-0", perkTooltipMaxWidth(clarityLines));
}

const PERK_INFO_POSITIONER_PROPS = {
  side: "right" as const,
  align: "center" as const,
  sideOffset: 2,
  collisionAvoidance: {
    side: "none" as const,
    align: "none" as const,
    fallbackAxisSide: "none" as const,
  },
};

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
  hasHover,
  eager = false,
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
  hasHover: boolean;
  /** Eager-load this tile's icon instead of next/image's default lazy loading. */
  eager?: boolean;
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

  const selectButtonClassName =
    "group inline-flex rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  const linkClassName = "group inline-flex rounded-full";

  const wrapInteractive = (content: ReactNode) => {
    if (onSelect) {
      return (
        <button
          type="button"
          aria-label={perk.name}
          aria-pressed={selected}
          onClick={() => onSelect(perk)}
          {...hoverHandlers}
          className={selectButtonClassName}
        >
          {content}
        </button>
      );
    }
    if (linkPerks) {
      return (
        <Link href={`/perk/${perk.hash}`} className={linkClassName}>
          {content}
        </Link>
      );
    }
    return content;
  };

  const triggerRender = onSelect ? (
    <button
      type="button"
      aria-label={perk.name}
      aria-pressed={selected}
      onClick={() => onSelect(perk)}
      {...hoverHandlers}
      className={selectButtonClassName}
    />
  ) : linkPerks ? (
    <Link href={`/perk/${perk.hash}`} className={linkClassName} />
  ) : (
    <span className="inline-flex" />
  );

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
          loading={eager ? "eager" : "lazy"}
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

  if (!hasClarityOrBungieTooltip(perk, tiers)) {
    return (
      <span title={onSelect ? undefined : perk.name} className="inline-flex">
        {wrapInteractive(tile)}
      </span>
    );
  }

  const infoPopup = (
    <PerkTooltipContent perk={perk} tiers={tiers} clarityLines={clarityLines} />
  );
  const panelClassName = perkInfoPanelClassName(clarityLines);

  if (hasHover) {
    return (
      <Tooltip disableHoverablePopup>
        <TooltipTrigger delay={0} render={triggerRender}>
          {tile}
        </TooltipTrigger>
        <TooltipPortal>
          <TooltipPositioner {...PERK_INFO_POSITIONER_PROPS}>
            <TooltipPopup className={cn(panelClassName, "pointer-events-none")}>
              {infoPopup}
            </TooltipPopup>
          </TooltipPositioner>
        </TooltipPortal>
      </Tooltip>
    );
  }

  return (
    <Popover modal={false}>
      <PopoverTrigger render={triggerRender}>{tile}</PopoverTrigger>
      <PopoverPortal>
        <PopoverPositioner {...PERK_INFO_POSITIONER_PROPS}>
          <PopoverPopup className={cn(frostedSurface("panel"), panelClassName)}>
            {infoPopup}
          </PopoverPopup>
        </PopoverPositioner>
      </PopoverPortal>
    </Popover>
  );
});

/** One weapon perk column: vertical stack of perk icons (light.gg-style). */
export function PerkColumnView({
  column,
  columnIndex,
  linkPerks = true,
  highlightedPerks,
  selectedPerkHash,
  hasHover,
  eager = false,
  onSelectPerk,
  onHoverPerk,
  onHoverEnd,
  clarityDescriptions,
}: {
  column: PerkColumn;
  /** This column's position in the weapon; passed back to the stable parent handlers. */
  columnIndex: number;
  linkPerks?: boolean;
  /** Lowercase perk names from the community DPS benchmark build. */
  highlightedPerks?: ReadonlySet<string>;
  selectedPerkHash?: number;
  /** Whether the primary pointer supports hover (passed from the weapon detail view). */
  hasHover: boolean;
  /** Eager-load this column's icons (set for the first visible column). */
  eager?: boolean;
  onSelectPerk?: (columnIndex: number, perk: PerkRef) => void;
  onHoverPerk?: (columnIndex: number, perk: PerkRef) => void;
  onHoverEnd?: () => void;
  clarityDescriptions?: ClarityDescriptionMap | null;
}) {
  const contextDescriptions = useClarityDescriptions();
  const descriptions = clarityDescriptions ?? contextDescriptions;

  // Bind this column's index into stable per-tile handlers so memo(PerkTile) holds
  // across parent re-renders (hover-preview / selection churn in the detail modal).
  const handleSelect = useCallback(
    (perk: PerkRef) => onSelectPerk?.(columnIndex, perk),
    [onSelectPerk, columnIndex],
  );
  const handleHover = useCallback(
    (perk: PerkRef) => onHoverPerk?.(columnIndex, perk),
    [onHoverPerk, columnIndex],
  );

  return (
    <div className="flex flex-col gap-2 pt-2 pb-1.5">
      {dedupePerksByName(column.perks).map((perk) => (
        <PerkTile
          key={perk.hash}
          perk={perk}
          linkPerks={linkPerks}
          highlighted={highlightedPerks?.has(perk.name.toLowerCase())}
          selected={selectedPerkHash === perk.hash}
          hasHover={hasHover}
          eager={eager}
          onSelect={onSelectPerk ? handleSelect : undefined}
          onHover={onHoverPerk ? handleHover : undefined}
          onHoverEnd={onHoverEnd}
          clarityDescriptions={descriptions}
        />
      ))}
    </div>
  );
}
