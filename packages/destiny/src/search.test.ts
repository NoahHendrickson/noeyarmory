import { describe, expect, test } from "vitest";

import { sampleWeapons } from "./fixtures/sample-weapons";
import {
  buildPerkMapFromCatalog,
  enrichAmmoGenerationFromDetails,
  internWeaponCatalog,
} from "./intern-weapons";
import type { PerkRef, WeaponDetailFields, WeaponDoc } from "./types";
import {
  collectColumnPerks,
  collectFacets,
  collectPerks,
  filterWeaponNames,
  filterWeapons,
  fuzzySearchWeapons,
  rankWeaponResults,
  sortWeapons,
  suggestWeaponNames,
  sortFilteredWeaponNames,
  weaponsMatchingTextQuery,
  weaponsWithPerk,
  createWeaponFuse,
} from "./search";
import { AMMO_GENERATION_STAT_HASH } from "./weapon-stats";
import { buildWeaponIndexLookups, refreshWeaponSummaries } from "./weapon-index-lookups";

const { index: sampleIndex } = internWeaponCatalog(sampleWeapons, "sample");
const sampleSummaries = sampleIndex.weapons;
const samplePerks = sampleIndex.perks;

const names = (ws: { name: string }[]) => ws.map((w) => w.name).sort();
const orderedNames = (ws: { name: string }[]) => ws.map((w) => w.name);

describe("on-disk perksLower round-trip", () => {
  // generate.ts strips `perksLower` from the serialized index; normalizeWeaponIndex
  // (via buildWeaponIndexLookups) must re-derive it so search functions keep working.
  const onDisk = JSON.parse(
    JSON.stringify(sampleIndex, (key, value: unknown) =>
      key === "perksLower" ? undefined : value,
    ),
  ) as typeof sampleIndex;

  test("serialized index omits perksLower", () => {
    expect(onDisk.weapons.every((w) => !("perksLower" in w))).toBe(true);
  });

  test("normalizeWeaponIndex re-derives perksLower from perks", () => {
    const { weapons } = buildWeaponIndexLookups(onDisk);
    for (const w of weapons) {
      expect(w.perksLower).toEqual(w.perks.map((p) => p.toLowerCase()));
    }
  });

  test("required-perk filtering still works after the round-trip", () => {
    const { weapons, perks } = buildWeaponIndexLookups(onDisk);
    const sample = sampleSummaries.find((w) => w.perks.length > 0)!;
    const perkName = sample.perks[0]!;
    const result = filterWeapons(weapons, { perks: [perkName] }, perks);
    expect(result.map((w) => w.hash)).toContain(sample.hash);
  });
});

describe("filterWeapons", () => {
  test("element + type facets (all solar fusion rifles)", () => {
    const result = filterWeapons(
      sampleSummaries,
      { element: ["Solar"], type: ["Fusion Rifle"] },
      samplePerks,
    );
    expect(names(result)).toEqual(["Sunlit Fusion"]);
  });

  test("single element facet (all solar weapons)", () => {
    const result = filterWeapons(sampleSummaries, { element: ["Solar"] }, samplePerks);
    expect(names(result)).toEqual(["Sunlit Fusion", "Sunshot Scout"]);
  });

  test("requires all selected perks (AND semantics)", () => {
    const result = filterWeapons(
      sampleSummaries,
      { perks: ["Firefly", "Explosive Payload"] },
      samplePerks,
    );
    expect(names(result)).toEqual(["Fatebringer", "Sunshot Scout"]);
  });

  test("combines a facet with a perk", () => {
    const result = filterWeapons(
      sampleSummaries,
      { type: ["Fusion Rifle"], perks: ["Surrounded"] },
      samplePerks,
    );
    expect(names(result)).toEqual(["Sunlit Fusion"]);
  });

  test("craftable yes (only weapons with a shaping pattern)", () => {
    expect(names(filterWeapons(sampleSummaries, { craftable: ["Yes"] }, samplePerks))).toEqual([
      "Fatebringer",
      "Stormcharge",
    ]);
  });

  test("craftable no", () => {
    expect(names(filterWeapons(sampleSummaries, { craftable: ["No"] }, samplePerks))).toEqual([
      "Sunlit Fusion",
      "Sunshot Scout",
    ]);
  });

  test("custom perk groups match any listed perk in the group", () => {
    const result = filterWeapons(
      sampleSummaries,
      { customPerkGroups: [["Firefly", "Chill Clip"]] },
      samplePerks,
    );
    expect(names(result)).toEqual(["Fatebringer", "Stormcharge", "Sunshot Scout"]);
  });

  test("multiple custom perk groups require one match from each group", () => {
    const result = filterWeapons(
      sampleSummaries,
      { customPerkGroups: [["Firefly", "Chill Clip"], ["Explosive Payload", "Frenzy"]] },
      samplePerks,
    );
    expect(names(result)).toEqual(["Fatebringer", "Sunshot Scout"]);
  });

  test("custom perk groups combine with facets", () => {
    const result = filterWeapons(
      sampleSummaries,
      { element: ["Solar"], customPerkGroups: [["Firefly", "Chill Clip"]] },
      samplePerks,
    );
    expect(names(result)).toEqual(["Sunshot Scout"]);
  });
});

