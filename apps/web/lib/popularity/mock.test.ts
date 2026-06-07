import { afterEach, describe, expect, test, vi } from "vitest";

import { isPopularWeaponsMockEnabled } from "./mock";

vi.mock("../weapon-index-server", () => ({
  getWeaponIndex: () => ({
    weapons: [
      { hash: 3, name: "Zeta Gun" },
      { hash: 1, name: "Alpha Gun" },
      { hash: 2, name: "Beta Gun" },
      { hash: 4, name: "Delta Gun" },
      { hash: 5, name: "Epsilon Gun" },
    ],
  }),
}));

import { getMockPopularWeapons } from "./mock";

describe("isPopularWeaponsMockEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test("is true only in development with POPULAR_WEAPONS_MOCK=true", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("POPULAR_WEAPONS_MOCK", "true");
    expect(isPopularWeaponsMockEnabled()).toBe(true);
  });

  test("is false in production even when the flag is set", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("POPULAR_WEAPONS_MOCK", "true");
    expect(isPopularWeaponsMockEnabled()).toBe(false);
  });
});

describe("getMockPopularWeapons", () => {
  test("returns four alphabetically sorted weapons with fake view counts", () => {
    const result = getMockPopularWeapons();
    expect(result.weapons).toHaveLength(4);
    expect(result.weapons.map((weapon) => weapon.hash)).toEqual([1, 2, 4, 5]);
    expect(result.totalViews).toBeGreaterThanOrEqual(20);
    expect(result.distinctWeapons).toBe(4);
  });
});
