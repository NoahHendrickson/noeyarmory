import { describe, expect, test } from "vitest";

import { sampleWeapons } from "./fixtures/sample-weapons";
import { internWeaponCatalog } from "./intern-weapons";
import { createWeaponFuse, serializeWeaponFuseIndex } from "./search";

const { index } = internWeaponCatalog(sampleWeapons, "sample");
const weapons = index.weapons;

describe("prebuilt weapon fuse index", () => {
  test("search with a parsed serialized index matches a freshly built index", () => {
    const serialized = serializeWeaponFuseIndex(weapons);
    const fresh = createWeaponFuse(weapons);
    const prebuilt = createWeaponFuse(weapons, serialized);

    for (const q of ["fate", "stormchase", "fusion", "ramp"]) {
      const freshHits = fresh.search(q).map((r) => r.item.hash);
      const prebuiltHits = prebuilt.search(q).map((r) => r.item.hash);
      expect(prebuiltHits).toEqual(freshHits);
    }
  });

  test("serialized index round-trips through JSON", () => {
    const serialized = JSON.parse(JSON.stringify(serializeWeaponFuseIndex(weapons)));
    const fuse = createWeaponFuse(weapons, serialized);
    expect(fuse.search("fate").length).toBeGreaterThan(0);
  });
});