describe("weaponsWithPerk", () => {
  test("reverse search by perk name (everything that can roll Surrounded)", () => {
    expect(names(weaponsWithPerk(sampleSummaries, "surrounded"))).toEqual([
      "Fatebringer",
      "Sunlit Fusion",
    ]);
  });

  test("reverse search by perk hash", () => {
    expect(names(weaponsWithPerk(sampleSummaries, 110))).toEqual(["Fatebringer"]);
  });
});

describe("buildWeaponsByPerkName", () => {
  test("precomputed map on interned index matches runtime lookup", () => {
    expect(
      names(
        (sampleIndex.weaponsByPerkName.surrounded ?? [])
          .map((hash) => sampleSummaries.find((w) => w.hash === hash))
          .filter((w): w is (typeof sampleSummaries)[number] => w != null),
      ),
    ).toEqual(["Fatebringer", "Sunlit Fusion"]);
  });
});

describe("fuzzySearchWeapons", () => {
  test("finds a weapon by partial name", () => {
    const result = fuzzySearchWeapons(sampleSummaries, "fate");
    expect(result[0]?.name).toBe("Fatebringer");
  });

  test("empty query returns everything", () => {
    expect(fuzzySearchWeapons(sampleSummaries, "")).toHaveLength(sampleSummaries.length);
  });
});

describe("facets + perks", () => {
  test("collectFacets counts elements", () => {
    const byValue = Object.fromEntries(
      collectFacets(sampleSummaries).element!.map((f) => [f.value, f.count]),
    );
    expect(byValue).toEqual({ Arc: 2, Solar: 2 });
  });

  test("collectPerks counts weapons per perk", () => {
    const firefly = collectPerks(sampleSummaries, samplePerks).find((p) => p.name === "Firefly");
    expect(firefly?.count).toBe(2);
  });
});

describe("position-aware trait, slot + origin filters", () => {
  test("trait2 matches only weapons whose SECOND trait column can roll it", () => {
    expect(names(filterWeapons(sampleSummaries, { trait2: ["Frenzy"] }, samplePerks))).toEqual([
      "Fatebringer",
    ]);
  });

  test("trait1 does not match a perk that only appears in trait2", () => {
    expect(filterWeapons(sampleSummaries, { trait1: ["Frenzy"] }, samplePerks)).toEqual([]);
  });

  test("trait1 matches across weapons (Surrounded in the first trait column)", () => {
    expect(names(filterWeapons(sampleSummaries, { trait1: ["Surrounded"] }, samplePerks))).toEqual([
      "Fatebringer",
      "Sunlit Fusion",
    ]);
  });

  test("a single-trait weapon never matches a trait2 filter", () => {
    expect(filterWeapons(sampleSummaries, { trait2: ["Reservoir Burst"] }, samplePerks)).toEqual(
      [],
    );
  });

  test("slot facet (all energy weapons)", () => {
    expect(names(filterWeapons(sampleSummaries, { slot: ["Energy"] }, samplePerks))).toEqual([
      "Stormcharge",
      "Sunlit Fusion",
    ]);
  });

  test("origin trait", () => {
    expect(
      names(filterWeapons(sampleSummaries, { originTrait: ["Vault of Glass"] }, samplePerks)),
    ).toEqual(["Fatebringer"]);
  });

  test("exact weapon name", () => {
    expect(names(filterWeapons(sampleSummaries, { name: ["Fatebringer"] }, samplePerks))).toEqual([
      "Fatebringer",
    ]);
  });

  test("name filter AND-composes with trait filters", () => {
    expect(
      names(
        filterWeapons(sampleSummaries, { name: ["Fatebringer"], trait2: ["Frenzy"] }, samplePerks),
      ),
    ).toEqual(["Fatebringer"]);
    expect(
      filterWeapons(sampleSummaries, { name: ["Fatebringer"], trait2: ["Surrounded"] }, samplePerks),
    ).toEqual([]);
  });
});

