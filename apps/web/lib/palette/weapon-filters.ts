import type { PaletteChip } from "@repo/ui";
import type { WeaponFilters } from "@repo/destiny";

import type { CustomWeaponFilter } from "../use-custom-weapon-filters";
import { CUSTOM_FILTER_CATEGORY_ID } from "./constants";

export function chipsToWeaponFilters(
  chips: PaletteChip[],
  customFilters: CustomWeaponFilter[],
): WeaponFilters {
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
}

export function chipsToArmorFilters(chips: PaletteChip[]): Record<string, string[]> {
  const f: Record<string, string[]> = {};
  for (const chip of chips) {
    (f[chip.categoryId] ??= []).push(chip.value);
  }
  return f;
}

export function withHypotheticalChip(
  base: WeaponFilters,
  categoryId: string,
  value: string,
  valueId: string,
  customFilters: CustomWeaponFilter[],
): WeaponFilters {
  if (categoryId === CUSTOM_FILTER_CATEGORY_ID) {
    const filter = customFilters.find((candidate) => candidate.id === valueId);
    if (!filter) return base;
    const groups = [...(base.customPerkGroups ?? []), filter.perkNames];
    return { ...base, customPerkGroups: groups };
  }
  const existing = (base[categoryId as keyof WeaponFilters] as string[] | undefined) ?? [];
  return { ...base, [categoryId]: [...existing, value] };
}
