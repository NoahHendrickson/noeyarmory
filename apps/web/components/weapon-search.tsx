"use client";

import { useMemo, useState } from "react";
import {
  Badge,
  cn,
  CommandPalette,
  PillSelect,
  SegmentedToggle,
  type PaletteCategory,
  type PaletteChip,
  type PaletteValueOption,
  type PillSelectOption,
  type SegmentedToggleOption,
} from "@repo/ui";
import {
  collectColumnPerks,
  collectFacets,
  createWeaponFuse,
  filterWeapons,
  sortWeapons,
  type FacetOption,
  type ModOption,
  type PerkOption,
  type WeaponDoc,
  type WeaponFilters,
  type WeaponSort,
} from "@repo/destiny";

import { useOwnedArmor } from "../lib/use-owned-armor";
import { useWeapons } from "../lib/use-weapons";
import { getFilterChipAppearance } from "../lib/filter-chip-appearance";
import {
  collectOwnedArmorFacets,
  filterOwnedArmor,
  searchOwnedArmor,
  sortOwnedArmor,
  type OwnedArmorFilters,
} from "../lib/owned-armor-search";
import { ArmorResultRow } from "./armor-result-row";
import { WeaponDetailModal } from "./weapon-detail-modal";
import { WeaponResultRow } from "./weapon-result-row";

type Mode = "weapon" | "armor";

const MODES: PillSelectOption<Mode>[] = [
  { value: "weapon", label: "Weapons mode" },
  { value: "armor", label: "Armor mode" },
];

const MAX_RESULTS = 50;

const WEAPON_SORT_OPTIONS: SegmentedToggleOption<WeaponSort>[] = [
  { value: "name", label: "A–Z" },
  { value: "season-desc", label: "Newest" },
  { value: "season-asc", label: "Oldest" },
];

const ARMOR_LOGIN_URL = "/api/auth/login?returnTo=%2F%3Fmode%3Darmor";

function facetCategory(id: string, label: string, options: FacetOption[]): PaletteCategory {
  return {
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
  };
}

function perkCategory(id: string, label: string, options: PerkOption[] | ModOption[]): PaletteCategory {
  return {
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
          dimmed: "currentlyCanRoll" in o && o.currentlyCanRoll === false,
        }));
    },
  };
}

