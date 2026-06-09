import type { WeaponFilters } from "@repo/destiny";

const ARRAY_KEYS = [
  "element",
  "type",
  "ammo",
  "rarity",
  "frame",
  "slot",
  "trait1",
  "trait2",
  "originTrait",
  "perks",
  "craftable",
  "name",
] as const satisfies readonly (keyof WeaponFilters)[];

function mergeArray(a: string[] | undefined, b: string[] | undefined): string[] | undefined {
  if (!a?.length) return b?.length ? [...b] : a;
  if (!b?.length) return [...a];
  const seen = new Set(a.map((v) => v.toLowerCase()));
  const merged = [...a];
  for (const value of b) {
    if (!seen.has(value.toLowerCase())) {
      seen.add(value.toLowerCase());
      merged.push(value);
    }
  }
  return merged;
}

/**
 * Combine chip-derived filters (`base`) with keyword-parsed filters (`extra`),
 * OR-merging each facet array and letting keyword flags (adept / custom groups)
 * extend the base. `base` wins for `adept` only when `extra` doesn't set it.
 */
export function mergeWeaponFilters(base: WeaponFilters, extra: WeaponFilters): WeaponFilters {
  if (Object.keys(extra).length === 0) return base;
  const out: WeaponFilters = { ...base };

  for (const key of ARRAY_KEYS) {
    const merged = mergeArray(base[key] as string[] | undefined, extra[key] as string[] | undefined);
    if (merged) out[key] = merged;
  }

  if (extra.customPerkGroups?.length) {
    out.customPerkGroups = [...(base.customPerkGroups ?? []), ...extra.customPerkGroups];
  }
  if (extra.adept != null) out.adept = extra.adept;

  return out;
}
