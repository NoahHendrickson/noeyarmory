import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("./enabled", () => ({
  isPopularityPublishingEnabled: vi.fn(() => true),
}));

vi.mock("./mock", () => ({
  isPopularWeaponsMockEnabled: vi.fn(() => false),
}));

const upstashClient = vi.hoisted(() => ({
  zrange: vi.fn(),
  zunionstore: vi.fn(),
  del: vi.fn(),
}));

vi.mock("@upstash/redis", () => ({
  Redis: vi.fn(function () {
    return upstashClient;
  }),
}));

import { isPopularityPublishingEnabled } from "./enabled";
import { isPopularWeaponsMockEnabled } from "./mock";
import {
  applyPopularPerkThreshold,
  applyPopularThreshold,
  dayKeyForDate,
  getPopularPerks,
  getPopularWeapons,
  isPopularityConfigured,
  perkDayKeyForDate,
  resetPopularityRedisForTests,
  rollingDayKeys,
  rollingPerkDayKeys,
  ROLLING_DAYS,
} from "./redis";

const mockedIsPopularityPublishingEnabled = vi.mocked(isPopularityPublishingEnabled);
const mockedIsPopularWeaponsMockEnabled = vi.mocked(isPopularWeaponsMockEnabled);

describe("dayKeyForDate", () => {
  test("uses UTC YYYY-MM-DD", () => {
    expect(dayKeyForDate(new Date("2026-06-07T15:30:00.000Z"))).toBe("popular:day:2026-06-07");
  });
});

describe("rollingDayKeys", () => {
  test("returns consecutive UTC day keys ending at today", () => {
    const now = new Date("2026-06-07T12:00:00.000Z");
    expect(rollingDayKeys(3, now)).toEqual([
      "popular:day:2026-06-07",
      "popular:day:2026-06-06",
      "popular:day:2026-06-05",
    ]);
  });

  test("defaults to ROLLING_DAYS keys", () => {
    expect(rollingDayKeys(undefined, new Date("2026-06-07T00:00:00.000Z"))).toHaveLength(
      ROLLING_DAYS,
    );
  });
});

describe("applyPopularThreshold", () => {
  const entries = [
    { hash: 1, views: 10 },
    { hash: 2, views: 6 },
    { hash: 3, views: 3 },
    { hash: 4, views: 2 },
  ];

  test("returns empty weapons when total views are below threshold", () => {
    const result = applyPopularThreshold([
      { hash: 1, views: 5 },
      { hash: 2, views: 4 },
      { hash: 3, views: 3 },
      { hash: 4, views: 2 },
    ]);
    expect(result.weapons).toEqual([]);
    expect(result.totalViews).toBe(14);
    expect(result.distinctWeapons).toBe(4);
  });

  test("returns empty weapons when distinct weapons are below threshold", () => {
    const result = applyPopularThreshold([
      { hash: 1, views: 12 },
      { hash: 2, views: 8 },
      { hash: 3, views: 5 },
    ]);
    expect(result.weapons).toEqual([]);
    expect(result.totalViews).toBe(25);
    expect(result.distinctWeapons).toBe(3);
  });

  test("returns top four weapons when both thresholds are met", () => {
    const result = applyPopularThreshold(entries);
    expect(result.weapons).toEqual(entries);
    expect(result.totalViews).toBe(21);
    expect(result.distinctWeapons).toBe(4);
  });

  test("sorts by views descending before slicing", () => {
    const result = applyPopularThreshold(
      [
        { hash: 10, views: 2 },
        { hash: 11, views: 8 },
        { hash: 12, views: 5 },
        { hash: 13, views: 3 },
        { hash: 14, views: 4 },
      ],
      { topN: 2 },
    );
    expect(result.weapons).toEqual([
      { hash: 11, views: 8 },
      { hash: 12, views: 5 },
    ]);
  });
});

