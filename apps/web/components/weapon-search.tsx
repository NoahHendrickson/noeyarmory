"use client";

import { useMemo, useState } from "react";
import {
  Badge,
  CommandPalette,
  SegmentedToggle,
  type PaletteCategory,
  type PaletteChip,
  type PaletteValueOption,
  type SegmentedToggleOption,
} from "@repo/ui";
import {
  collectColumnPerks,
  collectFacets,
  createWeaponFuse,
  filterWeapons,
  sortWeapons,
  type FacetOption,
  type PerkOption,
  type WeaponDoc,
  type WeaponFilters,
  type WeaponSort,
} from "@repo/destiny";

import { useWeapons } from "../lib/use-weapons";
import { WeaponResultRow } from "./weapon-result-row";
import { WeaponDetailModal } from "./weapon-detail-modal";

type Mode = "weapon" | "armor";

const MODES: SegmentedToggleOption<Mode>[] = [
  { value: "weapon", label: "Weapon search" },
  { value: "armor", label: "My Armor" },
];

const MAX_RESULTS = 50;

const SORT_OPTIONS: SegmentedToggleOption<WeaponSort>[] = [
  { value: "name", label: "A–Z" },
  { value: "season-desc", label: "Newest" },
  { value: "season-asc", label: "Oldest" },
];

export function WeaponSearch({ signedIn = false }: { signedIn?: boolean }) {
  const { weapons, isSample } = useWeapons();
  const [mode, setMode] = useState<Mode>("weapon");
  const [query, setQuery] = useState("");
  const [chips, setChips] = useState<PaletteChip[]>([]);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [sort, setSort] = useState<WeaponSort>("name");
  const [selected, setSelected] = useState<WeaponDoc | null>(null);

  const categories = useMemo<PaletteCategory[]>(() => {
    const facets = collectFacets(weapons);
    const cols = collectColumnPerks(weapons);

    const facetCategory = (id: string, label: string, options: FacetOption[]): PaletteCategory => ({
      id,
      label,
      examples: options
        .slice(0, 3)
        .map((o) => `"${o.value}"`)
        .join("  "),
      getValues: (q) => {
        const ql = q.trim().toLowerCase();
        return options
          .filter((o) => !ql || o.value.toLowerCase().includes(ql))
          .map((o) => ({ id: o.value.toLowerCase(), label: o.value, hint: String(o.count) }));
      },
    });

    const perkCategory = (id: string, label: string, options: PerkOption[]): PaletteCategory => ({
      id,
      label,
      single: true,
      examples: options
        .slice(0, 2)
        .map((o) => `"${o.name}"`)
        .join("  "),
      getValues: (q) => {
        const ql = q.trim().toLowerCase();
        return options
          .filter((o) => !ql || o.name.toLowerCase().includes(ql))
          .map((o) => ({
            id: o.name.toLowerCase(),
            label: o.name,
            hint: String(o.count),
            dimmed: o.currentlyCanRoll === false,
          }));
      },
    });

    return [
      perkCategory("trait1", "Trait 1", cols.trait1),
      perkCategory("trait2", "Trait 2", cols.trait2),
      facetCategory("type", "Weapon type", facets.type ?? []),
      facetCategory("element", "Element", facets.element ?? []),
      facetCategory("slot", "Slot", facets.slot ?? []),
      facetCategory("ammo", "Ammo type", facets.ammo ?? []),
      facetCategory("frame", "Frame", facets.frame ?? []),
      facetCategory("rarity", "Rarity", facets.rarity ?? []),
      perkCategory("originTrait", "Origin Trait", cols.originTrait),
    ];
  }, [weapons]);

  // Chip category ids map 1:1 onto WeaponFilters keys.
  const filters = useMemo<WeaponFilters>(() => {
    const f: Record<string, string[]> = {};
    for (const chip of chips) {
      (f[chip.categoryId] ??= []).push(chip.value);
    }
    return f;
  }, [chips]);

  const fuse = useMemo(() => createWeaponFuse(weapons), [weapons]);
  const base = query.trim() ? fuse.search(query).map((r) => r.item) : weapons;
  const results = sortWeapons(filterWeapons(base, filters), sort);

  function addChip(categoryId: string, option: PaletteValueOption) {
    const category = categories.find((c) => c.id === categoryId);
    if (!category) return;
    const id = `${categoryId}:${option.id}`;
    setChips((prev) =>
      prev.some((c) => c.id === id)
        ? prev
        : [
            ...prev,
            { id, categoryId, categoryLabel: category.label, value: option.label, valueId: option.id },
          ],
    );
  }

  const armorOverlay = signedIn ? (
    <span className="text-muted-foreground text-sm">Armor search is coming soon.</span>
  ) : (
    <a href="/api/auth/login" className="inline-flex">
      <Badge variant="warning">Reconnect your bungie account ↗</Badge>
    </a>
  );

  const hasFilters = chips.length > 0;
  const isFiltering = query.trim().length > 0;
  const showResults = hasFilters && !isFiltering;
  const shown = results.slice(0, MAX_RESULTS);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="py-4 text-center">
        <span className="text-sm font-semibold tracking-tight">noeyarmory</span>
      </header>

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 pt-[16vh]">
        <div data-palette-ignore-close className="mb-3 self-center">
          <SegmentedToggle
            aria-label="Search mode"
            options={MODES}
            value={mode}
            onValueChange={setMode}
          />
        </div>

        <CommandPalette
          placeholder="Search for a weapon or trait"
          categories={categories}
          chips={chips}
          open={paletteOpen}
          onOpenChange={setPaletteOpen}
          onAddChip={addChip}
          onRemoveChip={(id) => setChips((prev) => prev.filter((c) => c.id !== id))}
          onClearChips={() => setChips([])}
          query={query}
          onQueryChange={setQuery}
          showResults={showResults}
          results={shown.map((weapon) => ({
            id: String(weapon.hash),
            content: <WeaponResultRow weapon={weapon} />,
          }))}
          onSelectResult={(id) => {
            const weapon = weapons.find((w) => String(w.hash) === id);
            if (weapon) setSelected(weapon);
          }}
          resultsEmpty="No weapons match."
          resultsHeader={
            showResults ? (
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground text-xs">Sort by</span>
                <SegmentedToggle
                  aria-label="Sort weapons"
                  options={SORT_OPTIONS}
                  value={sort}
                  onValueChange={setSort}
                />
              </div>
            ) : undefined
          }
          resultsFooter={
            results.length > shown.length
              ? `Showing ${shown.length} of ${results.length}`
              : undefined
          }
          disabled={mode === "armor"}
          renderBarOverlay={mode === "armor" ? armorOverlay : undefined}
        />

        {mode === "weapon" && !hasFilters && !isFiltering && isSample && (
          <p className="text-muted-foreground mt-3 text-center text-xs">
            Sample data — run <code>pnpm --filter @repo/destiny generate</code> for the full index.
          </p>
        )}
      </main>

      <WeaponDetailModal weapon={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
