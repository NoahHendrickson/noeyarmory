import { describe, expect, test, vi } from "vitest";

import { GET } from "./route";

vi.mock("../../../lib/popularity/mock", () => ({
  isPopularWeaponsMockEnabled: vi.fn(),
}));

vi.mock("../../../lib/popularity/redis", () => ({
  getPopularWeapons: vi.fn(),
}));

import { isPopularWeaponsMockEnabled } from "../../../lib/popularity/mock";
import { getPopularWeapons } from "../../../lib/popularity/redis";

const mockedGetPopularWeapons = vi.mocked(getPopularWeapons);
const mockedIsPopularWeaponsMockEnabled = vi.mocked(isPopularWeaponsMockEnabled);

describe("GET /api/popular-weapons", () => {
  test("returns ranked weapons with cache headers", async () => {
    mockedIsPopularWeaponsMockEnabled.mockReturnValue(false);
    mockedGetPopularWeapons.mockResolvedValue({
      weapons: [
        { hash: 1, views: 12 },
        { hash: 2, views: 9 },
      ],
      totalViews: 21,
      distinctWeapons: 4,
    });

    const response = await GET();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      weapons: [
        { hash: 1, views: 12 },
        { hash: 2, views: 9 },
      ],
      mock: false,
    });
    expect(response.headers.get("Cache-Control")).toContain("s-maxage=3600");
  });

  test("returns an empty list when popularity lookup fails", async () => {
    mockedIsPopularWeaponsMockEnabled.mockReturnValue(false);
    mockedGetPopularWeapons.mockRejectedValue(new Error("redis down"));

    const response = await GET();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ weapons: [], mock: false });
  });

  test("flags mock responses in development preview mode", async () => {
    mockedIsPopularWeaponsMockEnabled.mockReturnValue(true);
    mockedGetPopularWeapons.mockResolvedValue({
      weapons: [{ hash: 1, views: 48 }],
      totalViews: 48,
      distinctWeapons: 1,
    });

    const response = await GET();
    await expect(response.json()).resolves.toEqual({
      weapons: [{ hash: 1, views: 48 }],
      mock: true,
    });
  });
});
