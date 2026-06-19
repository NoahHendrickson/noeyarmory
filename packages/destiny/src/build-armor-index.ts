import { buildColumnPerks, collectSocketPlugCandidates, extractPlugStatMods } from "./build-index";
import { isArmor30ItemDef } from "./armor-instance";
import {
  ARMOR3_STAT_NAME_BY_HASH,
  ARMOR_STAT_PLUG_CATEGORIES,
  PLUG_CATEGORY_ARMOR_ARCHETYPES,
  PLUG_CATEGORY_ARMOR3_MASTERWORKS,
} from "./armor30-constants";
import type { ManifestDefs } from "./manifest";
import { resolveWeaponSeason, resolveWeaponSources } from "./weapon-provenance";
import type {
  Armor30SetBonus,
  Armor30SetRef,
  ArmorArchetypeRef,
  ArmorDoc,
  ArmorIndex,
  ArmorStat,
  PerkColumn,
  StatMod,
} from "./types";

const ARMOR_ITEM_TYPE = 2; // DestinyItemType.Armor

const SOCKET_CATEGORY_INTRINSIC = 3956125808;
const SOCKET_CATEGORY_ARMOR_MODS = 1926923633;
const SOCKET_CATEGORY_LARGE_PERKS = 4241085061;

const BUCKET_SLOT: Record<number, string> = {
  3448274439: "Helmet",
  3551918588: "Gauntlets",
  14239492: "Chest",
  20886954: "Legs",
  1585787867: "Class",
};

const CLASS_NAMES: Record<number, string> = {
  0: "Titan",
  1: "Hunter",
  2: "Warlock",
};

function armorColumnKind(categoryHash: number, identifier: string): string {
  if (categoryHash === SOCKET_CATEGORY_INTRINSIC) return "Intrinsic";
  if (categoryHash === SOCKET_CATEGORY_LARGE_PERKS) return "Perk";
  const id = identifier.toLowerCase();
  if (id.includes("origin")) return "Origin Trait";
  if (id.includes("mod")) return "Mod";
  return "Mod";
}

function buildArchetypeCatalog(defs: ManifestDefs): ArmorArchetypeRef[] {
  const items = defs.DestinyInventoryItemDefinition;
  const plugSets = defs.DestinyPlugSetDefinition;
  const seen = new Set<number>();
  const archetypes: ArmorArchetypeRef[] = [];

  for (const plugSet of Object.values(plugSets)) {
    for (const p of plugSet.reusablePlugItems ?? []) {
      const plug = items[p.plugItemHash];
      if (plug?.plug?.plugCategoryHash !== PLUG_CATEGORY_ARMOR_ARCHETYPES) continue;
      if (seen.has(p.plugItemHash)) continue;
      seen.add(p.plugItemHash);
      const name = plug.displayProperties?.name;
      if (name) archetypes.push({ hash: p.plugItemHash, name });
    }
  }

  archetypes.sort((a, b) => a.name.localeCompare(b.name));
  return archetypes;
}

/** Plug hash → Armor 3.0 stat deltas for equipped mods/tuning (not archetypes or masterworks). */
function buildPlugStatBonusMap(defs: ManifestDefs): Record<number, StatMod[]> {
  const items = defs.DestinyInventoryItemDefinition;
  const map: Record<number, StatMod[]> = {};

  for (const item of Object.values(items)) {
    const category = item.plug?.plugCategoryHash;
    if (category == null) continue;
    if (category === PLUG_CATEGORY_ARMOR_ARCHETYPES) continue;
    if (category === PLUG_CATEGORY_ARMOR3_MASTERWORKS) continue;
    if (!ARMOR_STAT_PLUG_CATEGORIES.has(category)) continue;

    const statMods = extractPlugStatMods(item);
    if (!statMods?.length) continue;

    const armorStatMods = statMods.filter((mod) => mod.hash in ARMOR3_STAT_NAME_BY_HASH);
    if (!armorStatMods.length) continue;

    map[item.hash] = armorStatMods;
  }

  return map;
}

