import type { DestinyInventoryItemDefinition } from "bungie-api-ts/destiny2";

import type { DestinyIconDefinitionEntry, ManifestDefs } from "./manifest";
import { internWeaponCatalog } from "./intern-weapons";
import { normalizeWeaponSource, resolveWeaponSeason } from "./weapon-provenance";
import { reconcileCraftableTwins } from "./weapon-variants";
import { GENERIC_WEAPON_TYPE_ICONS } from "./weapon-type-icon-paths";
import type {
  AmmoTypeRef,
  DamageTypeRef,
  PerkColumn,
  PerkRef,
  StatGroupRef,
  StatMod,
  WeaponDoc,
  WeaponIndex,
  WeaponStat,
  WeaponTypeRef,
} from "./types";
import type { WeaponDetailIndex } from "./types";

const WEAPON_ITEM_TYPE = 3; // DestinyItemType.Weapon

// Stable socket-category hashes.
const SOCKET_CATEGORY_INTRINSIC = 3956125808;
const SOCKET_CATEGORY_WEAPON_PERKS = 4241085061;

const AMMO_NAMES: Record<number, string> = { 1: "Primary", 2: "Special", 3: "Heavy" };

const BUCKET_SLOT: Record<number, string> = {
  1498876634: "Kinetic",
  2465295065: "Energy",
  953998645: "Power",
};

/** Plugs that are cosmetic, empty, or otherwise not a real perk roll. */
function isCosmeticOrEmptyPlug(def: DestinyInventoryItemDefinition): boolean {
  const id = def.plug?.plugCategoryIdentifier ?? "";
  const name = def.displayProperties?.name ?? "";
  if (!name) return true;
  if (/(shader|skins|ornament|trackers|mementos|masterwork)/i.test(id)) return true;
  if (id.includes("empty") || /^Empty .* Socket$/i.test(name)) return true;
  if (/^(Kill Tracker|Tracker Disabled|Default (Shader|Ornament))/i.test(name)) return true;
  return false;
}

/** Bungie ships base (tier 2) and enhanced (tier 3) plugs per perk — we only display the base. */
function isEnhancedPlug(def: DestinyInventoryItemDefinition): boolean {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison -- tier 3 is the enhanced plug tier
  return def.inventory?.tierType === 3;
}

function plugDescription(def: DestinyInventoryItemDefinition): string | undefined {
  const description = def.displayProperties?.description?.trim();
  return description || undefined;
}

/** Non-conditional investment stat modifiers from a plug definition. */
export function extractPlugStatMods(def: DestinyInventoryItemDefinition): StatMod[] | undefined {
  const mods: StatMod[] = [];
  for (const inv of def.investmentStats ?? []) {
    if (inv.isConditionallyActive || inv.value === 0) continue;
    mods.push({ hash: inv.statTypeHash, value: inv.value });
  }
  return mods.length > 0 ? mods : undefined;
}

/** Base investment stats from a weapon item definition. */
function weaponInvestmentStats(
  item: DestinyInventoryItemDefinition,
  stats: ManifestDefs["DestinyStatDefinition"],
): WeaponStat[] {
  const weaponStats: WeaponStat[] = [];
  for (const s of item.investmentStats ?? []) {
    const statName = stats[s.statTypeHash]?.displayProperties?.name;
    if (statName) weaponStats.push({ hash: s.statTypeHash, name: statName, value: s.value });
  }
  return weaponStats;
}

type SocketPlugSetEntry = { plugItemHash: number; currentlyCanRoll?: boolean };

/** Socket entry subset needed for rollability heuristics. */
export interface SocketPlugSource {
  randomizedPlugSetHash?: number;
  reusablePlugSetHash?: number;
  singleInitialItemHash?: number;
}

/**
 * Whether a manifest plug-set entry should be treated as currently rollable.
 *
 * Bungie marks every plug in randomized pools `currentlyCanRoll: false` (all 6k+
 * legendary weapon perk sockets in the current manifest). Membership in the socket's
 * randomized plug set is the signal that a perk is in today's roll pool. The flag is
 * only meaningful for reusable-only pools (fixed/curated options).
 */
export function plugSetEntryCanRoll(
  socketEntry: SocketPlugSource,
  plugSetHash: number,
  plugEntry: SocketPlugSetEntry,
): boolean {
  if (
    socketEntry.randomizedPlugSetHash != null &&
    plugSetHash === socketEntry.randomizedPlugSetHash
  ) {
    return true;
  }
  return plugEntry.currentlyCanRoll ?? false;
}

