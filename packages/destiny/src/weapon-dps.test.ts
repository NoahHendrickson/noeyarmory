import { describe, expect, test } from "vitest";

import {
  buildWeaponDpsIndex,
  extractTraitPerksFromRow,
  formatWeaponDpsLabel,
  matchSheetRowToWeapon,
  parseDpsNumber,
  parseTotalDamage,
} from "./weapon-dps";

describe("parseDpsNumber", () => {
  test("parses comma-separated numbers", () => {
    expect(parseDpsNumber("7,476")).toBe(7476);
  });

  test("returns null for INF and N/A", () => {
    expect(parseDpsNumber("INF")).toBeNull();
    expect(parseDpsNumber("N/A")).toBeNull();
  });
});

describe("parseTotalDamage", () => {
  test("parses finite totals", () => {
    expect(parseTotalDamage("64,773")).toBe(64773);
  });

  test("returns null for INF", () => {
    expect(parseTotalDamage("INF")).toBeNull();
  });
});

describe("matchSheetRowToWeapon", () => {
  const catalog = ["Outbreak Perfected", "Wolfsbane", "Hezen Vengeance"];

  test("prefers the longest catalog name", () => {
    expect(
      matchSheetRowToWeapon(
        "Wolfsbaneswapping after HLLHLLHLLHLLH, Honed Edge + Jagged Edge",
        catalog,
      ),
    ).toBe("Wolfsbane");
  });

  test("matches parenthetical weapon names", () => {
    expect(
      matchSheetRowToWeapon(
        "Adaptive rocket launcherTimelost Magazine (Hezen Vengeance), Pack Hunter",
        catalog,
      ),
    ).toBe("Hezen Vengeance");
  });
});

describe("extractTraitPerksFromRow", () => {
  test("matches trait perks mentioned in the sheet build string", () => {
    expect(
      extractTraitPerksFromRow(
        "Aggressive rocket launcherSlideshot + e. Surrounded (Crux Termination IV), Pack Hunter",
        [{ traitPerkNames: ["Slideshot", "Surrounded", "Auto-Loading Holster"] }],
      ),
    ).toEqual(["Surrounded", "Slideshot"]);
  });

  test("prefers the variant with the most trait matches", () => {
    expect(
      extractTraitPerksFromRow("Envious Arsenal + Bait and Switch (Tomorrow's Answer)", [
        { traitPerkNames: ["Pulse Monitor", "Genesis"] },
        { traitPerkNames: ["Envious Arsenal", "Bait and Switch", "Cluster Bomb"] },
      ]),
    ).toEqual(["Envious Arsenal", "Bait and Switch"]);
  });
});

describe("buildWeaponDpsIndex", () => {
  const catalog = [
    {
      name: "Hezen Vengeance",
      traitPerkNames: ["Envious Arsenal", "Elemental Honing", "Overflow"],
    },
  ];

  test("keeps the highest DPS row per weapon", () => {
    const csv = [
      "Name,Type,Family,Icon,#,Notes,Distribution,peakRate,TtE,Base,Perk,Surge,Buff,Debuff,200,Single,TFSTotal,TFSDPS,Total,DPS,diffTotal,diffDPS",
      "Adaptive rocket launcherBuild A (Hezen Vengeance),power,rocket,,,,,,,,,,,,,,,,50000,4000,,",
      "Adaptive rocket launcherEnvious Arsenal + Elemental Honing x5 (Hezen Vengeance),power,rocket,,,,,,,,,,,,,,,,60000,5855,,",
    ].join("\n");

    const index = buildWeaponDpsIndex(csv, catalog, "2026-01-01T00:00:00.000Z");
    expect(index.byName["Hezen Vengeance"]).toEqual({
      totalDamage: 60_000,
      dps: 5855,
      buildPerks: ["Elemental Honing", "Envious Arsenal"],
    });
  });
});

describe("formatWeaponDpsLabel", () => {
  test("formats total and DPS with a slash", () => {
    expect(formatWeaponDpsLabel({ totalDamage: 64_773, dps: 7476 })).toBe("64,773 / 7,476");
  });

  test("uses INF when total damage is unknown", () => {
    expect(formatWeaponDpsLabel({ totalDamage: null, dps: 5000 })).toBe("INF / 5,000");
  });
});
