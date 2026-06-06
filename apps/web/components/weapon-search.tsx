"use client";

import { useMemo, useState } from "react";
import { Badge, Input } from "@repo/ui";
import {
  collectFacets,
  collectPerks,
  createWeaponFuse,
  filterWeapons,
  type WeaponFilters,
} from "@repo/destiny";

import { useWeapons } from "../lib/use-weapons";
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

export function WeaponSearch() {
  const { weapons, loading, isSample } = useWeapons();
  const [query, setQuery] = useState("");
  const [perkInput, setPerkInput] = useState("");
  const [filters, setFilters] = useState<WeaponFilters>({});

  const facets = useMemo(() => collectFacets(weapons), [weapons]);
  const perks = useMemo(() => collectPerks(weapons), [weapons]);
  const fuse = useMemo(() => createWeaponFuse(weapons), [weapons]);

  const results = useMemo(() => {
    const base = query.trim() ? fuse.search(query).map((r) => r.item) : weapons;
    return filterWeapons(base, filters);
  }, [weapons, fuse, query, filters]);

  const selectedPerks = filters.perks ?? [];
  const activeCount =
    FACETS.reduce((n, { key }) => n + (filters[key]?.length ?? 0), 0) + selectedPerks.length;

  function toggleFacet(key: FacetKey, value: string) {
    setFilters((f) => {
      const current = f[key] ?? [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...f, [key]: next.length ? next : undefined };
    });
  }

  function addPerk(name: string) {
    const match = perks.find((p) => p.name.toLowerCase() === name.trim().toLowerCase());
    if (!match) return;
    setFilters((f) => {
      const current = f.perks ?? [];
      if (current.some((p) => p.toLowerCase() === match.name.toLowerCase())) return f;
      return { ...f, perks: [...current, match.name] };
    });
    setPerkInput("");
  }

  function removePerk(name: string) {
    setFilters((f) => ({ ...f, perks: (f.perks ?? []).filter((p) => p !== name) }));
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-6 p-4 md:grid-cols-[18rem_1fr] md:p-6">
      <aside className="space-y-5 md:sticky md:top-4 md:h-fit">
        <Input
          placeholder="Search weapons or perks…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <div className="space-y-1.5">
          <div className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            Has perk
          </div>
          <Input
            list="perk-options"
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
          <datalist id="perk-options">
            {perks.map((p) => (
              <option key={p.hash} value={p.name} />
            ))}
          </datalist>
          {selectedPerks.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {selectedPerks.map((p) => (
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
            options={facets[key] ?? []}
            selected={filters[key] ?? []}
            onToggle={(value) => toggleFacet(key, value)}
          />
        ))}

        {activeCount > 0 && (
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground text-xs underline"
            onClick={() => setFilters({})}
          >
            Clear {activeCount} filter{activeCount === 1 ? "" : "s"}
          </button>
        )}
      </aside>

      <main className="space-y-4">
        <div className="text-muted-foreground flex items-center justify-between text-sm">
          <span>
            {loading
              ? "Loading…"
              : `${results.length} weapon${results.length === 1 ? "" : "s"}`}
          </span>
          {isSample && !loading && <Badge variant="outline">sample data — run pnpm generate</Badge>}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {results.map((weapon) => (
            <WeaponCard key={weapon.hash} weapon={weapon} />
          ))}
        </div>

        {!loading && results.length === 0 && (
          <p className="text-muted-foreground py-16 text-center text-sm">
            No weapons match your filters.
          </p>
        )}
      </main>
    </div>
  );
}