/** Collect deduped plug candidates for one socket, OR-merging rollability per hash. */
export function collectSocketPlugCandidates(
  socketEntry: SocketPlugSource,
  plugSets: Record<number, { reusablePlugItems?: SocketPlugSetEntry[] }>,
): { hash: number; canRoll: boolean }[] {
  const byHash = new Map<number, boolean>();
  const plugSetHash = socketEntry.randomizedPlugSetHash ?? socketEntry.reusablePlugSetHash;

  if (plugSetHash != null) {
    for (const plug of plugSets[plugSetHash]?.reusablePlugItems ?? []) {
      const canRoll = plugSetEntryCanRoll(socketEntry, plugSetHash, plug);
      const existing = byHash.get(plug.plugItemHash);
      byHash.set(plug.plugItemHash, existing == null ? canRoll : existing || canRoll);
    }
  } else if (socketEntry.singleInitialItemHash) {
    // Fixed socket plug (e.g. origin trait) — not random, but not retired either.
    byHash.set(socketEntry.singleInitialItemHash, true);
  }

  return [...byHash.entries()].map(([hash, canRoll]) => ({ hash, canRoll }));
}

/** One visible perk per name; enhanced-tier hashes are kept as `alternateHashes` for vault resolution. */
export function buildColumnPerks(
  candidates: { hash: number; canRoll: boolean }[],
  items: Record<number, DestinyInventoryItemDefinition>,
): { perks: PerkRef[]; identifier: string } {
  const byName = new Map<
    string,
    {
      hash: number;
      name: string;
      icon?: string;
      canRoll: boolean;
      description?: string;
      enhancedHash?: number;
      enhancedDescription?: string;
      statMods?: StatMod[];
    }
  >();
  let identifier = "";

  for (const { hash, canRoll } of candidates) {
    const pd = items[hash];
    if (!pd || isCosmeticOrEmptyPlug(pd)) continue;
    if (!identifier) identifier = pd.plug?.plugCategoryIdentifier ?? "";
    const name = pd.displayProperties?.name ?? "";
    if (!name) continue;

    if (isEnhancedPlug(pd)) {
      const row = byName.get(name) ?? { hash: 0, name, canRoll: false };
      row.canRoll = row.canRoll || canRoll;
      row.enhancedHash = hash;
      row.enhancedDescription = plugDescription(pd);
      byName.set(name, row);
      continue;
    }

    const row = byName.get(name);
    byName.set(name, {
      hash,
      name,
      icon: pd.displayProperties?.icon || undefined,
      canRoll: row?.canRoll || canRoll,
      description: plugDescription(pd),
      enhancedHash: row?.enhancedHash,
      enhancedDescription: row?.enhancedDescription,
      statMods: extractPlugStatMods(pd) ?? row?.statMods,
    });
  }

  const perks: PerkRef[] = [];
  for (const row of byName.values()) {
    if (!row.hash) continue;
    perks.push({
      hash: row.hash,
      name: row.name,
      icon: row.icon,
      currentlyCanRoll: row.canRoll,
      description: row.description,
      enhancedDescription: row.enhancedDescription,
      alternateHashes: row.enhancedHash ? [row.enhancedHash] : undefined,
      statMods: row.statMods,
    });
  }
  return { perks, identifier };
}

/** Best-effort column label from a plug's category identifier. */
function columnKind(isIntrinsic: boolean, identifier: string): string {
  if (isIntrinsic) return "Intrinsic";
  const id = identifier.toLowerCase();
  if (id.includes("origin")) return "Origin Trait";
  if (id.includes("barrel")) return "Barrel";
  if (id.includes("blade")) return "Blade";
  if (id.includes("scope") || id.includes("sight")) return "Scope";
  if (id.includes("magazine") || id.includes("sword_energy")) return "Magazine";
  if (id.includes("batter")) return "Battery";
  if (id.includes("guard")) return "Guard";
  if (id.includes("string")) return "Bowstring";
  if (id.includes("arrow")) return "Arrows";
  if (id.includes("haft")) return "Haft";
  if (id.includes("tube") || id.includes("launcher_barrel")) return "Barrel";
  if (id.includes("grip") || id.includes("stock")) return "Stock";
  return "Trait";
}

/** Build the weapon-type catalog (Hand Cannon, Fusion Rifle, …) for filter chip icons. */
export function buildWeaponTypeCatalog(defs: ManifestDefs): WeaponTypeRef[] {
  const items = defs.DestinyInventoryItemDefinition;
  const present = new Set<string>();

  for (const item of Object.values(items)) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison -- compared to the known Weapon value
    if (item.itemType !== WEAPON_ITEM_TYPE || item.redacted) continue;
    if (item.itemTypeDisplayName) present.add(item.itemTypeDisplayName);
  }

  const refs: WeaponTypeRef[] = [];
  for (const name of present) {
    const icon = GENERIC_WEAPON_TYPE_ICONS[name];
    if (icon) refs.push({ name, icon });
  }
  return refs.sort((a, b) => a.name.localeCompare(b.name));
}