describe("filterWeaponNames", () => {
  test("returns flat matches with weapon-specific searchRank", () => {
    const matches = filterWeaponNames(sampleSummaries, "fate");
    expect(matches.some((m) => m.value === "Fatebringer")).toBe(true);
    expect(matches.find((m) => m.value === "Fatebringer")?.searchRank).toBeLessThanOrEqual(1);
  });
});

describe("weaponsMatchingTextQuery", () => {
  test("includes exact name matches before fuse-only matches", () => {
    const fuse = createWeaponFuse(sampleSummaries);
    const matches = weaponsMatchingTextQuery(sampleSummaries, fuse, "fate", 20);
    expect(matches[0]?.name).toBe("Fatebringer");
  });

  test("respects the same chip filters as full results", () => {
    const fuse = createWeaponFuse(sampleSummaries);
    const candidates = weaponsMatchingTextQuery(sampleSummaries, fuse, "fate", 20);

    expect(
      filterWeapons(candidates, { element: ["Solar"] }, samplePerks).map((weapon) => weapon.name),
    ).toEqual([]);
    expect(
      filterWeapons(candidates, { element: ["Arc"] }, samplePerks).map((weapon) => weapon.name),
    ).toEqual(["Fatebringer"]);
  });
});

describe("rankWeaponResults", () => {
  test("pins exact name matches above other hits while respecting sort", () => {
    const summaries = sampleSummaries.map((weapon) => {
      if (weapon.name === "Fatebringer") return { ...weapon, ammoGeneration: 50 };
      if (weapon.name === "Sunshot Scout") return { ...weapon, ammoGeneration: 99 };
      return weapon;
    });
    const fuse = createWeaponFuse(summaries);
    const candidates = weaponsMatchingTextQuery(summaries, fuse, "sun", 20);

    expect(
      rankWeaponResults(candidates, "sun", "ammo-gen-desc").map((weapon) => weapon.name),
    ).toEqual(["Sunshot Scout", "Sunlit Fusion"]);
  });

  test("falls back to sort-only when the query is too short", () => {
    expect(rankWeaponResults(sampleSummaries, "s", "name").map((w) => w.name)).toEqual(
      orderedNames(sortWeapons(sampleSummaries, "name")),
    );
  });

  test("preserves search relevance within the name-matched bucket when sorting by name", () => {
    const fuse = createWeaponFuse(sampleSummaries);
    const candidates = weaponsMatchingTextQuery(sampleSummaries, fuse, "sun", 20);
    const expectedNameOrder = sortFilteredWeaponNames(filterWeaponNames(sampleSummaries, "sun"))
      .map((match) => match.value)
      .filter((name) => candidates.some((weapon) => weapon.name === name));

    expect(
      rankWeaponResults(candidates, "sun", "name")
        .filter((weapon) => expectedNameOrder.includes(weapon.name))
        .map((weapon) => weapon.name),
    ).toEqual(expectedNameOrder);
  });
});

describe("enrichAmmoGenerationFromDetails", () => {
  test("returns the same summaries array when nothing changes", () => {
    const details = new Map<number, WeaponDetailFields>([
      [
        1,
        {
          hash: 1,
          stats: [{ hash: AMMO_GENERATION_STAT_HASH, name: "Ammo Generation", value: 42 }],
        },
      ],
    ]);

    const enriched = sampleSummaries.map((weapon) =>
      weapon.name === "Fatebringer" ? { ...weapon, ammoGeneration: 42 } : weapon,
    );

    expect(enrichAmmoGenerationFromDetails(enriched, details)).toBe(enriched);
  });
});