/** Flatten manifest definitions into a searchable armor index. */
export function buildArmorIndex(defs: ManifestDefs, version: string): ArmorIndex {
  const items = defs.DestinyInventoryItemDefinition;
  const plugSets = defs.DestinyPlugSetDefinition;
  const stats = defs.DestinyStatDefinition;
  const collectibles = defs.DestinyCollectibleDefinition;
  const presentationNodes = defs.DestinyPresentationNodeDefinition;
  const equipableSets = defs.DestinyEquipableItemSetDefinition;
  const sandboxPerks = defs.DestinySandboxPerkDefinition;

  const archetypes = buildArchetypeCatalog(defs);
  const armor30SetCandidates = new Map<number, Armor30SetRef>();

  const armorPieces: ArmorDoc[] = [];

  for (const item of Object.values(items)) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison -- compared to the known Armor value
    if (item.itemType !== ARMOR_ITEM_TYPE || item.redacted) continue;
    const name = item.displayProperties?.name;
    if (!name || !item.sockets) continue;

    const slot = BUCKET_SLOT[item.inventory?.bucketTypeHash ?? 0];
    if (!slot) continue;

    const classType =
      item.classType != null ? (CLASS_NAMES[item.classType] ?? "Any") : "Any";

    const columns: PerkColumn[] = [];
    for (const cat of item.sockets.socketCategories ?? []) {
      if (
        cat.socketCategoryHash !== SOCKET_CATEGORY_INTRINSIC &&
        cat.socketCategoryHash !== SOCKET_CATEGORY_ARMOR_MODS &&
        cat.socketCategoryHash !== SOCKET_CATEGORY_LARGE_PERKS
      ) {
        continue;
      }

      for (const idx of cat.socketIndexes) {
        const entry = item.sockets.socketEntries[idx];
        if (!entry) continue;

        const candidates = collectSocketPlugCandidates(entry, plugSets);
        if (!candidates.length) continue;

        const { perks, identifier } = buildColumnPerks(candidates, items);
        if (!perks.length) continue;
        columns.push({
          kind: armorColumnKind(cat.socketCategoryHash, identifier),
          perks,
        });
      }
    }

    const armorStats: ArmorStat[] = [];
    for (const s of Object.values(item.stats?.stats ?? {})) {
      const statName = stats[s.statHash]?.displayProperties?.name;
      if (statName) armorStats.push({ hash: s.statHash, name: statName, value: s.value });
    }

    const modNames: string[] = [];
    const modHashes: number[] = [];
    for (const col of columns) {
      for (const p of col.perks) {
        if (p.name) modNames.push(p.name);
        modHashes.push(p.hash);
        for (const alt of p.alternateHashes ?? []) modHashes.push(alt);
      }
    }

    const isArmor30 = isArmor30ItemDef(item, items, plugSets);

    let setHash: number | undefined;
    let setName: string | undefined;
    const equipableSetHash = item.equippingBlock?.equipableItemSetHash;
    if (equipableSetHash != null) {
      const setDef = equipableSets[equipableSetHash];
      const bonuses: Armor30SetBonus[] = [];
      for (const p of setDef?.setPerks ?? []) {
        const perk = sandboxPerks[p.sandboxPerkHash];
        const name = perk?.displayProperties?.name;
        if (!name) continue;
        const description = perk.displayProperties?.description?.trim();
        bonuses.push({
          requiredSetCount: p.requiredSetCount,
          name,
          description: description || undefined,
        });
      }
      bonuses.sort((a, b) => a.requiredSetCount - b.requiredSetCount);
      if (setDef?.displayProperties?.name && bonuses.length > 0) {
        setHash = equipableSetHash;
        setName = setDef.displayProperties.name;
        if (isArmor30 && !armor30SetCandidates.has(equipableSetHash)) {
          armor30SetCandidates.set(equipableSetHash, {
            hash: equipableSetHash,
            name: setDef.displayProperties.name,
            bonuses,
          });
        }
      }
    }

    const collectible =
      item.collectibleHash != null ? collectibles[item.collectibleHash] : undefined;
    const { source, sources } = resolveWeaponSources(
      name,
      collectible?.sourceString,
      presentationNodes,
      collectible?.parentNodeHashes,
    );
    const season = resolveWeaponSeason(item, collectible, defs);

    armorPieces.push({
      hash: item.hash,
      name,
      icon: item.displayProperties?.icon || undefined,
      watermark: item.iconWatermark || undefined,
      slot,
      classType,
      type: item.itemTypeDisplayName || slot,
      rarity: item.inventory?.tierTypeName ?? "Legendary",
      source,
      sources,
      seasonNumber: season?.seasonNumber,
      releaseIndex: item.index,
      stats: armorStats,
      columns,
      mods: [...new Set(modNames)],
      modHashes: [...new Set(modHashes)],
      setHash,
      setName,
      isArmor30: isArmor30 || undefined,
    });
  }

  armorPieces.sort((a, b) => a.name.localeCompare(b.name));
  const armor30Sets = [...armor30SetCandidates.values()].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return {
    version,
    generatedAt: new Date().toISOString(),
    armor: armorPieces,
    archetypes,
    armor30Sets,
    plugStatMods: buildPlugStatBonusMap(defs),
  };
}
