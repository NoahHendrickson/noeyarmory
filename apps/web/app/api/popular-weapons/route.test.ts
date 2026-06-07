import { describe, expect, test, vi } from "vitest";

import { GET } from "./route";

vi.mock("../../../lib/popularity/redis", () => ({
  getPopularWeapons: vi.fn(),
}));

import { getPopularWeapons } from "../../../lib/popularity/redis";

const mockedGetPopularWeapons = vi.mocked(getPopularWeapons);

describe("GET /api/popular-weapons", () => {
  test("returns ranked weapons with cache headers", async () => {
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
    });
    expect(response.headers.get("Cache-Control")).toContain("s-maxage=3600");
  });

  test("returns an empty list when popularity lookup fails", async () => {
    mockedGetPopularWeapons.mockRejectedValue(new Error("redis down"));

    const response = await GET();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ weapons: [] });
  });
});