describe("refreshWeaponSummaries", () => {
  test("rebuilds byHash after enriching summaries", () => {
    const lookups = buildWeaponIndexLookups(sampleIndex);
    const enriched = sampleSummaries.map((weapon) =>
      weapon.name === "Fatebringer" ? { ...weapon, ammoGeneration: 42 } : weapon,
    );

    const refreshed = refreshWeaponSummaries(lookups, enriched);

    expect(refreshed.weapons.find((w) => w.name === "Fatebringer")?.ammoGeneration).toBe(42);
    expect(refreshed.byHash.get(1)?.ammoGeneration).toBe(42);
    expect(refreshed).not.toBe(lookups);
  });

  test("returns the same lookups object when weapons are unchanged", () => {
    const lookups = buildWeaponIndexLookups(sampleIndex);
    expect(refreshWeaponSummaries(lookups, lookups.weapons)).toBe(lookups);
  });
});

describe("suggestWeaponNames", () => {
  test("ranks partial name matches with Fatebringer first", () => {
    const suggestions = suggestWeaponNames(sampleSummaries, "fate");
    expect(suggestions[0]?.value).toBe("Fatebringer");
  });

  test("returns empty for no matches", () => {
    expect(suggestWeaponNames(sampleSummaries, "xyz")).toEqual([]);
  });

  test("returns empty for blank query", () => {
    expect(suggestWeaponNames(sampleSummaries, "  ")).toEqual([]);
  });
});

describe("collectColumnPerks", () => {
  test("splits trait1 vs trait2 by column position", () => {
    const { trait1, trait2, originTrait } = collectColumnPerks(sampleSummaries, samplePerks);
    const t1 = trait1.map((p) => p.name);
    const t2 = trait2.map((p) => p.name);
    expect(t2).toContain("Frenzy");
    expect(t2).not.toContain("Explosive Payload");
    expect(t1).toContain("Surrounded");
    expect(t1).toContain("Explosive Payload");
    expect(originTrait.map((p) => p.name)).toEqual(["Vault of Glass"]);
  });

  test("counts weapons per trait1 perk", () => {
    const { trait1 } = collectColumnPerks(sampleSummaries, samplePerks);
    expect(trait1.find((p) => p.name === "Firefly")?.count).toBe(2);
  });

  test("currentlyCanRoll stays true when any weapon can still roll the perk", () => {
    const p = (hash: number, name: string, currentlyCanRoll: boolean): PerkRef => ({
      hash,
      name,
      currentlyCanRoll,
    });
    const weapons: WeaponDoc[] = [
      {
        hash: 10,
        name: "Retired Pool",
        type: "Auto Rifle",
        element: "Kinetic",
        ammo: "Primary",
        rarity: "Legendary",
        slot: "Kinetic",
        frame: "Adaptive Frame",
        craftable: false,
        adept: false,
        releaseIndex: 1,
        stats: [],
        columns: [{ kind: "Trait", perks: [p(500, "Surrounded", false)] }],
        perks: ["Surrounded"],
        perkHashes: [500],
      },
      {
        hash: 11,
        name: "Active Pool",
        type: "Auto Rifle",
        element: "Solar",
        ammo: "Primary",
        rarity: "Legendary",
        slot: "Energy",
        frame: "Adaptive Frame",
        craftable: false,
        adept: false,
        releaseIndex: 2,
        stats: [],
        columns: [{ kind: "Trait", perks: [p(500, "Surrounded", true)] }],
        perks: ["Surrounded"],
        perkHashes: [500],
      },
    ];
    const { index } = internWeaponCatalog(weapons, "test");
    const { trait1 } = collectColumnPerks(index.weapons, index.perks);
    expect(trait1.find((perk) => perk.name === "Surrounded")?.currentlyCanRoll).toBe(true);
  });

  test("interning keeps enhanced descriptions when the first weapon lacked them", () => {
    const p = (
      hash: number,
      name: string,
      extra?: Pick<PerkRef, "description" | "enhancedDescription" | "alternateHashes">,
    ): PerkRef => ({ hash, name, currentlyCanRoll: true, ...extra });
    const weapons: WeaponDoc[] = [
      {
        hash: 20,
        name: "Sparse",
        type: "Hand Cannon",
        element: "Arc",
        ammo: "Primary",
        rarity: "Legendary",
        slot: "Kinetic",
        frame: "Adaptive Frame",
        craftable: false,
        adept: false,
        releaseIndex: 1,
        stats: [],
        columns: [
          {
            kind: "Trait",
            perks: [p(600, "Firefly", { description: "Base only." })],
          },
        ],
        perks: ["Firefly"],
        perkHashes: [600],
      },
      {
        hash: 21,
        name: "Complete",
        type: "Hand Cannon",
        element: "Solar",
        ammo: "Primary",
        rarity: "Legendary",
        slot: "Energy",
        frame: "Adaptive Frame",
        craftable: false,
        adept: false,
        releaseIndex: 2,
        stats: [],
        columns: [
          {
            kind: "Trait",
            perks: [
              p(600, "Firefly", {
                description: "Base only.",
                enhancedDescription: "Enhanced bonus.",
                alternateHashes: [601],
              }),
            ],
          },
        ],
        perks: ["Firefly"],
        perkHashes: [600],
      },
    ];
    const { index } = internWeaponCatalog(weapons, "test");
    const firefly = index.perks.find((perk) => perk.name === "Firefly");
    expect(firefly).toMatchObject({
      description: "Base only.",
      enhancedDescription: "Enhanced bonus.",
      alternateHashes: [601],
    });
  });
});

