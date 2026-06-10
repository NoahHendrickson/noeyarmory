"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge, cn, frostedSurface, Input, PillSelect, type PillSelectOption } from "@repo/ui";
import {
  ARMOR_SLOT_ORDER,
  armorSetElementId,
  buildNewArmorActivityNav,
  filterNewArmorSets,
  groupNewArmorBySet,
  type Armor30SetRef,
  type ArmorDoc,
  type NewArmorActivityNav,
  type NewArmorIndex,
  type NewArmorSetGroup,
} from "@repo/destiny";

import { ArmorItemIcon } from "./armor-item-icon";

type SetBonus = NonNullable<Armor30SetRef["perks"]>[number];
type SetSort = "name" | "source";

const SORT_OPTIONS: PillSelectOption<SetSort>[] = [
  { value: "name", label: "Name" },
  { value: "source", label: "Source" },
];

function formatDate(value?: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatMetadataLine(index: NewArmorIndex): string {
  const parts = [`Manifest ${index.version}`];
  const generatedAt = formatDate(index.generatedAt);
  if (generatedAt) parts.push(`Generated ${generatedAt}`);
  if (index.baselineVersion) parts.push(`Baseline ${index.baselineVersion}`);
  const baselineAt = formatDate(index.baselineGeneratedAt);
  if (baselineAt) parts.push(`Baseline generated ${baselineAt}`);
  return parts.join(" · ");
}

function resolveRequiredSetCount(perk: SetBonus, index: number, total: number): number | undefined {
  if (perk.requiredSetCount != null) return perk.requiredSetCount;
  if (total === 2) return index === 0 ? 2 : 4;
  return undefined;
}

function tierLabel(requiredSetCount: number | undefined): string {
  if (requiredSetCount != null) return `${requiredSetCount} pieces`;
  return "Set bonus";
}

function sortSetBonuses(perks: SetBonus[]): SetBonus[] {
  return [...perks].sort((a, b) => {
    const aCount = a.requiredSetCount ?? Number.MAX_SAFE_INTEGER;
    const bCount = b.requiredSetCount ?? Number.MAX_SAFE_INTEGER;
    return aCount - bCount;
  });
}

function normalizeSetBonuses(group: NewArmorSetGroup): SetBonus[] | undefined {
  const raw = group.set?.perks ?? group.set?.perkNames.map((name) => ({ name }));
  if (!raw?.length) return undefined;

  return raw.map((perk, index) => ({
    ...perk,
    requiredSetCount: resolveRequiredSetCount(perk, index, raw.length),
  }));
}

function sortArmorGroups(groups: NewArmorSetGroup[], sort: SetSort): NewArmorSetGroup[] {
  if (sort === "name") return groups;

  return [...groups].sort((a, b) => {
    const sourceA = a.source ?? "";
    const sourceB = b.source ?? "";
    const sourceDelta = sourceA.localeCompare(sourceB);
    if (sourceDelta !== 0) return sourceDelta;
    return a.name.localeCompare(b.name);
  });
}

function SetBonusTier({ perk, requiredSetCount }: { perk: SetBonus; requiredSetCount?: number }) {
  return (
    <div className="flex gap-3 sm:gap-4">
      <div className="text-muted-foreground w-16 shrink-0 pt-0.5 text-xs font-medium uppercase tracking-wide tabular-nums sm:w-20">
        {tierLabel(requiredSetCount)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-primary text-sm font-medium">{perk.name}</div>
        {perk.description ? (
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed whitespace-pre-line">
            {perk.description}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function SetBonusTiers({ perks }: { perks: SetBonus[] }) {
  const sorted = sortSetBonuses(perks);

  return (
    <div className="space-y-4">
      {sorted.map((perk, index) => (
        <SetBonusTier
          key={`${perk.name}-${perk.requiredSetCount ?? index}`}
          perk={perk}
          requiredSetCount={perk.requiredSetCount}
        />
      ))}
    </div>
  );
}

function ActivitySourceNav({ nav }: { nav: NewArmorActivityNav }) {
  if (nav.raids.length === 0 && nav.dungeons.length === 0) return null;

  return (
    <nav
      aria-label="Jump to raid and dungeon armor"
      className="sticky top-24 hidden w-36 shrink-0 self-start md:block lg:w-40"
    >
      <div className="space-y-4">
        {nav.raids.length > 0 ? (
          <div>
            <div className="text-muted-foreground mb-1.5 text-[11px] font-medium uppercase tracking-wide">
              Raids
            </div>
            <ul className="space-y-1">
              {nav.raids.map((item) => (
                <li key={item.label}>
                  <a
                    href={`#${item.targetId}`}
                    className="text-muted-foreground hover:text-foreground block truncate text-sm transition-colors"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {nav.dungeons.length > 0 ? (
          <div>
            <div className="text-muted-foreground mb-1.5 text-[11px] font-medium uppercase tracking-wide">
              Dungeons
            </div>
            <ul className="space-y-1">
              {nav.dungeons.map((item) => (
                <li key={item.label}>
                  <a
                    href={`#${item.targetId}`}
                    className="text-muted-foreground hover:text-foreground block truncate text-sm transition-colors"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </nav>
  );
}

function ArmorPieceGrid({ pieces }: { pieces: ArmorDoc[] }) {
  const bySlot = useMemo(() => {
    const warlockPieces = pieces.filter((piece) => piece.classType === "Warlock");
    return new Map(warlockPieces.map((piece) => [piece.slot, piece]));
  }, [pieces]);

  return (
    <div className="flex flex-wrap gap-2">
      {ARMOR_SLOT_ORDER.map((slot) => {
        const piece = bySlot.get(slot);
        if (!piece) {
          return (
            <div
              key={slot}
              className="border-border/60 size-10 rounded border border-dashed opacity-40"
              aria-hidden
            />
          );
        }

        return (
          <span key={slot} title={piece.name}>
            <ArmorItemIcon
              icon={piece.icon}
              watermark={piece.watermark}
              rarity={piece.rarity}
              size={40}
            />
          </span>
        );
      })}
    </div>
  );
}

function formatPieceCount(count: number): string {
  return `${count} new piece${count === 1 ? "" : "s"}`;
}

function ArmorSetCard({ group }: { group: NewArmorSetGroup }) {
  const setBonuses = normalizeSetBonuses(group);
  const isArmor30 = group.pieces.some((piece) => piece.isArmor30);

  return (
    <article
      id={armorSetElementId(group.key)}
      className={cn("scroll-mt-24 space-y-4 rounded-2xl p-4 sm:p-5", frostedSurface("panel"))}
    >
      <header className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h2 className="text-lg font-semibold tracking-tight">{group.name}</h2>
          {group.source ? (
            <Badge variant="outline" className="shrink-0 text-sm">
              {group.source}
            </Badge>
          ) : null}
        </div>
        <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
          <span>{formatPieceCount(group.pieces.length)}</span>
          {isArmor30 ? (
            <>
              <span aria-hidden>·</span>
              <Badge variant="secondary" className="text-xs">
                Armor 3.0
              </Badge>
            </>
          ) : null}
        </div>
      </header>

      {setBonuses?.length ? (
        <section aria-label="Set bonuses">
          <SetBonusTiers perks={setBonuses} />
        </section>
      ) : null}

      <section aria-label="New pieces">
        <ArmorPieceGrid pieces={group.pieces} />
      </section>
    </article>
  );
}

function EmptyState({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="py-8 text-center">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="text-muted-foreground mx-auto mt-2 max-w-xl text-sm leading-relaxed">{children}</p>
    </div>
  );
}

export function NewArmorPage({ index }: { index?: NewArmorIndex }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SetSort>("name");
  const groups = useMemo(() => (index ? groupNewArmorBySet(index) : []), [index]);
  const filteredGroups = useMemo(
    () => filterNewArmorSets(groups, query),
    [groups, query],
  );
  const displayedGroups = useMemo(
    () => sortArmorGroups(filteredGroups, sort),
    [filteredGroups, sort],
  );
  const activityNav = useMemo(
    () => buildNewArmorActivityNav(displayedGroups),
    [displayedGroups],
  );
  const hasActivityNav = activityNav.raids.length > 0 || activityNav.dungeons.length > 0;
  const isFiltering = query.trim().length >= 2;

  return (
    <main
      className={cn(
        "mx-auto space-y-4 p-4 md:p-6",
        hasActivityNav ? "max-w-6xl" : "max-w-4xl",
      )}
    >
      <Link href="/" className="text-muted-foreground hover:text-foreground text-sm">
        ← Back to search
      </Link>

      <header className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight">New armor</h1>
        <p className="text-muted-foreground text-sm">
          New catalog armor grouped by set after the latest manifest refresh.
        </p>
        {index && (
          <p className="text-muted-foreground text-xs">{formatMetadataLine(index)}</p>
        )}
      </header>

      {!index ? (
        <EmptyState title="New armor data is not available">
          Run the Destiny data generator after the API is back to create `new-armor.json`.
        </EmptyState>
      ) : !index.hasBaseline ? (
        <EmptyState title="No baseline armor index was found">
          The exact diff needs a pre-update `armor.json` before refresh. Generate once before the
          update, then regenerate after the API returns to see only newly added armor.
        </EmptyState>
      ) : groups.length === 0 ? (
        <EmptyState title="No new armor found in this refresh">
          The latest generated armor index did not contain armor hashes missing from the baseline.
        </EmptyState>
      ) : (
        <div className="flex items-start gap-6 lg:gap-8">
          <ActivitySourceNav nav={activityNav} />
          <div className="min-w-0 flex-1 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search sets by name, source, or perk…"
                aria-label="Search armor sets"
                className="h-8 flex-1 rounded-none border-0 border-b border-white/15 bg-transparent px-0 shadow-none focus-visible:ring-0"
              />
              <PillSelect
                aria-label="Sort armor sets"
                options={SORT_OPTIONS}
                value={sort}
                onValueChange={setSort}
              />
            </div>

            {isFiltering && (
              <p className="text-muted-foreground text-xs">
                Showing {displayedGroups.length} of {groups.length} sets
              </p>
            )}

            {displayedGroups.length === 0 ? (
              <EmptyState title={`No sets match "${query.trim()}"`}>
                Try a different set name, activity source, perk, or piece name.
              </EmptyState>
            ) : (
              <div className="space-y-4">
                {displayedGroups.map((group) => (
                  <ArmorSetCard key={group.key} group={group} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
