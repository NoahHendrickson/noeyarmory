import type { PaletteChip } from "@repo/ui";
import type { WeaponFilters } from "@repo/destiny";

import type { CustomWeaponFilter } from "../use-custom-weapon-filters";
import type { OwnedArmorFilters } from "../owned-armor-search";
import {
  ARMOR_DUPLICATE_CATEGORY_ID,
  ARMOR_DUPLICATE_NO_VALUE_ID,
  ARMOR_DUPLICATE_YES_VALUE_ID,
  CUSTOM_FILTER_CATEGORY_ID,
  DAMAGE_PERKS_VALUE_ID,
} from "./constants";

/** Maps the sentinel "Damage perks" picker option to its boolean filter field. */
function damagePerksFilterKey(
  categoryId: string,
): "trait1DamagePerks" | "trait2DamagePerks" | null {
  if (categoryId === "trait1") return "trait1DamagePerks";
  if (categoryId === "trait2") return "trait2DamagePerks";
  return null;
}

export function chipsToWeaponFilters(
  chips: PaletteChip[],
  customFilters: CustomWeaponFilter[],
): WeaponFilters {
  const f: Record<string, string[]> = {};
  const customPerkGroups: string[][] = [];
  const flags: WeaponFilters = {};
  for (const chip of chips) {
    if (chip.categoryId === CUSTOM_FILTER_CATEGORY_ID) {
      const filter = customFilters.find((candidate) => candidate.id === chip.valueId);
      if (filter) customPerkGroups.push(filter.perkNames);
      continue;
    }
    if (chip.valueId === DAMAGE_PERKS_VALUE_ID) {
      const key = damagePerksFilterKey(chip.categoryId);
      if (key) {
        flags[key] = true;
        continue;
      }
    }
    (f[chip.categoryId] ??= []).push(chip.value);
  }
  const merged: WeaponFilters = { ...f, ...flags };
  return customPerkGroups.length > 0 ? { ...merged, customPerkGroups } : merged;
}

export function chipsToArmorFilters(chips: PaletteChip[]): OwnedArmorFilters {
  const f: Record<string, string[]> = {};
  let isDupe: boolean | undefined;
  for (const chip of chips) {
    if (chip.categoryId === ARMOR_DUPLICATE_CATEGORY_ID) {
      if (chip.valueId === ARMOR_DUPLICATE_YES_VALUE_ID) isDupe = true;
      else if (chip.valueId === ARMOR_DUPLICATE_NO_VALUE_ID) isDupe = false;
      continue;
    }
    (f[chip.categoryId] ??= []).push(chip.value);
  }
  return isDupe != null ? { ...f, isDupe } : f;
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
  if (valueId === DAMAGE_PERKS_VALUE_ID) {
    const key = damagePerksFilterKey(categoryId);
    if (key) return { ...base, [key]: true };
  }
  const existing = (base[categoryId as keyof WeaponFilters] as string[] | undefined) ?? [];
  return { ...base, [categoryId]: [...existing, value] };
}