describe("perkDayKeyForDate", () => {
  test("uses the perk prefix and UTC YYYY-MM-DD", () => {
    expect(perkDayKeyForDate(new Date("2026-06-07T15:30:00.000Z"))).toBe(
      "popular:perk:day:2026-06-07",
    );
  });
});

describe("rollingPerkDayKeys", () => {
  test("returns consecutive UTC perk day keys ending at today", () => {
    const now = new Date("2026-06-07T12:00:00.000Z");
    expect(rollingPerkDayKeys(3, now)).toEqual([
      "popular:perk:day:2026-06-07",
      "popular:perk:day:2026-06-06",
      "popular:perk:day:2026-06-05",
    ]);
  });

  test("defaults to ROLLING_DAYS keys", () => {
    expect(rollingPerkDayKeys(undefined, new Date("2026-06-07T00:00:00.000Z"))).toHaveLength(
      ROLLING_DAYS,
    );
  });
});

describe("applyPopularPerkThreshold", () => {
  const entries = [
    { name: "surrounded", commits: 10 },
    { name: "rampage", commits: 6 },
    { name: "frenzy", commits: 3 },
    { name: "kill clip", commits: 2 },
  ];

  test("returns empty perks when total commits are below threshold", () => {
    const result = applyPopularPerkThreshold([
      { name: "surrounded", commits: 5 },
      { name: "rampage", commits: 4 },
      { name: "frenzy", commits: 3 },
      { name: "kill clip", commits: 2 },
    ]);
    expect(result.perks).toEqual([]);
    expect(result.totalCommits).toBe(14);
    expect(result.distinctPerks).toBe(4);
  });

  test("returns empty perks when distinct perks are below threshold", () => {
    const result = applyPopularPerkThreshold([
      { name: "surrounded", commits: 12 },
      { name: "rampage", commits: 8 },
      { name: "frenzy", commits: 5 },
    ]);
    expect(result.perks).toEqual([]);
    expect(result.totalCommits).toBe(25);
    expect(result.distinctPerks).toBe(3);
  });

  test("returns top four perks when both thresholds are met", () => {
    const result = applyPopularPerkThreshold(entries);
    expect(result.perks).toEqual(entries);
    expect(result.totalCommits).toBe(21);
    expect(result.distinctPerks).toBe(4);
  });

  test("sorts by commits descending before slicing", () => {
    const result = applyPopularPerkThreshold(
      [
        { name: "a", commits: 2 },
        { name: "b", commits: 8 },
        { name: "c", commits: 5 },
        { name: "d", commits: 3 },
        { name: "e", commits: 4 },
      ],
      { topN: 2 },
    );
    expect(result.perks).toEqual([
      { name: "b", commits: 8 },
      { name: "c", commits: 5 },
    ]);
  });
});

describe("getPopularWeapons", () => {
  afterEach(() => {
    mockedIsPopularityPublishingEnabled.mockReset();
    mockedIsPopularityPublishingEnabled.mockReturnValue(true);
    mockedIsPopularWeaponsMockEnabled.mockReset();
    mockedIsPopularWeaponsMockEnabled.mockReturnValue(false);
  });

  test("returns empty rankings when publishing is disabled", async () => {
    mockedIsPopularityPublishingEnabled.mockReturnValue(false);
    await expect(getPopularWeapons()).resolves.toEqual({
      weapons: [],
      totalViews: 0,
      distinctWeapons: 0,
    });
  });
});

describe("getPopularPerks", () => {
  afterEach(() => {
    mockedIsPopularityPublishingEnabled.mockReset();
    mockedIsPopularityPublishingEnabled.mockReturnValue(true);
    mockedIsPopularWeaponsMockEnabled.mockReset();
    mockedIsPopularWeaponsMockEnabled.mockReturnValue(false);
  });

  test("returns empty rankings when publishing is disabled", async () => {
    mockedIsPopularityPublishingEnabled.mockReturnValue(false);
    await expect(getPopularPerks()).resolves.toEqual({
      perks: [],
      totalCommits: 0,
      distinctPerks: 0,
    });
  });
});

