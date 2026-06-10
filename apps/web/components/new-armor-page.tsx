"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Input } from "@repo/ui";
import {
  filterNewArmorSets,
  groupNewArmorBySet,
  type Armor30SetRef,
  type ArmorDoc,
  type NewArmorIndex,
  type NewArmorSetGroup,
} from "@repo/destiny";

import { ArmorItemIcon } from "./armor-item-icon";

type SetBonus = NonNullable<Armor30SetRef["perks"]>[number];

const SLOT_ABBREV: Record<ArmorDoc["slot"], string> = {
  Helmet: "Helm",
  Gauntlets: "Arms",
  Chest: "Chest",
  Legs: "Legs",
  Class: "Class",
};

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

function formatSetMeta(group: NewArmorSetGroup): string {
  const parts: string[] = [];
  if (group.source) parts.push(group.source);
  parts.push(`${group.pieces.length} pc`);
  if (group.pieces.some((piece) => piece.isArmor30)) parts.push("Armor 3.0");
  if (group.set) parts.push("Set bonus");
  return parts.join(" · ");
}

function SetBonusDetails({ perks }: { perks: SetBonus[] }) {
  const perksWithDescriptions = perks.filter((perk) => perk.description);
  if (perksWithDescriptions.length === 0) return null;

  return (
    <details className="mt-1">
      <summary className="text-muted-foreground cursor-pointer text-[11px] hover:text-foreground">
        Set bonus details
      </summary>
      <ul className="text-muted-foreground mt-1.5 space-y-2 text-[11px] leading-snug">
        {perksWithDescriptions.map((perk) => (
          <li key={perk.name}>
            <span className="text-primary font-medium">{perk.name}</span>
            <p className="mt-0.5 whitespace-pre-line text-foreground/75">{perk.description}</p>
          </li>
        ))}
      </ul>
    </details>
  );
}

function ArmorPieceStrip({ armor }: { armor: ArmorDoc }) {
  return (
    <li className="flex min-w-0 items-center gap-1.5">
      <ArmorItemIcon
        icon={armor.icon}
        watermark={armor.watermark}
        rarity={armor.rarity}
        size={28}
      />
      <div className="min-w-0">
        <div className="truncate text-[11px] font-medium">{armor.name}</div>
        <div className="text-muted-foreground text-[10px] leading-tight">
          {SLOT_ABBREV[armor.slot]} · {armor.classType}
        </div>
      </div>
    </li>
  );
}

function NewArmorSetRow({ group }: { group: NewArmorSetGroup }) {
  const setBonuses: SetBonus[] | undefined =
    group.set?.perks ?? group.set?.perkNames.map((name) => ({ name }));

  return (
    <section className="py-3 first:pt-0">
      <h2 className="truncate text-sm font-semibold tracking-tight">{group.name}</h2>
      <p className="text-muted-foreground mt-0.5 truncate text-[11px]">{formatSetMeta(group)}</p>

      {setBonuses?.length ? (
        <p className="text-primary mt-1 text-[11px]">{setBonuses.map((perk) => perk.name).join(" · ")}</p>
      ) : null}

      {setBonuses?.length ? <SetBonusDetails perks={setBonuses} /> : null}

      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1.5">
        {group.pieces.map((piece) => (
          <ArmorPieceStrip key={piece.hash} armor={piece} />
        ))}
      </ul>
    </section>
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
  const groups = useMemo(() => (index ? groupNewArmorBySet(index) : []), [index]);
  const filteredGroups = useMemo(
    () => filterNewArmorSets(groups, query),
    [groups, query],
  );
  const isFiltering = query.trim().length >= 2;

  return (
    <main className="mx-auto max-w-4xl space-y-4 p-4 md:p-6">
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
        <div className="space-y-3">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search sets by name, source, or perk…"
            aria-label="Search armor sets"
            className="h-8 rounded-none border-0 border-b border-white/15 bg-transparent px-0 shadow-none focus-visible:ring-0"
          />

          {isFiltering && (
            <p className="text-muted-foreground text-xs">
              Showing {filteredGroups.length} of {groups.length} sets
            </p>
          )}

          {filteredGroups.length === 0 ? (
            <EmptyState title={`No sets match "${query.trim()}"`}>
              Try a different set name, activity source, perk, or piece name.
            </EmptyState>
          ) : (
            <div className="divide-y divide-white/10">
              {filteredGroups.map((group) => (
                <NewArmorSetRow key={group.key} group={group} />
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
