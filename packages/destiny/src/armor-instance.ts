import {
  ARMOR3_STAT_NAME_BY_HASH,
  BALANCED_TUNING_PLUG_HASH,
  PLUG_CATEGORY_ARMOR3_MASTERWORKS,
  PLUG_CATEGORY_ARMOR_ARCHETYPES,
  PLUG_CATEGORY_TUNING_MODS,
  TUNING_MOD_TO_STAT_HASH,
} from "./armor30-constants";

export interface ItemSocketPlug {
  plugHash?: number;
}

export interface ItemStat {
  statHash: number;
  value: number;
}

export interface ReusablePlug {
  plugItemHash: number;
}

export interface PlugDef {
  hash: number;
  plug?: { plugCategoryHash?: number };
  displayProperties?: { name?: string };
}

export interface ItemDefWithSockets {
  sockets?: {
    socketEntries?: {
      singleInitialItemHash?: number;
      randomizedPlugSetHash?: number;
      reusablePlugSetHash?: number;
    }[];
  };
}

/** Whether an armor item definition is Armor 3.0 (Edge of Fate masterwork socket). */
export function isArmor30ItemDef(
  item: ItemDefWithSockets,
  items: Record<number, PlugDef>,
  plugSets: Record<number, { reusablePlugItems?: { plugItemHash: number }[] }>,
): boolean {
  for (const entry of item.sockets?.socketEntries ?? []) {
    const plugSetHash = entry.randomizedPlugSetHash ?? entry.reusablePlugSetHash;
    if (plugSetHash != null) {
      for (const p of plugSets[plugSetHash]?.reusablePlugItems ?? []) {
        if (items[p.plugItemHash]?.plug?.plugCategoryHash === PLUG_CATEGORY_ARMOR3_MASTERWORKS) {
          return true;
        }
      }
    }
    if (entry.singleInitialItemHash != null) {
      if (
        items[entry.singleInitialItemHash]?.plug?.plugCategoryHash ===
        PLUG_CATEGORY_ARMOR3_MASTERWORKS
      ) {
        return true;
      }
    }
  }
  return false;
}

/** Resolve rolled archetype name from instance socket plugs. */
export function resolveArchetypeFromSockets(
  sockets: ItemSocketPlug[],
  plugHashToName: Map<number, string>,
  items: Record<number, PlugDef>,
): string | undefined {
  for (const socket of sockets) {
    if (socket.plugHash == null) continue;
    const def = items[socket.plugHash];
    if (def?.plug?.plugCategoryHash === PLUG_CATEGORY_ARMOR_ARCHETYPES) {
      return plugHashToName.get(socket.plugHash) ?? def.displayProperties?.name;
    }
  }
  return undefined;
}

/** Find the tuning socket index from plugged + reusable plug category checks. */
export function findTuningSocketIndex(
  sockets: ItemSocketPlug[],
  items: Record<number, PlugDef>,
): number | undefined {
  for (let i = 0; i < sockets.length; i++) {
    const plugHash = sockets[i]?.plugHash;
    if (plugHash == null) continue;
    if (items[plugHash]?.plug?.plugCategoryHash === PLUG_CATEGORY_TUNING_MODS) {
      return i;
    }
  }
  return undefined;
}

/** Returns the 3rd-highest nonzero armor stat name (Armor 3.0 tertiary). */
export function resolveTertiaryStat(stats: ItemStat[]): string | undefined {
  const ranked = stats
    .filter((s) => s.statHash > 0 && s.value > 0 && s.statHash in ARMOR3_STAT_NAME_BY_HASH)
    .sort((a, b) => b.value - a.value);
  const tertiary = ranked[2];
  if (!tertiary) return undefined;
  return ARMOR3_STAT_NAME_BY_HASH[tertiary.statHash];
}

/**
 * Which stat can receive +5 on this piece — derived from reusable +5/-5 tuning
 * mod plugs, not the equipped tuning mod.
 */
export function resolveTunableStat(
  reusablePlugs: ReusablePlug[] | undefined,
): string | undefined {
  if (!reusablePlugs?.length) return undefined;
  for (const { plugItemHash } of reusablePlugs) {
    const statHash = TUNING_MOD_TO_STAT_HASH[plugItemHash];
    if (statHash != null) {
      return ARMOR3_STAT_NAME_BY_HASH[statHash];
    }
  }
  return undefined;
}

/** Resolve rolled archetype from instance sockets using the index archetype catalog. */
export function resolveArchetypeFromPlugMap(
  sockets: ItemSocketPlug[],
  archetypeMap: Map<number, string>,
): string | undefined {
  for (const socket of sockets) {
    if (socket.plugHash == null) continue;
    const name = archetypeMap.get(socket.plugHash);
    if (name) return name;
  }
  return undefined;
}

/** Build plug-hash → archetype name map from index archetype catalog. */
export function buildArchetypeMap(
  archetypes: { hash: number; name: string }[],
): Map<number, string> {
  return new Map(archetypes.map((a) => [a.hash, a.name]));
}

/** Scan all reusable plug sockets for a +5-capable tuning stat. */
export function resolveTunableStatFromReusablePlugs(
  plugsBySocket: Record<number, ReusablePlug[]> | undefined,
): string | undefined {
  if (!plugsBySocket) return undefined;
  for (const plugs of Object.values(plugsBySocket)) {
    const stat = resolveTunableStat(plugs);
    if (stat) return stat;
  }
  return undefined;
}

/** Locate the tuning socket on an instance (reusable +5 mods or Balanced Tuning plug). */
export function findTuningSocketIndexFromInstance(
  sockets: ItemSocketPlug[],
  plugsBySocket: Record<number, ReusablePlug[]> | undefined,
): number | undefined {
  if (plugsBySocket) {
    for (const [indexStr, plugs] of Object.entries(plugsBySocket)) {
      if (resolveTunableStat(plugs)) return Number(indexStr);
    }
  }
  for (let i = 0; i < sockets.length; i++) {
    const hash = sockets[i]?.plugHash;
    if (hash == null) continue;
    if (hash in TUNING_MOD_TO_STAT_HASH || hash === BALANCED_TUNING_PLUG_HASH) return i;
  }
  return undefined;
}

/** Resolve tunable (+5) stat for an armor instance from sockets + reusable plugs (component 310). */
export function resolveTunableStatForInstance(
  sockets: ItemSocketPlug[],
  plugsBySocket: Record<number, ReusablePlug[]> | undefined,
): string | undefined {
  const tuningIndex = findTuningSocketIndexFromInstance(sockets, plugsBySocket);
  if (tuningIndex != null) {
    const stat = resolveTunableStat(plugsBySocket?.[tuningIndex]);
    if (stat) return stat;
  }
  return resolveTunableStatFromReusablePlugs(plugsBySocket);
}