describe("isPopularityConfigured", () => {
  afterEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    resetPopularityRedisForTests();
    mockedIsPopularWeaponsMockEnabled.mockReset();
    mockedIsPopularWeaponsMockEnabled.mockReturnValue(false);
  });

  test("is false when env vars are missing", () => {
    expect(isPopularityConfigured()).toBe(false);
  });

  test("is true when both env vars are set", () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";
    expect(isPopularityConfigured()).toBe(true);
  });
});

describe("zrange parsing", () => {
  beforeEach(() => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";
    resetPopularityRedisForTests();
    mockedIsPopularityPublishingEnabled.mockReturnValue(true);
    upstashClient.zunionstore.mockResolvedValue(0);
    upstashClient.del.mockResolvedValue(0);
  });

  afterEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    resetPopularityRedisForTests();
    upstashClient.zrange.mockReset();
    upstashClient.zunionstore.mockReset();
    upstashClient.del.mockReset();
    mockedIsPopularityPublishingEnabled.mockReset();
    mockedIsPopularityPublishingEnabled.mockReturnValue(true);
  });

  test("getPopularWeapons parses the {member, score} object shape and skips invalid members", async () => {
    upstashClient.zrange.mockResolvedValue([
      { member: "100", score: 10 },
      { member: "200", score: 6 },
      { member: "300", score: 5 },
      { member: "400", score: 4 },
      { member: "0", score: 9 }, // hash <= 0 → skipped
      { member: "nope", score: 8 }, // non-numeric hash → skipped
    ]);
    const result = await getPopularWeapons();
    expect(result.weapons).toEqual([
      { hash: 100, views: 10 },
      { hash: 200, views: 6 },
      { hash: 300, views: 5 },
      { hash: 400, views: 4 },
    ]);
    expect(result.totalViews).toBe(25);
    expect(result.distinctWeapons).toBe(4);
  });

  test("getPopularWeapons parses the flat [member, score, …] shape", async () => {
    upstashClient.zrange.mockResolvedValue(["100", 10, "200", 6, "300", 5, "400", 4]);
    const result = await getPopularWeapons();
    expect(result.weapons).toEqual([
      { hash: 100, views: 10 },
      { hash: 200, views: 6 },
      { hash: 300, views: 5 },
      { hash: 400, views: 4 },
    ]);
    expect(result.totalViews).toBe(25);
  });

  test("getPopularPerks parses the {member, score} object shape and skips invalid members", async () => {
    upstashClient.zrange.mockResolvedValue([
      { member: "frenzy", score: 10 },
      { member: "rampage", score: 6 },
      { member: "surrounded", score: 5 },
      { member: "kill clip", score: 4 },
      { member: "", score: 9 }, // empty name → skipped
      { member: 123, score: 8 }, // non-string name → skipped
    ]);
    const result = await getPopularPerks();
    expect(result.perks).toEqual([
      { name: "frenzy", commits: 10 },
      { name: "rampage", commits: 6 },
      { name: "surrounded", commits: 5 },
      { name: "kill clip", commits: 4 },
    ]);
    expect(result.totalCommits).toBe(25);
    expect(result.distinctPerks).toBe(4);
  });

  test("getPopularPerks parses the flat [member, score, …] shape", async () => {
    upstashClient.zrange.mockResolvedValue([
      "frenzy",
      10,
      "rampage",
      6,
      "surrounded",
      5,
      "kill clip",
      4,
    ]);
    const result = await getPopularPerks();
    expect(result.perks).toEqual([
      { name: "frenzy", commits: 10 },
      { name: "rampage", commits: 6 },
      { name: "surrounded", commits: 5 },
      { name: "kill clip", commits: 4 },
    ]);
    expect(result.totalCommits).toBe(25);
  });
});