export function WeaponSearch({
  signedIn = false,
  initialMode = "weapon",
}: {
  signedIn?: boolean;
  initialMode?: Mode;
}) {
  const { weapons, damageTypes, isSample } = useWeapons();
  const [mode, setMode] = useState<Mode>(initialMode);
  const { armor: owned, loading: armorLoading, error: armorLoadError } = useOwnedArmor(
    signedIn && mode === "armor",
  );

  const [query, setQuery] = useState("");
  const [chips, setChips] = useState<PaletteChip[]>([]);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [sort, setSort] = useState<WeaponSort>("name");
  const [selected, setSelected] = useState<WeaponDoc | null>(null);

  const elementIconMap = useMemo(
    () => new Map(damageTypes.map((d) => [d.name, d.icon] as const)),
    [damageTypes],
  );

  const weaponCategories = useMemo<PaletteCategory[]>(() => {
    const facets = collectFacets(weapons);
    const cols = collectColumnPerks(weapons);
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

  const armorCategories = useMemo<PaletteCategory[]>(() => {
    const facets = collectOwnedArmorFacets(owned);
    return [
      facetCategory("classType", "Class", facets.classType ?? []),
      facetCategory("setName", "Set bonus", facets.setName ?? []),
      facetCategory("archetype", "Archetype", facets.archetype ?? []),
      facetCategory("tertiaryStat", "Tertiary stat", facets.tertiaryStat ?? []),
      facetCategory("tunableStat", "Tunable stat", facets.tunableStat ?? []),
    ];
  }, [owned]);

  const categories = mode === "weapon" ? weaponCategories : armorCategories;

  const weaponFilters = useMemo<WeaponFilters>(() => {
    const f: Record<string, string[]> = {};
    for (const chip of chips) {
      (f[chip.categoryId] ??= []).push(chip.value);
    }
    return f;
  }, [chips]);

  const armorFilters = useMemo<OwnedArmorFilters>(() => {
    const f: Record<string, string[]> = {};
    for (const chip of chips) {
      (f[chip.categoryId] ??= []).push(chip.value);
    }
    return f;
  }, [chips]);

  const weaponFuse = useMemo(() => createWeaponFuse(weapons), [weapons]);
  const weaponBase = query.trim() ? weaponFuse.search(query).map((r) => r.item) : weapons;
  const weaponResults = sortWeapons(filterWeapons(weaponBase, weaponFilters), sort);

  const armorBase = query.trim() ? searchOwnedArmor(owned, query) : owned;
  const armorResults = sortOwnedArmor(filterOwnedArmor(armorBase, armorFilters));

  const weaponShown = weaponResults.slice(0, MAX_RESULTS);
  const armorShown = armorResults.slice(0, MAX_RESULTS);
  const resultCount = mode === "weapon" ? weaponResults.length : armorResults.length;
  const shownCount = mode === "weapon" ? weaponShown.length : armorShown.length;

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

  function handleModeChange(next: Mode) {
    setMode(next);
    setChips([]);
    setQuery("");
    setPaletteOpen(false);
  }

  const armorOverlay = !signedIn ? (
    <a href={ARMOR_LOGIN_URL} className="inline-flex">
      <Badge variant="warning">Reconnect your bungie account ↗</Badge>
    </a>
  ) : armorLoading ? (
    <span className="text-muted-foreground text-sm">Loading your armor…</span>
  ) : armorLoadError ? (
    <span className="text-destructive text-sm">{armorLoadError}</span>
  ) : undefined;

  const hasFilters = chips.length > 0;
  const isFiltering = query.trim().length > 0;
  const showResults = hasFilters && !isFiltering;

  const placeholder =
    mode === "weapon"
      ? "Press F to search"
      : "Press F to search armor by class, set, archetype, or stats";

  return (
    <div className="flex min-h-screen flex-col">
      <header className="py-4 text-center">
        <span className="text-sm font-semibold tracking-tight">noeyarmory</span>
      </header>

      <main className="mx-auto flex w-full flex-1 flex-col px-4 pt-[16vh]">
        <div
          className={cn(
            "mx-auto flex w-max max-w-[calc(100vw-2rem)] flex-col transition-[min-width] duration-200",
            paletteOpen ? "min-w-[600px]" : "min-w-[420px]",
          )}
        >
          <div className="mb-2 flex justify-end">
            <div
              data-palette-ignore-close
              className="flex shrink-0 cursor-pointer items-center"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <PillSelect
                aria-label="Search mode"
                options={MODES}
                value={mode}
                onValueChange={handleModeChange}
              />
            </div>
          </div>
          <CommandPalette
            className="mx-0 max-w-none"
            placeholder={placeholder}
            categories={categories}
          chips={chips}
          open={paletteOpen}
          onOpenChange={setPaletteOpen}
          onAddChip={addChip}
          onRemoveChip={(id) => setChips((prev) => prev.filter((c) => c.id !== id))}
          onClearChips={() => setChips([])}
          getChipAppearance={(chip) =>
            getFilterChipAppearance(chip.categoryId, chip.value, elementIconMap)
          }
          query={query}
          onQueryChange={setQuery}
          showResults={showResults}
          results={
            mode === "weapon"
              ? weaponShown.map((weapon) => ({
                  id: String(weapon.hash),
                  content: <WeaponResultRow weapon={weapon} />,
                }))
              : armorShown.map((armor) => ({
                  id: armor.instanceId,
                  content: <ArmorResultRow armor={armor} />,
                }))
          }
          onSelectResult={(id) => {
            if (mode === "weapon") {
              const weapon = weapons.find((w) => String(w.hash) === id);
              if (weapon) setSelected(weapon);
            }
          }}
          resultsEmpty={mode === "weapon" ? "No weapons match." : "No armor matches."}
          resultsHeader={
            showResults && mode === "armor" ? (
              <div className="text-muted-foreground text-xs">
                {resultCount} {resultCount === 1 ? "result" : "results"}
              </div>
            ) : showResults && mode === "weapon" ? (
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground text-xs">Sort by</span>
                <SegmentedToggle
                  aria-label="Sort weapons"
                  options={WEAPON_SORT_OPTIONS}
                  value={sort}
                  onValueChange={setSort}
                />
              </div>
            ) : undefined
          }
          resultsFooter={
            resultCount > shownCount ? `Showing ${shownCount} of ${resultCount}` : undefined
          }
          disabled={mode === "armor" && !signedIn}
          renderBarOverlay={mode === "armor" ? armorOverlay : undefined}
          />
        </div>

        {mode === "weapon" && !hasFilters && !isFiltering && isSample && (
          <p className="text-muted-foreground mt-3 text-center text-xs">
            Sample data — run <code>pnpm setup:bungie</code> for the full index.
          </p>
        )}

        {mode === "armor" && signedIn && !armorLoading && !armorLoadError && owned.length === 0 && (
          <p className="text-muted-foreground mt-3 text-center text-xs">
            No armor found — run <code>pnpm setup:bungie</code> to generate the armor index.
          </p>
        )}
      </main>

      <WeaponDetailModal weapon={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
