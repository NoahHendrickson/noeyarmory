export type {
  PerkRef,
  PerkColumn,
  WeaponStat,
  WeaponDoc,
  WeaponIndex,
} from "./types";
export {
  filterWeapons,
  weaponsWithPerk,
  createWeaponFuse,
  fuzzySearchWeapons,
  collectFacets,
  collectPerks,
  type WeaponFilters,
  type FacetOption,
  type PerkOption,
} from "./search";
export { sampleWeapons } from "./fixtures/sample-weapons";
