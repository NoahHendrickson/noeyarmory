"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ListFilterPlus } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  Badge,
  cn,
  CommandPalette,
  Input,
  PillSelect,
  type PaletteAction,
  type PaletteCategory,
  type PaletteChip,
  type PaletteValueOption,
  type PillSelectOption,
} from "@repo/ui";
import {
  collectColumnPerks,
  collectFacets,
  createWeaponFuse,
  filterWeapons,
  sortWeapons,
  suggestWeaponNames,
  type FacetOption,
  type WeaponSummary,
  type ModOption,
  type PerkOption,
  type WeaponFilters,
  type WeaponSort,
} from "@repo/destiny";

import { useOwnedArmor } from "../lib/use-owned-armor";
import { useCustomWeaponFilters } from "../lib/use-custom-weapon-filters";
import { useWeaponDps } from "../lib/use-weapon-dps";
import { useWeaponDetail, useWeapons } from "../lib/weapons-context";
import { getFilterChipAppearance } from "../lib/filter-chip-appearance";
import {
  collectOwnedArmorFacets,
  filterOwnedArmor,
  searchOwnedArmor,
  sortOwnedArmor,
  type OwnedArmorFilters,
} from "../lib/owned-armor-search";
import { ArmorResultRow, type ArmorActionState } from "./armor-result-row";
import { WeaponResultRow } from "./weapon-result-row";

const WeaponDetailModal = dynamic(
  () => import("./weapon-detail-modal").then((m) => m.WeaponDetailModal),
  { ssr: false },
);

type Mode = "weapon" | "armor";

const MODES: PillSelectOption<Mode>[] = [
  { value: "weapon", label: "Weapons mode" },
  { value: "armor", label: "Armor mode" },
];

const MAX_RESULTS = 50;
/** Cap fuzzy matches before filter/sort — filters may narrow further. */
const FUSE_PRE_LIMIT = 300;

const WEAPON_SORT_OPTIONS: PillSelectOption<WeaponSort>[] = [
  { value: "name", label: "A–Z", direction: "asc" },
  { value: "dps-desc", label: "DPS", direction: "desc" },
  { value: "season-desc", label: "Newest", direction: "desc" },
  { value: "season-asc", label: "Oldest", direction: "asc" },
];

const ARMOR_LOGIN_URL = "/api/auth/login?returnTo=%2F%3Fmode%3Darmor";
const CUSTOM_FILTER_CATEGORY_ID = "customFilter";
const CUSTOM_FILTER_DRAFT_CATEGORY_ID = "customFilterDraft";
const CUSTOM_FILTER_TRAIT_CATEGORY_IDS = new Set(["trait"]);

interface CustomFilterComposer {
  name: string;
  perkNames: string[];
}

function draftPerkChips(perkNames: string[]): PaletteChip[] {
  return perkNames.map((name) => ({
    id: `draft:${name.toLowerCase()}`,
    categoryId: CUSTOM_FILTER_DRAFT_CATEGORY_ID,
    categoryLabel: "Perk",
    value: name,
    valueId: name.toLowerCase(),
  }));
}

function weaponNameCategory(weapons: WeaponSummary[]): PaletteCategory {
  const examples = weapons
    .slice(0, 3)
    .map((w) => `"${w.name}"`)
    .join("  ");
  return {
    id: "name",
    label: "Exact Weapon",
    single: true,
    examples,
    getValues: (q) =>
      suggestWeaponNames(weapons, q).map((o) => ({
        id: o.value.toLowerCase(),
        label: o.value,
        hint: String(o.count),
      })),
  };
}

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

