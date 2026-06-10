import { matchRank } from "@repo/search-rank";

import type {
  ArmorCatalogDiffSource,
  ArmorDoc,
  ArmorIndex,
  NewArmorIndex,
  NewArmorSetGroup,
} from "./types";

const MIN_SEARCH_LENGTH = 2;

function armorHashesFromDiffSource(previous: ArmorCatalogDiffSource): Set<number> {
  if ("armorHashes" in previous) return new Set(previous.armorHashes);
  return new Set(previous.armor.map((item) => item.hash));
}

const CLASS_ORDER = ["Titan", "Hunter", "Warlock", "Any"];
const SLOT_ORDER = ["Helmet", "Gauntlets", "Chest", "Legs", "Class"];

function sortNewArmorPieces(a: ArmorDoc, b: ArmorDoc): number {
  const classDelta = CLASS_ORDER.indexOf(a.classType) - CLASS_ORDER.indexOf(b.classType);
  if (classDelta !== 0) return classDelta;

  const slotDelta = SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot);
  if (slotDelta !== 0) return slotDelta;

  return a.name.localeCompare(b.name);
}

export function groupNewArmorBySet(index: NewArmorIndex): NewArmorSetGroup[] {
  const setsByHash = new Map(index.armor30Sets.map((set) => [set.hash, set]));
  const groups = new Map<string, NewArmorSetGroup>();

  for (const piece of index.armor) {
    const key = piece.setHash != null ? `set-${piece.setHash}` : `item-${piece.hash}`;
    const set = piece.setHash != null ? setsByHash.get(piece.setHash) : undefined;
    const existing = groups.get(key);

    if (existing) {
      existing.pieces.push(piece);
      if (!existing.source && piece.source) existing.source = piece.source;
      continue;
    }

    groups.set(key, {
      key,
      name: set?.name ?? piece.setName ?? piece.name,
      source: piece.source,
      set,
      pieces: [piece],
    });
  }

  return [...groups.values()]
    .map((group) => ({ ...group, pieces: [...group.pieces].sort(sortNewArmorPieces) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function newArmorSetSearchFields(group: NewArmorSetGroup): string[] {
  const fields = [group.name, group.source ?? ""];
  for (const perkName of group.set?.perkNames ?? []) {
    fields.push(perkName);
  }
  for (const perk of group.set?.perks ?? []) {
    fields.push(perk.name);
    if (perk.description) fields.push(perk.description);
  }
  for (const piece of group.pieces) {
    fields.push(piece.name, piece.classType, piece.slot);
  }
  return fields.filter(Boolean);
}

function newArmorSetMatchScore(group: NewArmorSetGroup, query: string): number | null {
  let best: number | null = null;
  for (const field of newArmorSetSearchFields(group)) {
    const rank = matchRank(field, query);
    if (rank != null && (best == null || rank < best)) best = rank;
  }
  return best;
}

/** Filter grouped new-armor sets by name, source, perk text, or piece fields. */
export function filterNewArmorSets(
  groups: NewArmorSetGroup[],
  query: string,
): NewArmorSetGroup[] {
  const trimmed = query.trim();
  if (trimmed.length < MIN_SEARCH_LENGTH) return groups;

  return groups.filter((group) => newArmorSetMatchScore(group, trimmed) != null);
}

export function buildNewArmorIndex(
  current: ArmorIndex,
  previous?: ArmorCatalogDiffSource,
): NewArmorIndex {
  const base = {
    version: current.version,
    generatedAt: current.generatedAt,
    hasBaseline: previous != null,
    baselineVersion: previous?.version,
    baselineGeneratedAt: previous?.generatedAt,
  };

  if (!previous) {
    return {
      ...base,
      newArmorHashes: [],
      newSetHashes: [],
      armor: [],
      armor30Sets: [],
    };
  }

  const previousArmorHashes = armorHashesFromDiffSource(previous);
  const armor = current.armor.filter((item) => !previousArmorHashes.has(item.hash));
  const newSetHashes = [
    ...new Set(
      armor
        .filter((item) => item.isArmor30 && item.setHash != null)
        .map((item) => item.setHash!),
    ),
  ];
  const newSetHashSet = new Set(newSetHashes);

  return {
    ...base,
    newArmorHashes: armor.map((item) => item.hash),
    newSetHashes,
    armor,
    armor30Sets: current.armor30Sets.filter((set) => newSetHashSet.has(set.hash)),
  };
}
