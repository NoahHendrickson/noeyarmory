import type { DestinyCollectibleDefinition } from "bungie-api-ts/destiny2";
import type { DestinyInventoryItemDefinition } from "bungie-api-ts/destiny2";

import type { ManifestDefs } from "./manifest";

/** Canonical raid names shown in the Source filter (dungeons/vendors excluded). */
export const RAID_SOURCE_LABELS = [
  "Last Wish",
  "Scourge of the Past",
  "Crown of Sorrow",
  "Garden of Salvation",
  "Deep Stone Crypt",
  "Vault of Glass",
  "Vow of the Disciple",
  "King's Fall",
  "Root of Nightmares",
  "Crota's End",
  "Salvation's Edge",
  "The Desert Perpetual",
] as const;

/** Shorthand tokens players type when filtering by raid source. */
export const RAID_SOURCE_ALIASES: Readonly<Record<string, readonly string[]>> = {
  "Last Wish": ["lw"],
  "Garden of Salvation": ["gos", "garden"],
  "Deep Stone Crypt": ["dsc", "stone"],
  "Vault of Glass": ["vog", "vault"],
  "Vow of the Disciple": ["vow", "disciple"],
  "King's Fall": ["kf", "kings fall"],
  "Root of Nightmares": ["ron", "root", "nightmares"],
  "Crota's End": ["crota"],
  "Salvation's Edge": ["salvation", "edge"],
  "The Desert Perpetual": ["desert", "perpetual", "tdp"],
};

const RAID_SOURCE_LABEL_SET = new Set(RAID_SOURCE_LABELS.map((label) => label.toLowerCase()));

function exactRaidLabel(value: string): string | undefined {
  return RAID_SOURCE_LABELS.find((raid) => raid.toLowerCase() === value.toLowerCase());
}

/** Map Bungie source strings onto canonical raid labels when possible. */
export function canonicalRaidSource(source: string | undefined): string | undefined {
  if (!source) return undefined;
  let value = trimActivityLabel(
    source
      .replace(/\s+/g, " ")
      .replace(/^Source:\s*/i, "")
      .replace(/"([^"]+)"/g, "$1")
      .replace(/\s*,\s*Eater of Worlds.*$/i, "")
      .replace(/\s*,\s*Spire of Stars.*$/i, "")
      .replace(/\s+(raid(\s+lair)?|dungeon)\.?$/i, "")
      .trim(),
  );
  if (!value) return undefined;

  const exact = exactRaidLabel(value);
  if (exact) return exact;

  let best: (typeof RAID_SOURCE_LABELS)[number] | undefined;
  for (const raid of RAID_SOURCE_LABELS) {
    if (!value.toLowerCase().includes(raid.toLowerCase())) continue;
    if (!best || raid.length > best.length) best = raid;
  }
  return best ?? value;
}

/** Destiny season number when an activity first introduced its loot pool (D2 reprisal seasons). */
export const ACTIVITY_INTRO_SEASON: Readonly<Record<string, number>> = {
  "Last Wish": 4,
  "Scourge of the Past": 5,
  "Crown of Sorrow": 7,
  "Garden of Salvation": 8,
  "Deep Stone Crypt": 12,
  "Vault of Glass": 14,
  "Grasp of Avarice": 15,
  "Vow of the Disciple": 16,
  "King's Fall": 18,
  "Spire of the Watcher": 19,
  "Root of Nightmares": 20,
  "Ghosts of the Deep": 21,
  "Crota's End": 22,
  "Warlord's Ruin": 23,
  "Salvation's Edge": 24,
  "Prophecy": 11,
  "Duality": 17,
  "Pit of Heresy": 9,
  "Rite of the Nine": 26,
  "Vesper's Host": 25,
  "Desert Perpetual": 27,
  "The Desert Perpetual": 27,
  "Sundered Doctrine": 26,
  "Equilibrium": 28,
  Encore: 28,
};

export interface ResolvedWeaponSeason {
  seasonNumber: number;
  seasonName?: string;
}

