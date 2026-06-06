import type { DestinyInventoryItemDefinition } from "bungie-api-ts/destiny2";

import type { ManifestDefs } from "./manifest";
import type { PerkColumn, PerkRef, WeaponDoc, WeaponIndex, WeaponStat } from "./types";

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

/** Flatten the manifest definitions into a searchable weapon index. */
export function buildWeaponIndex(defs: ManifestDefs, version: string): WeaponIndex {
  const items = defs.DestinyInventoryItemDefinition;
  const plugSets = defs.DestinyPlugSetDefinition;
  const stats = defs.DestinyStatDefinition;
  const damageTypes = defs.DestinyDamageTypeDefinition;

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

      const candidates: { hash: number; canRoll: boolean }[] = [];
      const plugSetHash = entry.randomizedPlugSetHash ?? entry.reusablePlugSetHash;
      if (plugSetHash != null) {
        for (const p of plugSets[plugSetHash]?.reusablePlugItems ?? []) {
          candidates.push({ hash: p.plugItemHash, canRoll: p.currentlyCanRoll ?? false });
        }
      } else if (entry.singleInitialItemHash) {
        candidates.push({ hash: entry.singleInitialItemHash, canRoll: false });
      }
      if (!candidates.length) continue;

      const perks: PerkRef[] = [];
      const seen = new Set<number>();
      let identifier = "";
      for (const { hash, canRoll } of candidates) {
        if (seen.has(hash)) continue;
        seen.add(hash);
        const pd = items[hash];
        if (!pd || isCosmeticOrEmptyPlug(pd)) continue;
        if (!identifier) identifier = pd.plug?.plugCategoryIdentifier ?? "";
        perks.push({
          hash,
          name: pd.displayProperties?.name ?? "",
          icon: pd.displayProperties?.icon || undefined,
          currentlyCanRoll: canRoll,
        });
      }
      if (!perks.length) continue;
      columns.push({ kind: columnKind(isIntrinsic, identifier), perks });
    }

    const weaponStats: WeaponStat[] = [];
    for (const s of Object.values(item.stats?.stats ?? {})) {
      const statName = stats[s.statHash]?.displayProperties?.name;
      if (statName) weaponStats.push({ hash: s.statHash, name: statName, value: s.value });
    }

    const element =
      (item.defaultDamageTypeHash != null
        ? damageTypes[item.defaultDamageTypeHash]?.displayProperties?.name
        : undefined) ?? "Kinetic";

    const perkNames: string[] = [];
    const perkHashes: number[] = [];
    for (const col of columns) {
      for (const p of col.perks) {
        if (p.name) perkNames.push(p.name);
        perkHashes.push(p.hash);
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
      craftable: false,
      adept: /\((Adept|Timelost|Harrowed)\)/.test(name),
      stats: weaponStats,
      columns,
      perks: [...new Set(perkNames)],
      perkHashes: [...new Set(perkHashes)],
    });
  }

  weapons.sort((a, b) => a.name.localeCompare(b.name));
  return { version, generatedAt: new Date().toISOString(), weapons };
}
