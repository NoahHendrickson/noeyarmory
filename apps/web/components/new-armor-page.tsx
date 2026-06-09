"use client";

import Image from "next/image";
import Link from "next/link";
import { Badge, cn } from "@repo/ui";
import type { Armor30SetRef, ArmorDoc, NewArmorIndex } from "@repo/destiny";

import { bungieIcon, RARITY_RING } from "../lib/bungie";

const CLASS_ORDER = ["Titan", "Hunter", "Warlock", "Any"];
const SLOT_ORDER = ["Helmet", "Gauntlets", "Chest", "Legs", "Class"];

interface NewArmorSetGroup {
  key: string;
  name: string;
  source?: string;
  set?: Armor30SetRef;
  pieces: ArmorDoc[];
}

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

function sortPieces(a: ArmorDoc, b: ArmorDoc): number {
  const classDelta = CLASS_ORDER.indexOf(a.classType) - CLASS_ORDER.indexOf(b.classType);
  if (classDelta !== 0) return classDelta;

  const slotDelta = SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot);
  if (slotDelta !== 0) return slotDelta;

  return a.name.localeCompare(b.name);
}

function groupNewArmor(index: NewArmorIndex): NewArmorSetGroup[] {
  const setsByHash = new Map(index.armor30Sets.map((set) => [set.hash, set]));
  const groups = new Map<string, NewArmorSetGroup>();

  for (const piece of index.armor) {
    const key = piece.setHash != null ? `set-${piece.setHash}` : `item-${piece.hash}`;
    const set = piece.setHash != null ? setsByHash.get(piece.setHash) : undefined;
    const existing = groups.get(key);

    if (existing) {
      existing.pieces.push(piece);
      if (!existing.source && piece.source) existing.source = piece.source;
      continue;
    }

    groups.set(key, {
      key,
      name: set?.name ?? piece.setName ?? piece.name,
      source: piece.source,
      set,
      pieces: [piece],
    });
  }

  return [...groups.values()]
    .map((group) => ({ ...group, pieces: [...group.pieces].sort(sortPieces) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function ArmorIcon({ armor }: { armor: ArmorDoc }) {
  const icon = bungieIcon(armor.icon);
  const watermark = bungieIcon(armor.watermark);

  return (
    <div
      className={cn(
        "relative size-12 shrink-0 overflow-hidden rounded ring-1",
        RARITY_RING[armor.rarity] ?? "ring-border",
      )}
    >
      {icon && <Image src={icon} alt="" width={48} height={48} className="size-12" unoptimized />}
      {watermark && (
        <Image
          src={watermark}
          alt=""
          width={48}
          height={48}
          className="absolute inset-0 size-12"
          unoptimized
        />
      )}
    </div>
  );
}

function ArmorPiece({ armor }: { armor: ArmorDoc }) {
  return (
    <li className="bg-card/80 flex gap-3 rounded-lg border border-white/10 p-3">
      <ArmorIcon armor={armor} />
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{armor.name}</div>
        <div className="text-muted-foreground text-xs">
          {armor.classType} · {armor.slot}
        </div>
      </div>
    </li>
  );
}

function NewArmorSetCard({ group }: { group: NewArmorSetGroup }) {
  return (
    <section className="bg-background/70 rounded-2xl border border-white/12 p-4 shadow-lg shadow-black/20 backdrop-blur">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="text-muted-foreground text-xs tracking-wide uppercase">
            {group.source ?? "New armor"}
          </div>
          <h2 className="text-lg font-semibold tracking-tight">{group.name}</h2>
          <p className="text-muted-foreground text-sm">
            {group.pieces.length} new piece{group.pieces.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {group.pieces.some((piece) => piece.isArmor30) && <Badge variant="secondary">Armor 3.0</Badge>}
          {group.set && <Badge variant="outline">Set bonus</Badge>}
        </div>
      </div>

      {group.set?.perkNames.length ? (
        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Set bonuses
          </h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {group.set.perkNames.map((perkName) => (
              <li
                key={perkName}
                className="rounded-pill border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary"
              >
                {perkName}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {group.pieces.map((piece) => (
          <ArmorPiece key={piece.hash} armor={piece} />
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
    <div className="bg-background/70 rounded-2xl border border-white/12 p-6 text-center backdrop-blur">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="text-muted-foreground mx-auto mt-2 max-w-xl text-sm leading-relaxed">
        {children}
      </div>
    </div>
  );
}

export function NewArmorPage({ index }: { index?: NewArmorIndex }) {
  const groups = index ? groupNewArmor(index) : [];
  const generatedAt = formatDate(index?.generatedAt);
  const baselineAt = formatDate(index?.baselineGeneratedAt);

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <Link href="/" className="text-muted-foreground hover:text-foreground text-sm">
        ← Back to search
      </Link>

      <header className="space-y-3">
        <div>
          <div className="text-muted-foreground text-xs tracking-wide uppercase">
            Newly introduced catalog armor
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">New armor</h1>
        </div>
        <p className="text-muted-foreground max-w-3xl text-sm leading-relaxed">
          Exact additions from the latest generated armor index, grouped by Armor 3.0 set so new
          set bonuses are easy to scan after a Destiny manifest refresh.
        </p>
        {index && (
          <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <span>Manifest: {index.version}</span>
            {generatedAt && <span>Generated: {generatedAt}</span>}
            {index.baselineVersion && <span>Baseline: {index.baselineVersion}</span>}
            {baselineAt && <span>Baseline generated: {baselineAt}</span>}
          </div>
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
        <div className="space-y-4">
          {groups.map((group) => (
            <NewArmorSetCard key={group.key} group={group} />
          ))}
        </div>
      )}
    </main>
  );
}