function mergeTraitPerkOptions(cols: ReturnType<typeof collectColumnPerks>): PerkOption[] {
  const byName = new Map<string, PerkOption>();
  for (const perk of [...cols.trait1, ...cols.trait2]) {
    const key = perk.name.toLowerCase();
    const existing = byName.get(key);
    if (existing) {
      existing.count += perk.count;
      existing.currentlyCanRoll = existing.currentlyCanRoll || perk.currentlyCanRoll;
    } else {
      byName.set(key, { ...perk });
    }
  }
  return [...byName.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function customFilterCategory(
  filters: ReturnType<typeof useCustomWeaponFilters>["filters"],
): PaletteCategory {
  return {
    id: CUSTOM_FILTER_CATEGORY_ID,
    label: "Custom filters",
    examples: filters
      .slice(0, 2)
      .map((filter) => `"${filter.name}"`)
      .join("  "),
    getValues: (q) => {
      const ql = q.trim().toLowerCase();
      return filters
        .filter((filter) => !ql || filter.name.toLowerCase().includes(ql))
        .map((filter) => ({
          id: filter.id,
          label: filter.name,
          hint: `${filter.perkNames.length} ${filter.perkNames.length === 1 ? "perk" : "perks"}`,
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
  const { weapons, perks, damageTypes, isSample, byHash } = useWeapons();
  const { dpsByName } = useWeaponDps();
  const { filters: customFilters, createFilter } = useCustomWeaponFilters();
  const [mode, setMode] = useState<Mode>(initialMode);
  const {
    armor: owned,
    loading: armorLoading,
    error: armorLoadError,
    refetch: refetchArmor,
  } = useOwnedArmor(signedIn);
  const [armorAction, setArmorAction] = useState<ArmorActionState>({});

  const [query, setQuery] = useState("");
  const [chips, setChips] = useState<PaletteChip[]>([]);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [sort, setSort] = useState<WeaponSort>("season-desc");
  const [showAllResults, setShowAllResults] = useState(false);
  const [customFilterComposer, setCustomFilterComposer] = useState<CustomFilterComposer | null>(
    null,
  );
  const [selectedHash, setSelectedHash] = useState<number | null>(null);
  const { weapon: selected } = useWeaponDetail(selectedHash);

  const elementIconMap = useMemo(
    () => new Map(damageTypes.map((d) => [d.name, d.icon] as const)),
    [damageTypes],
  );

  const weaponColumnPerks = useMemo(() => collectColumnPerks(weapons, perks), [weapons, perks]);

  const weaponCategories = useMemo<PaletteCategory[]>(() => {
    const facets = collectFacets(weapons);
    return [
      perkCategory("trait1", "Trait 1", weaponColumnPerks.trait1),
      perkCategory("trait2", "Trait 2", weaponColumnPerks.trait2),
      ...(customFilters.length > 0 ? [customFilterCategory(customFilters)] : []),
      facetCategory("type", "Weapon type", facets.type ?? []),
      facetCategory("element", "Element", facets.element ?? []),
      facetCategory("slot", "Slot", facets.slot ?? []),
      facetCategory("ammo", "Ammo type", facets.ammo ?? []),
      facetCategory("frame", "Frame", facets.frame ?? []),
      facetCategory("craftable", "Craftable", facets.craftable ?? []),
      facetCategory("rarity", "Rarity", facets.rarity ?? []),
      perkCategory("originTrait", "Origin Trait", weaponColumnPerks.originTrait),
      weaponNameCategory(weapons),
    ];
  }, [weapons, weaponColumnPerks, customFilters]);

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

  const composingCustomFilter = customFilterComposer != null && mode === "weapon";

  const composerCategories = useMemo<PaletteCategory[]>(
    () => [perkCategory("trait", "Trait", mergeTraitPerkOptions(weaponColumnPerks))],
    [weaponColumnPerks],
  );

  const categories = composingCustomFilter
    ? composerCategories
    : mode === "weapon"
      ? weaponCategories
      : armorCategories;

  const weaponFilters = useMemo<WeaponFilters>(() => {
    const f: Record<string, string[]> = {};
    const customPerkGroups: string[][] = [];
    for (const chip of chips) {
      if (chip.categoryId === CUSTOM_FILTER_CATEGORY_ID) {
        const filter = customFilters.find((candidate) => candidate.id === chip.valueId);
        if (filter) customPerkGroups.push(filter.perkNames);
        continue;
      }
      (f[chip.categoryId] ??= []).push(chip.value);
    }
    return customPerkGroups.length > 0 ? { ...f, customPerkGroups } : f;
  }, [chips, customFilters]);

  const armorFilters = useMemo<OwnedArmorFilters>(() => {
    const f: Record<string, string[]> = {};
    for (const chip of chips) {
      (f[chip.categoryId] ??= []).push(chip.value);
    }
    return f;
  }, [chips]);

  const weaponFuse = useMemo(() => createWeaponFuse(weapons), [weapons]);
  const deferredQuery = useDeferredValue(query);

  const weaponResults = useMemo(() => {
    const q = deferredQuery.trim();
    const base = q
      ? weaponFuse.search(q, { limit: FUSE_PRE_LIMIT }).map((r) => r.item)
      : weapons;
    return sortWeapons(filterWeapons(base, weaponFilters, perks), sort, dpsByName);
  }, [weaponFuse, weapons, perks, deferredQuery, weaponFilters, sort, dpsByName]);

  const armorBase = query.trim() ? searchOwnedArmor(owned, query) : owned;
  const armorResults = sortOwnedArmor(filterOwnedArmor(armorBase, armorFilters));

  const resultLimit = showAllResults ? Infinity : MAX_RESULTS;
  const weaponShown = weaponResults.slice(0, resultLimit);
  const armorShown = armorResults.slice(0, resultLimit);
  const resultCount = mode === "weapon" ? weaponResults.length : armorResults.length;
  const shownCount = mode === "weapon" ? weaponShown.length : armorShown.length;

  const weaponPaletteResults = useMemo(
    () =>
      weaponShown.map((weapon) => ({
        id: String(weapon.hash),
        content: (
          <WeaponResultRow
            weapon={weapon}
            elementIconPath={elementIconMap.get(weapon.element)}
            dps={dpsByName.get(weapon.name)}
          />
        ),
      })),
    [weaponShown, elementIconMap, dpsByName],
  );

  const armorPaletteResults = useMemo(
    () =>
      armorShown.map((armor) => ({
        id: armor.instanceId,
        content: (
          <ArmorResultRow
            armor={armor}
            actionState={armorAction}
            onEquip={() => void runArmorAction(armor.instanceId, "equip", "/api/armor/equip")}
            onMoveToCharacter={() =>
              void runArmorAction(armor.instanceId, "transfer", "/api/armor/transfer")
            }
          />
        ),
      })),
    [armorShown, armorAction],
  );

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

  function addComposerPerk(categoryId: string, option: PaletteValueOption) {
    if (!CUSTOM_FILTER_TRAIT_CATEGORY_IDS.has(categoryId)) return;
    setCustomFilterComposer((prev) => {
      if (!prev) return prev;
      if (prev.perkNames.some((perk) => perk.toLowerCase() === option.id)) return prev;
      return { ...prev, perkNames: [...prev.perkNames, option.label] };
    });
  }

  function handleAddChip(categoryId: string, option: PaletteValueOption) {
    if (composingCustomFilter) {
      addComposerPerk(categoryId, option);
      return;
    }
    addChip(categoryId, option);
  }

  function handleRemoveChip(chipId: string) {
    if (composingCustomFilter) {
      setCustomFilterComposer((prev) => {
        if (!prev) return prev;
        const perkKey = chipId.replace(/^draft:/, "");
        return {
          ...prev,
          perkNames: prev.perkNames.filter((perk) => perk.toLowerCase() !== perkKey),
        };
      });
      return;
    }
    setChips((prev) => prev.filter((c) => c.id !== chipId));
  }

  function handleClearChips() {
    if (composingCustomFilter) {
      setCustomFilterComposer((prev) => (prev ? { ...prev, perkNames: [] } : null));
      return;
    }
    setChips([]);
  }

  function handleCreateCustomFilter() {
    if (!customFilterComposer) return;
    const name = customFilterComposer.name.trim();
    if (!name || customFilterComposer.perkNames.length === 0) return;

    const created = createFilter({ name, perkNames: customFilterComposer.perkNames });
    if (!created) return;

    const category = weaponCategories.find((c) => c.id === CUSTOM_FILTER_CATEGORY_ID);
    if (category) {
      addChip(CUSTOM_FILTER_CATEGORY_ID, {
        id: created.id,
        label: created.name,
      });
    }
    setCustomFilterComposer(null);
    setQuery("");
  }

  const canCreateCustomFilter =
    customFilterComposer != null &&
    customFilterComposer.name.trim().length > 0 &&
    customFilterComposer.perkNames.length > 0;

  const categoryActions = useMemo<PaletteAction[]>(() => {
    if (mode !== "weapon") return [];
    if (composingCustomFilter) {
      return [
        {
          id: "create-custom-filter-save",
          label: "Create filter",
          hint: canCreateCustomFilter ? undefined : "Add a name and at least one perk",
          variant: "primary",
          alwaysShow: true,
          keepPanelOpen: true,
          disabled: !canCreateCustomFilter,
          hideKeyboardHint: true,
          onSelect: handleCreateCustomFilter,
        },
        {
          id: "cancel-custom-filter",
          label: "Cancel",
          hint: "Discard this filter",
          alwaysShow: true,
          keepPanelOpen: true,
          hideKeyboardHint: true,
          onSelect: () => setCustomFilterComposer(null),
        },
      ];
    }
    return [
      {
        id: "create-custom-filter",
        label: "Create custom filter",
        hint: "Group perks into a reusable filter",
        icon: <ListFilterPlus className="text-muted-foreground size-3.5 shrink-0" aria-hidden />,
        hideKeyboardHint: true,
        keepPanelOpen: true,
        onSelect: () => setCustomFilterComposer({ name: "", perkNames: [] }),
      },
    ];
  }, [mode, composingCustomFilter, canCreateCustomFilter]);

  useEffect(() => {
    setShowAllResults(false);
  }, [chips, query, mode, sort]);

  function handleModeChange(next: Mode) {
    setMode(next);
    setChips([]);
    setQuery("");
    setArmorAction({});
  }

  async function runArmorAction(
    instanceId: string,
    action: "equip" | "transfer",
    path: "/api/armor/equip" | "/api/armor/transfer",
  ) {
    setArmorAction({
      pendingInstanceId: instanceId,
      pendingAction: action,
      error: undefined,
      errorInstanceId: undefined,
    });

    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instanceId }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      setArmorAction({});
      await refetchArmor();
    } catch (e: unknown) {
      setArmorAction({
        error: e instanceof Error ? e.message : "Action failed",
        errorInstanceId: instanceId,
      });
    }
  }

  const armorOverlay = !signedIn ? (
    <a href={ARMOR_LOGIN_URL} className="inline-flex">
      <Badge variant="warning">Reconnect your bungie account ↗</Badge>
    </a>
  ) : armorLoadError ? (
    <span className="text-destructive text-sm">{armorLoadError}</span>
  ) : undefined;

  const paletteChips = composingCustomFilter
    ? draftPerkChips(customFilterComposer.perkNames)
    : chips;

  const hasFilters = paletteChips.length > 0;
  const isFiltering = query.trim().length > 0;
  const showResults = hasFilters && !isFiltering && !composingCustomFilter;

  const placeholder = composingCustomFilter
    ? customFilterComposer.perkNames.length > 0
      ? "Add more perks…"
      : "Search trait perks"
    : mode === "weapon"
      ? "Search weapons, perks, or names"
      : armorLoading
        ? "Loading your armor…"
        : "Search armor by class, set, or stats";

  return (
    <div className="flex min-h-screen flex-col">
      <header className="relative px-4 py-4 text-center">
        <span className="text-base font-semibold tracking-tight">moonfang armory</span>
        {signedIn && (
          <Link
            href="/vault"
            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-4 -translate-y-1/2 text-sm"
          >
            Vault
          </Link>
        )}
      </header>

      <main className="mx-auto flex w-full flex-1 flex-col px-4 pt-6 sm:pt-[16vh]">
        <div
          className={cn(
            "mx-auto flex w-full max-w-[calc(100vw-2rem)] flex-col transition-opacity duration-200 ease-out motion-reduce:transition-none sm:w-fit",
            selected && "pointer-events-none opacity-0",
          )}
        >
          <div className="mb-4 flex justify-end">
            <div
              data-palette-ignore-close
              className="mr-6 flex shrink-0 cursor-pointer items-center"
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
            className="mx-0"
            placeholder={placeholder}
            categories={categories}
            categoryActions={categoryActions}
            suspendResults={selectedHash != null}
            chips={paletteChips}
            open={paletteOpen}
            onOpenChange={(open) => {
              setPaletteOpen(open);
              if (!open) setCustomFilterComposer(null);
            }}
            onAddChip={handleAddChip}
            onRemoveChip={handleRemoveChip}
            onClearChips={handleClearChips}
            getChipAppearance={(chip) => {
              if (chip.categoryId === CUSTOM_FILTER_DRAFT_CATEGORY_ID) {
                return { tone: "trait", hideLabel: true };
              }
              return getFilterChipAppearance(chip.categoryId, chip.value, elementIconMap);
            }}
            hideCategoryList={composingCustomFilter}
            plainPanelHeader={composingCustomFilter}
            panelHeader={
              composingCustomFilter ? (
                <div
                  className="space-y-3 py-3"
                  data-palette-ignore-close
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-white">New custom filter</p>
                    <p className="text-muted-foreground text-xs">
                      Combine different perks to create a custom filter.
                    </p>
                  </div>
                  <Input
                    id="custom-filter-name"
                    value={customFilterComposer.name}
                    onChange={(event) =>
                      setCustomFilterComposer((prev) =>
                        prev ? { ...prev, name: event.target.value } : prev,
                      )
                    }
                    placeholder="Name your custom filter, e.g. reload perks"
                    className="h-8 rounded-[8px] text-xs"
                    aria-label="Filter name"
                  />
                </div>
              ) : undefined
            }
            query={query}
            onQueryChange={setQuery}
            showResults={showResults}
          results={mode === "weapon" ? weaponPaletteResults : armorPaletteResults}
          onSelectResult={(id) => {
            if (mode === "weapon") {
              const weapon = byHash.get(Number(id));
              if (weapon) setSelectedHash(weapon.hash);
            }
          }}
          resultsEmpty={mode === "weapon" ? "No weapons match." : "Go farm!"}
          resultsHeader={
            showResults && mode === "armor" ? (
              <div className="text-muted-foreground text-base tracking-body">
                {resultCount} {resultCount === 1 ? "result" : "results"}
              </div>
            ) : showResults && mode === "weapon" ? (
              <div
                data-palette-ignore-close
                className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <span className="text-muted-foreground text-base tracking-body">
                  {resultCount} {resultCount === 1 ? "result" : "results"}
                </span>
                <PillSelect
                  variant="ghost"
                  aria-label="Sort weapons"
                  options={WEAPON_SORT_OPTIONS}
                  value={sort}
                  onValueChange={setSort}
                />
              </div>
            ) : undefined
          }
          resultsFooter={
            resultCount > shownCount ? (
              <button
                type="button"
                data-palette-ignore-close
                className="hover:text-foreground w-full cursor-pointer transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAllResults(true);
                }}
              >
                Showing {shownCount} of {resultCount}
              </button>
            ) : undefined
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

        {mode === "armor" && signedIn && armorLoading && (
          <p className="text-muted-foreground mt-3 text-center text-xs">Loading your armor…</p>
        )}

        {mode === "armor" && signedIn && !armorLoading && !armorLoadError && owned.length === 0 && (
          <p className="text-muted-foreground mt-3 text-center text-xs">
            No armor found — run <code>pnpm setup:bungie</code> to generate the armor index.
          </p>
        )}
      </main>

      {selected && (
        <WeaponDetailModal
          weapon={selected}
          highlightedBuildPerks={dpsByName.get(selected.name)?.buildPerks}
          onClose={() => setSelectedHash(null)}
        />
      )}
    </div>
  );
}
