export type {
  PerkRef,
  PerkColumn,
  WeaponStat,
  WeaponDoc,
  WeaponIndex,
} from "./types";
export {
  filterWeapons,
  sortWeapons,
  weaponsWithPerk,
  createWeaponFuse,
  fuzzySearchWeapons,
  collectFacets,
  collectPerks,
  collectColumnPerks,
  buildPerkMap,
  type WeaponSort,
  type WeaponFilters,
  type FacetOption,
  type PerkOption,
  type ColumnPerkOptions,
} from "./search";
export { sampleWeapons } from "./fixtures/sample-weapons";
