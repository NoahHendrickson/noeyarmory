import type {
  InternedPerkColumn,
  PerkColumn,
  PerkRef,
  WeaponDetailFields,
  WeaponDetailIndex,
  WeaponDoc,
  WeaponIndex,
  WeaponSummary,
} from "./types";

const lower = (s: string) => s.toLowerCase();

function isLegacyColumn(
  column: InternedPerkColumn | PerkColumn,
): column is PerkColumn {
  return "perks" in column && Array.isArray(column.perks);
}

/** True when weapons still embed full PerkRef objects in columns (pre-interning format). */
export function isLegacyWeaponDoc(weapon: WeaponSummary | WeaponDoc): weapon is WeaponDoc {
  const first = weapon.columns[0];
  return first != null && isLegacyColumn(first);
}

/** Resolve interned columns to full perk objects. */
export function resolveInternedColumns(
  columns: InternedPerkColumn[],
  perks: PerkRef[],
): PerkColumn[] {
  return columns.map((column) => ({
    kind: column.kind,
    perks: column.perkIndices
      .map((index) => perks[index])
      .filter((perk): perk is PerkRef => perk != null),
  }));
}

/** Merge a browse summary with optional detail fields into a full WeaponDoc. */
export function expandWeapon(
  summary: WeaponSummary,
  detail: WeaponDetailFields | undefined,
  perks: PerkRef[],
): WeaponDoc {
  const { columns, perksLower: _perksLower, ...rest } = summary;
  return {
    ...rest,
    screenshot: detail?.screenshot,
    flavor: detail?.flavor,
    stats: detail?.stats ?? [],
    columns: resolveInternedColumns(columns, perks),
  };
}

/** Map every perk plug hash to its PerkRef from the global catalog. */
export function buildPerkMapFromCatalog(perks: PerkRef[]): Map<number, PerkRef> {
  const map = new Map<number, PerkRef>();
  for (const perk of perks) {
    if (!map.has(perk.hash)) map.set(perk.hash, perk);
    for (const alt of perk.alternateHashes ?? []) {
      if (!map.has(alt)) map.set(alt, perk);
    }
  }
  return map;
}

function buildWeaponsByPerkNameRecord(summaries: WeaponSummary[]): Record<string, number[]> {
  const record: Record<string, number[]> = {};
  for (const weapon of summaries) {
    for (const name of weapon.perks) {
      const key = lower(name);
      (record[key] ??= []).push(weapon.hash);
    }
  }
  return record;
}

/** Intern full weapon docs into a compact browse index + separate detail map. */
export function internWeaponCatalog(
  weapons: WeaponDoc[],
  version: string,
  generatedAt = new Date().toISOString(),
): { index: WeaponIndex; detailIndex: WeaponDetailIndex } {
  const perks: PerkRef[] = [];
  const hashToIndex = new Map<number, number>();

  const internPerk = (perk: PerkRef): number => {
    const existing = hashToIndex.get(perk.hash);
    if (existing !== undefined) return existing;

    const index = perks.length;
    perks.push({
      hash: perk.hash,
      name: perk.name,
      icon: perk.icon,
      currentlyCanRoll: perk.currentlyCanRoll,
      description: perk.description,
      enhancedDescription: perk.enhancedDescription,
      alternateHashes: perk.alternateHashes,
    });
    hashToIndex.set(perk.hash, index);
    for (const alt of perk.alternateHashes ?? []) {
      hashToIndex.set(alt, index);
    }
    return index;
  };

  const summaries: WeaponSummary[] = weapons.map((weapon) => {
    const columns: InternedPerkColumn[] = weapon.columns.map((column) => ({
      kind: column.kind,
      perkIndices: column.perks.map((perk) => internPerk(perk)),
    }));
    const perkNames = [...new Set(weapon.perks)];
    return {
      hash: weapon.hash,
      name: weapon.name,
      icon: weapon.icon,
      watermark: weapon.watermark,
      type: weapon.type,
      element: weapon.element,
      ammo: weapon.ammo,
      rarity: weapon.rarity,
      slot: weapon.slot,
      frame: weapon.frame,
      craftable: weapon.craftable,
      adept: weapon.adept,
      seasonNumber: weapon.seasonNumber,
      releaseIndex: weapon.releaseIndex,
      columns,
      perks: perkNames,
      perksLower: perkNames.map(lower),
      perkHashes: weapon.perkHashes,
    };
  });

  const details: Record<string, WeaponDetailFields> = {};
  for (const weapon of weapons) {
    details[String(weapon.hash)] = {
      hash: weapon.hash,
      screenshot: weapon.screenshot,
      flavor: weapon.flavor,
      stats: weapon.stats,
    };
  }

  return {
    index: {
      version,
      generatedAt,
      perks,
      weapons: summaries,
      weaponsByPerkName: buildWeaponsByPerkNameRecord(summaries),
      damageTypes: [],
    },
    detailIndex: { version, details },
  };
}

/** Convert a legacy index (full WeaponDoc[]) into the interned browse format. */
export function normalizeWeaponIndex(raw: {
  version: string;
  generatedAt: string;
  weapons: (WeaponSummary | WeaponDoc)[];
  damageTypes?: WeaponIndex["damageTypes"];
  perks?: PerkRef[];
  weaponsByPerkName?: Record<string, number[]>;
}): WeaponIndex {
  if (raw.perks?.length && raw.weaponsByPerkName) {
    return {
      version: raw.version,
      generatedAt: raw.generatedAt,
      perks: raw.perks,
      weapons: raw.weapons as WeaponSummary[],
      weaponsByPerkName: raw.weaponsByPerkName,
      damageTypes: raw.damageTypes ?? [],
    };
  }

  const legacy = raw.weapons.filter(isLegacyWeaponDoc);
  if (legacy.length === 0) {
    return {
      version: raw.version,
      generatedAt: raw.generatedAt,
      perks: [],
      weapons: raw.weapons as WeaponSummary[],
      weaponsByPerkName: {},
      damageTypes: raw.damageTypes ?? [],
    };
  }

  const { index } = internWeaponCatalog(legacy, raw.version, raw.generatedAt);
  return { ...index, damageTypes: raw.damageTypes ?? [] };
}

/** Build a detail index from legacy full weapon docs (for sample fallback). */
export function buildDetailIndexFromDocs(
  weapons: WeaponDoc[],
  version: string,
): WeaponDetailIndex {
  const details: Record<string, WeaponDetailFields> = {};
  for (const weapon of weapons) {
    details[String(weapon.hash)] = {
      hash: weapon.hash,
      screenshot: weapon.screenshot,
      flavor: weapon.flavor,
      stats: weapon.stats,
    };
  }
  return { version, details };
}

/** Resolve weapon summaries from a precomputed weaponsByPerkName record. */
export function summariesForPerkName(
  name: string,
  weaponsByPerkName: Record<string, number[]>,
  byHash: Map<number, WeaponSummary>,
): WeaponSummary[] {
  const hashes = weaponsByPerkName[lower(name)] ?? [];
  return hashes
    .map((hash) => byHash.get(hash))
    .filter((weapon): weapon is WeaponSummary => weapon != null);
}
