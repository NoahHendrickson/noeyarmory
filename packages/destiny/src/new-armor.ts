import type { ArmorIndex, NewArmorIndex } from "./types";

export function buildNewArmorIndex(current: ArmorIndex, previous?: ArmorIndex): NewArmorIndex {
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

  const previousArmorHashes = new Set(previous.armor.map((item) => item.hash));
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