function trimActivityLabel(value: string): string {
  return value.replace(/\s+/g, " ").replace(/[.]+$/g, "").trim();
}

function cleanSourceString(source: string | undefined): string | undefined {
  const value = canonicalRaidSource(source);
  return value ? trimActivityLabel(value) : undefined;
}

function walkPresentationNodeNames(
  nodes: ManifestDefs["DestinyPresentationNodeDefinition"],
  startHashes: number[] | undefined,
): string[] {
  const names: string[] = [];
  const queue = [...(startHashes ?? [])];
  const seen = new Set<number>();
  while (queue.length) {
    const hash = queue.shift();
    if (hash == null || seen.has(hash)) continue;
    seen.add(hash);
    const node = nodes[hash];
    if (!node) continue;
    const name = node.displayProperties?.name?.trim();
    if (name) names.push(name);
    queue.push(...(node.parentNodeHashes ?? []));
  }
  return names;
}

function activityFromPresentationParents(parentNames: readonly string[]): string | undefined {
  for (const name of parentNames) {
    const raid = name.match(/^Raid:\s*(.+)$/i);
    if (raid) return trimActivityLabel(raid[1]!);
    const dungeon = name.match(/^Dungeon:\s*(.+)$/i);
    if (dungeon) return trimActivityLabel(dungeon[1]!);
  }
  return undefined;
}

function activityFromSourceString(sourceString: string | undefined): string | undefined {
  const quoted = sourceString?.match(/"([^"]+)"/);
  if (quoted) return trimActivityLabel(quoted[1]!);
  return cleanSourceString(sourceString);
}

/** Canonical activity/source label for browse filters, e.g. "Root of Nightmares". */
export function normalizeWeaponSource(
  sourceString: string | undefined,
  nodes: ManifestDefs["DestinyPresentationNodeDefinition"],
  parentNodeHashes: number[] | undefined,
): string | undefined {
  const parentNames = walkPresentationNodeNames(nodes, parentNodeHashes);
  return (
    activityFromSourceString(sourceString) ??
    activityFromPresentationParents(parentNames) ??
    cleanSourceString(sourceString)
  );
}

function seasonByNumber(
  seasons: ManifestDefs["DestinySeasonDefinition"],
  seasonNumber: number,
): ResolvedWeaponSeason | undefined {
  const season = Object.values(seasons).find((entry) => entry.seasonNumber === seasonNumber);
  if (!season?.seasonNumber) return undefined;
  return {
    seasonNumber: season.seasonNumber,
    seasonName: season.displayProperties?.name || undefined,
  };
}

function seasonByDisplayName(
  seasons: ManifestDefs["DestinySeasonDefinition"],
  displayName: string,
): ResolvedWeaponSeason | undefined {
  const wanted = displayName.trim().toLowerCase();
  const season = Object.values(seasons).find(
    (entry) => entry.displayProperties?.name?.trim().toLowerCase() === wanted,
  );
  if (!season?.seasonNumber) return undefined;
  return {
    seasonNumber: season.seasonNumber,
    seasonName: season.displayProperties?.name || undefined,
  };
}

function seasonFromPresentationParents(
  nodes: ManifestDefs["DestinyPresentationNodeDefinition"],
  seasons: ManifestDefs["DestinySeasonDefinition"],
  parentNodeHashes: number[] | undefined,
): ResolvedWeaponSeason | undefined {
  const queue = [...(parentNodeHashes ?? [])];
  const seen = new Set<number>();
  while (queue.length) {
    const hash = queue.shift();
    if (hash == null || seen.has(hash)) continue;
    seen.add(hash);

    const directSeason = seasons[hash];
    if (directSeason?.seasonNumber != null) {
      return {
        seasonNumber: directSeason.seasonNumber,
        seasonName: directSeason.displayProperties?.name || undefined,
      };
    }

    const node = nodes[hash];
    const name = node?.displayProperties?.name?.trim();
    if (name) {
      if (/^(Season|Episode:)/i.test(name)) {
        const matched = seasonByDisplayName(seasons, name);
        if (matched) return matched;
      }
      const numbered = name.match(/^Season\s+(\d+)(?::\s*.+)?$/i);
      if (numbered) {
        const matched = seasonByNumber(seasons, Number(numbered[1]));
        if (matched) return matched;
      }
    }

    queue.push(...(node?.parentNodeHashes ?? []));
  }
  return undefined;
}