describe("sortWeapons", () => {
  test("alphabetical by name", () => {
    expect(orderedNames(sortWeapons(sampleSummaries, "name"))).toEqual([
      "Fatebringer",
      "Stormcharge",
      "Sunlit Fusion",
      "Sunshot Scout",
    ]);
  });

  test("newest season first", () => {
    expect(orderedNames(sortWeapons(sampleSummaries, "season-desc"))).toEqual([
      "Stormcharge",
      "Fatebringer",
      "Sunshot Scout",
      "Sunlit Fusion",
    ]);
  });

  test("oldest season first", () => {
    expect(orderedNames(sortWeapons(sampleSummaries, "season-asc"))).toEqual([
      "Sunlit Fusion",
      "Sunshot Scout",
      "Fatebringer",
      "Stormcharge",
    ]);
  });

  test("highest DPS first, weapons without DPS last", () => {
    const dpsByName = new Map([
      ["Fatebringer", { dps: 3000, totalDamage: 30_000, buildPerks: [] }],
      ["Stormcharge", { dps: 5000, totalDamage: 50_000, buildPerks: [] }],
    ]);

    expect(orderedNames(sortWeapons(sampleSummaries, "dps-desc", dpsByName))).toEqual([
      "Stormcharge",
      "Fatebringer",
      "Sunlit Fusion",
      "Sunshot Scout",
    ]);
  });

  test("highest Ammo Generation first, weapons without the stat last", () => {
    const summaries = sampleSummaries.map((weapon) => {
      if (weapon.name === "Fatebringer") return { ...weapon, ammoGeneration: 80 };
      if (weapon.name === "Stormcharge") return { ...weapon, ammoGeneration: 95 };
      return weapon;
    });

    expect(orderedNames(sortWeapons(summaries, "ammo-gen-desc"))).toEqual([
      "Stormcharge",
      "Fatebringer",
      "Sunlit Fusion",
      "Sunshot Scout",
    ]);
  });
});

describe("buildPerkMapFromCatalog", () => {
  test("maps each plug hash to its perk (used to resolve owned/instanced rolls)", () => {
    const map = buildPerkMapFromCatalog(samplePerks);
    expect(map.get(110)?.name).toBe("Surrounded");
    expect(map.get(106)?.name).toBe("Firefly");
    expect(map.get(100)?.name).toBe("Adaptive Frame");
    expect(map.size).toBeGreaterThan(10);
  });
});