const AMMO_TYPE_ORDER = ["Primary", "Special", "Heavy"] as const;

/** Build the ammo-type catalog from DestinyIconDefinition HUD icons. */
export function buildAmmoTypeCatalog(
  icons: Record<string, DestinyIconDefinitionEntry>,
): AmmoTypeRef[] {
  const bySlug = new Map<string, string>();
  for (const icon of Object.values(icons)) {
    if (icon.redacted) continue;
    const foreground = icon.foreground ?? "";
    const match = foreground.match(/order_icon_ammo_(primary|special|heavy)/);
    if (match) bySlug.set(match[1]!, foreground);
  }

  return AMMO_TYPE_ORDER.flatMap((name) => {
    const icon = bySlug.get(name.toLowerCase());
    return icon ? [{ name, icon }] : [];
  });
}

/** Build the damage-type catalog (Solar, Arc, Void, …) for element icons. */
export function buildDamageTypeCatalog(defs: ManifestDefs): DamageTypeRef[] {
  const damageTypes: DamageTypeRef[] = [];
  for (const dt of Object.values(defs.DestinyDamageTypeDefinition)) {
    const name = dt.displayProperties?.name;
    if (!name || dt.redacted) continue;
    damageTypes.push({
      hash: dt.hash,
      name,
      icon: dt.displayProperties?.icon || undefined,
    });
  }
  damageTypes.sort((a, b) => a.name.localeCompare(b.name));
  return damageTypes;
}

/** Build compact stat-group definitions referenced by weapons. */
export function buildStatGroupCatalog(
  defs: ManifestDefs,
  statGroupHashes: Iterable<number>,
): Record<string, StatGroupRef> {
  const groups = defs.DestinyStatGroupDefinition;
  const catalog: Record<string, StatGroupRef> = {};
  for (const hash of statGroupHashes) {
    const group = groups[hash];
    if (!group) continue;
    catalog[String(hash)] = {
      hash: group.hash,
      maximumValue: group.maximumValue,
      scaledStats: (group.scaledStats ?? []).map((scaled) => ({
        statHash: scaled.statHash,
        maximumValue: scaled.maximumValue,
        displayInterpolation: (scaled.displayInterpolation ?? []).map((point) => ({
          value: point.value,
          weight: point.weight,
        })),
      })),
    };
  }
  return catalog;
}

const ATTUNEMENT_VENDOR_SUFFIX = " Attunement";
const ATTUNEMENT_DESCRIPTION_PATTERN =
  /attune to an item to increase its drop chance from this activity/i;

function sourceFromAttunementVendorName(name: string | undefined): string | undefined {
  const source = name?.trim().replace(new RegExp(`${ATTUNEMENT_VENDOR_SUFFIX}$`, "i"), "").trim();
  return source || undefined;
}

function attunementItemWeaponHash(item: DestinyInventoryItemDefinition): number | undefined {
  const description = item.displayProperties?.description ?? "";
  if (!ATTUNEMENT_DESCRIPTION_PATTERN.test(description)) return undefined;
  return item.displayProperties?.iconHash;
}

/** Activity attunement vendors expose updated Ops sources for their attunable weapons. */
export function deriveAttunementSourceOverrides(defs: ManifestDefs): Map<number, string> {
  const overrides = new Map<number, string>();
  const items = defs.DestinyInventoryItemDefinition;
  const vendors = defs.DestinyVendorDefinition ?? {};

  for (const vendor of Object.values(vendors)) {
    const source = sourceFromAttunementVendorName(vendor.displayProperties?.name);
    if (!source) continue;
    const description = vendor.displayProperties?.description ?? "";
    if (!ATTUNEMENT_DESCRIPTION_PATTERN.test(description)) continue;

    for (const entry of vendor.itemList ?? []) {
      const attunementItem = items[entry.itemHash];
      if (!attunementItem) continue;
      const weaponHash = attunementItemWeaponHash(attunementItem);
      if (weaponHash == null) continue;
      const weapon = items[weaponHash];
      if (!weapon) continue;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison -- compared to the known Weapon value
      if (weapon.itemType !== WEAPON_ITEM_TYPE) continue;
      overrides.set(weaponHash, source);
    }
  }

  return overrides;
}

