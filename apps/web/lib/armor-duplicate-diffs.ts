import type { OwnedArmorItem } from "./armor-types";

export interface ArmorDuplicateDiff {
  highlightedStatHashes: ReadonlySet<number>;
  highlightTuning: boolean;
}

const lower = (value: string) => value.toLowerCase();

function duplicateArmorKey(armor: OwnedArmorItem): string | null {
  if (armor.isArmor30 !== true || !armor.setName || !armor.archetype) return null;
  return [armor.setName, armor.archetype].map(lower).join("\0");
}

function visibleStatKeys(armor: OwnedArmorItem): string[] {
  return (
    armor.stats
      ?.filter((stat) => stat.value > 0)
      .slice(0, 3)
      .map((stat) => `${lower(stat.name)}:${stat.value}`) ?? []
  );
}

function differingVisibleStatHashes(armor: OwnedArmorItem, group: OwnedArmorItem[]): Set<number> {
  const baseline = visibleStatKeys(group[0]!);
  const visibleStats = armor.stats?.filter((stat) => stat.value > 0).slice(0, 3) ?? [];
  const differingIndexes = new Set<number>();

  for (const candidate of group) {
    const keys = visibleStatKeys(armor);
    const candidateKeys = visibleStatKeys(candidate);
    const maxLength = Math.max(baseline.length, keys.length, candidateKeys.length);
    for (let index = 0; index < maxLength; index += 1) {
      if (keys[index] !== candidateKeys[index]) differingIndexes.add(index);
    }
  }

  return new Set(
    visibleStats
      .filter((_, index) => differingIndexes.has(index))
      .map((stat) => stat.hash),
  );
}

function hasDifferentTunings(group: OwnedArmorItem[]): boolean {
  const first = group[0]?.tunableStat ? lower(group[0].tunableStat) : "";
  return group.some((armor) => (armor.tunableStat ? lower(armor.tunableStat) : "") !== first);
}

export function buildArmorDuplicateDiffs(
  armor: readonly OwnedArmorItem[],
): ReadonlyMap<string, ArmorDuplicateDiff> {
  const groups = new Map<string, OwnedArmorItem[]>();
  for (const item of armor) {
    const key = duplicateArmorKey(item);
    if (!key) continue;
    const group = groups.get(key);
    if (group) group.push(item);
    else groups.set(key, [item]);
  }

  const diffs = new Map<string, ArmorDuplicateDiff>();
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const highlightTuning = hasDifferentTunings(group);

    for (const armor of group) {
      const highlightedStatHashes = differingVisibleStatHashes(armor, group);
      diffs.set(armor.instanceId, { highlightedStatHashes, highlightTuning });
    }
  }

  return diffs;
}
