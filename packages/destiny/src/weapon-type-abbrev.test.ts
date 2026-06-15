import { describe, expect, it } from "vitest";

import { abbreviateWeaponType } from "./weapon-type-abbrev";

describe("abbreviateWeaponType", () => {
  it("abbreviates common weapon types", () => {
    expect(abbreviateWeaponType("Hand Cannon")).toBe("HC");
    expect(abbreviateWeaponType("Auto Rifle")).toBe("AR");
    expect(abbreviateWeaponType("Linear Fusion Rifle")).toBe("LFR");
  });

  it("falls back to the full name for unknown types", () => {
    expect(abbreviateWeaponType("Heavy Grenade Launcher")).toBe("Heavy Grenade Launcher");
  });
});