/** Flatten the manifest definitions into a searchable weapon index. */
export function buildWeaponIndex(
  defs: ManifestDefs,
  version: string,
  ammoTypes: AmmoTypeRef[] = [],
): { index: WeaponIndex; detailIndex: WeaponDetailIndex } {
  const items = defs.DestinyInventoryItemDefinition;
  const plugSets = defs.DestinyPlugSetDefinition;
  const stats = defs.DestinyStatDefinition;
  const damageTypes = defs.DestinyDamageTypeDefinition;
  const collectibles = defs.DestinyCollectibleDefinition;
  const presentationNodes = defs.DestinyPresentationNodeDefinition;
  const sourceOverrides = deriveAttunementSourceOverrides(defs);

  const weapons: WeaponDoc[] = [];

  for (const item of Object.values(items)) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison -- compared to the known Weapon value
    if (item.itemType !== WEAPON_ITEM_TYPE || item.redacted) continue;
    const name = item.displayProperties?.name;
    if (!name || !item.sockets || !item.equippingBlock) continue;

    // Which socket indexes are intrinsic vs. perk columns?
    const intrinsicIdx = new Set<number>();
    const perkIdx: number[] = [];
    for (const cat of item.sockets.socketCategories ?? []) {
      if (cat.socketCategoryHash === SOCKET_CATEGORY_INTRINSIC) {
        for (const i of cat.socketIndexes) intrinsicIdx.add(i);
      } else if (cat.socketCategoryHash === SOCKET_CATEGORY_WEAPON_PERKS) {
        for (const i of cat.socketIndexes) perkIdx.push(i);
      }
    }

    const columns: PerkColumn[] = [];
    for (const idx of [...intrinsicIdx, ...perkIdx]) {
      const entry = item.sockets.socketEntries[idx];
      if (!entry) continue;
      const isIntrinsic = intrinsicIdx.has(idx);

      const candidates = collectSocketPlugCandidates(entry, plugSets);
      if (!candidates.length) continue;

      const { perks, identifier } = buildColumnPerks(candidates, items);
      if (!perks.length) continue;
      columns.push({ kind: columnKind(isIntrinsic, identifier), perks });
    }

    const weaponStats: WeaponStat[] = [];
    for (const s of Object.values(item.stats?.stats ?? {})) {
      const statName = stats[s.statHash]?.displayProperties?.name;
      if (statName) weaponStats.push({ hash: s.statHash, name: statName, value: s.value });
    }

    const investmentStats = weaponInvestmentStats(item, stats);
    const statGroupHash = item.stats?.statGroupHash ?? undefined;

    const element =
      (item.defaultDamageTypeHash != null
        ? damageTypes[item.defaultDamageTypeHash]?.displayProperties?.name
        : undefined) ?? "Kinetic";
    const collectible =
      item.collectibleHash != null ? collectibles[item.collectibleHash] : undefined;
    const source =
      sourceOverrides.get(item.hash) ??
      normalizeWeaponSource(
        collectible?.sourceString,
        presentationNodes,
        collectible?.parentNodeHashes,
      );
    const season = resolveWeaponSeason(item, collectible, defs);

    const perkNames: string[] = [];
    const perkHashes: number[] = [];
    for (const col of columns) {
      for (const p of col.perks) {
        if (p.name) perkNames.push(p.name);
        perkHashes.push(p.hash);
        for (const alt of p.alternateHashes ?? []) perkHashes.push(alt);
      }
    }

    weapons.push({
      hash: item.hash,
      name,
      icon: item.displayProperties?.icon || undefined,
      watermark: item.iconWatermark || undefined,
      screenshot: item.screenshot || undefined,
      flavor: item.flavorText || undefined,
      type: item.itemTypeDisplayName || "Weapon",
      element,
      ammo: AMMO_NAMES[item.equippingBlock.ammoType] ?? "Primary",
      rarity: item.inventory?.tierTypeName ?? "Legendary",
      slot: BUCKET_SLOT[item.inventory?.bucketTypeHash ?? 0] ?? "",
      frame: columns.find((c) => c.kind === "Intrinsic")?.perks[0]?.name,
      craftable: item.inventory?.recipeItemHash != null,
      adept: /\((Adept|Timelost|Harrowed)\)/.test(name),
      seasonNumber: season?.seasonNumber,
      seasonName: season?.seasonName,
      source,
      releaseIndex: item.index,
      stats: weaponStats,
      investmentStats: investmentStats.length > 0 ? investmentStats : undefined,
      statGroupHash,
      columns,
      perks: [...new Set(perkNames)],
      perkHashes: [...new Set(perkHashes)],
    });
  }

  weapons.sort((a, b) => a.name.localeCompare(b.name));
  const reconciled = reconcileCraftableTwins(weapons);
  const { index, detailIndex } = internWeaponCatalog(reconciled, version);
  const statGroupHashes = new Set<number>();
  for (const weapon of weapons) {
    if (weapon.statGroupHash != null) statGroupHashes.add(weapon.statGroupHash);
  }
  return {
    index: {
      ...index,
      damageTypes: buildDamageTypeCatalog(defs),
      weaponTypes: buildWeaponTypeCatalog(defs),
      ammoTypes,
    },
    detailIndex: {
      ...detailIndex,
      statGroups: buildStatGroupCatalog(defs, statGroupHashes),
    },
  };
}
