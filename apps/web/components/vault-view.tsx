"use client";

import { useMemo, useState } from "react";
import { Badge, Input } from "@repo/ui";

import type { VaultWeapon } from "../lib/vault-types";
import { FacetFilter } from "./facet-filter";
import { WeaponCard } from "./weapon-card";

type FacetKey = "element" | "type" | "ammo" | "rarity" | "frame";
const FACETS: { key: FacetKey; label: string }[] = [
  { key: "element", label: "Element" },
  { key: "type", label: "Weapon Type" },
  { key: "ammo", label: "Ammo" },
  { key: "rarity", label: "Rarity" },
  { key: "frame", label: "Frame" },
];

const lc = (s: string) => s.toLowerCase();

interface Filters extends Record<FacetKey, string[]> {
  perks: string[];
}
const EMPTY: Filters = { element: [], type: [], ammo: [], rarity: [], frame: [], perks: [] };

export function VaultView({ weapons }: { weapons: VaultWeapon[] }) {
  const [query, setQuery] = useState("");
  const [perkInput, setPerkInput] = useState("");
  const [filters, setFilters] = useState<Filters>(EMPTY);

  const facetOptions = useMemo(() => {
    const calc = (select: (w: VaultWeapon) => string | undefined) => {
      const counts = new Map<string, number>();
      for (const w of weapons) {
        const value = select(w);
        if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
      }
      return [...counts.entries()]
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
    };
    return {
      element: calc((w) => w.element),
      type: calc((w) => w.type),
      ammo: calc((w) => w.ammo),
      rarity: calc((w) => w.rarity),
      frame: calc((w) => w.frame),
    } satisfies Record<FacetKey, { value: string; count: number }[]>;
  }, [weapons]);

  const allPerks = useMemo(() => {
    const set = new Set<string>();
    for (const w of weapons) for (const p of w.rolledPerks) set.add(p.name);
    return [...set].sort();
  }, [weapons]);

  const results = useMemo(() => {
    const q = lc(query.trim());
    return weapons.filter((w) => {
      for (const { key } of FACETS) {
        const selected = filters[key];
        if (selected.length && !selected.map(lc).includes(lc(w[key] ?? ""))) return false;
      }
      if (filters.perks.length) {
        const owned = new Set(w.rolledPerks.map((p) => lc(p.name)));
        if (!filters.perks.every((p) => owned.has(lc(p)))) return false;
      }
      if (q) {
        const hay = `${w.name} ${w.rolledPerks.map((p) => p.name).join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [weapons, query, filters]);

  function toggleFacet(key: FacetKey, value: string) {
    setFilters((f) => {
      const cur = f[key];
      return { ...f, [key]: cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value] };
    });
  }
  function addPerk(name: string) {
    const match = allPerks.find((p) => lc(p) === lc(name.trim()));
    if (!match) return;
    setFilters((f) => (f.perks.some((p) => lc(p) === lc(match)) ? f : { ...f, perks: [...f.perks, match] }));
    setPerkInput("");
  }
  function removePerk(name: string) {
    setFilters((f) => ({ ...f, perks: f.perks.filter((p) => p !== name) }));
  }

  const activeCount = FACETS.reduce((n, { key }) => n + filters[key].length, 0) + filters.perks.length;

  return (
    <div className="mx-auto grid max-w-7xl gap-6 p-4 md:grid-cols-[18rem_1fr] md:p-6">
      <aside className="space-y-5 md:sticky md:top-4 md:h-fit">
        <Input
          placeholder="Search your weapons or rolls…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="space-y-1.5">
          <div className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            Rolled perk
          </div>
          <Input
            list="vault-perk-options"
            placeholder="e.g. Surrounded"
            value={perkInput}
            onChange={(e) => setPerkInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addPerk(perkInput);
              }
            }}
          />
          <datalist id="vault-perk-options">
            {allPerks.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
          {filters.perks.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {filters.perks.map((p) => (
                <button key={p} type="button" onClick={() => removePerk(p)} aria-label={`Remove ${p}`}>
                  <Badge variant="secondary">{p} ✕</Badge>
                </button>
              ))}
            </div>
          )}
        </div>

        {FACETS.map(({ key, label }) => (
          <FacetFilter
            key={key}
            label={label}
            options={facetOptions[key]}
            selected={filters[key]}
            onToggle={(value) => toggleFacet(key, value)}
          />
        ))}

        {activeCount > 0 && (
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground text-xs underline"
            onClick={() => setFilters(EMPTY)}
          >
            Clear {activeCount} filter{activeCount === 1 ? "" : "s"}
          </button>
        )}
      </aside>

      <main className="space-y-4">
        <div className="text-muted-foreground text-sm">
          {results.length} of {weapons.length} owned weapon{weapons.length === 1 ? "" : "s"}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {results.map((w) => (
            <div key={w.instanceId} className="space-y-1.5">
              <WeaponCard weapon={w} />
              {w.rolledPerks.length > 0 && (
                <div className="flex flex-wrap gap-1 px-1">
                  {w.rolledPerks.map((p) => (
                    <Badge key={p.hash} variant="outline">
                      {p.name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        {results.length === 0 && (
          <p className="text-muted-foreground py-16 text-center text-sm">
            No owned weapons match your filters.
          </p>
        )}
      </main>
    </div>
  );
}