function seasonFromSourceString(
  seasons: ManifestDefs["DestinySeasonDefinition"],
  sourceString: string | undefined,
): ResolvedWeaponSeason | undefined {
  const episode = sourceString?.match(/Episode:\s*([A-Za-z]+)\s+Activities/i);
  if (!episode) return undefined;
  return seasonByDisplayName(seasons, `Episode: ${episode[1]}`);
}

function seasonFromActivitySource(
  seasons: ManifestDefs["DestinySeasonDefinition"],
  source: string | undefined,
): ResolvedWeaponSeason | undefined {
  if (!source) return undefined;
  const trimmed = trimActivityLabel(source);
  const seasonNumber =
    ACTIVITY_INTRO_SEASON[trimmed] ??
    Object.entries(ACTIVITY_INTRO_SEASON).find(
      ([activity]) => activity.toLowerCase() === trimmed.toLowerCase(),
    )?.[1];
  return seasonNumber != null ? seasonByNumber(seasons, seasonNumber) : undefined;
}

/** Best-effort release season for a weapon — manifest links first, activity map as fallback. */
export function resolveWeaponSeason(
  item: DestinyInventoryItemDefinition,
  collectible: DestinyCollectibleDefinition | undefined,
  defs: Pick<
    ManifestDefs,
    "DestinySeasonDefinition" | "DestinyPresentationNodeDefinition"
  >,
): ResolvedWeaponSeason | undefined {
  if (item.seasonHash != null) {
    const season = defs.DestinySeasonDefinition[item.seasonHash];
    if (season?.seasonNumber != null) {
      return {
        seasonNumber: season.seasonNumber,
        seasonName: season.displayProperties?.name || undefined,
      };
    }
  }

  const fromParents = seasonFromPresentationParents(
    defs.DestinyPresentationNodeDefinition,
    defs.DestinySeasonDefinition,
    collectible?.parentNodeHashes,
  );
  if (fromParents) return fromParents;

  const fromEpisode = seasonFromSourceString(
    defs.DestinySeasonDefinition,
    collectible?.sourceString,
  );
  if (fromEpisode) return fromEpisode;

  const source = normalizeWeaponSource(
    collectible?.sourceString,
    defs.DestinyPresentationNodeDefinition,
    collectible?.parentNodeHashes,
  );
  return seasonFromActivitySource(defs.DestinySeasonDefinition, source);
}

const lower = (value: string) => value.toLowerCase();

export function isRaidSource(source: string | undefined): boolean {
  const canonical = canonicalRaidSource(source);
  if (!canonical) return false;
  return RAID_SOURCE_LABEL_SET.has(canonical.toLowerCase());
}

/** True when a raid label or shorthand alias matches the typed query. */
export function raidSourceMatchesQuery(source: string, query: string): boolean {
  const ql = query.trim().toLowerCase();
  if (!ql) return true;
  const label = trimActivityLabel(source).toLowerCase();
  if (label.includes(ql)) return true;
  const aliases = RAID_SOURCE_ALIASES[source] ?? RAID_SOURCE_ALIASES[trimActivityLabel(source)] ?? [];
  return aliases.some((alias) => alias.includes(ql) || ql.includes(alias));
}

/** True when a weapon source matches any selected activity fragment (substring, case-insensitive). */
export function matchesWeaponSource(
  source: string | undefined,
  selected: string[] | undefined,
): boolean {
  if (!selected?.length) return true;
  const canonical = canonicalRaidSource(source);
  if (!canonical) return false;
  const haystack = lower(canonical);
  return selected.some((entry) => {
    const needle = lower(entry.trim());
    return needle.length > 0 && haystack.includes(needle);
  });
}
