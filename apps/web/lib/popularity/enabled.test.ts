import { afterEach, describe, expect, test, vi } from "vitest";

vi.mock("./mock", () => ({
  isPopularWeaponsMockEnabled: vi.fn(() => false),
}));

import { isPopularityPublishingEnabled } from "./enabled";
import { isPopularWeaponsMockEnabled } from "./mock";

const mockedIsPopularWeaponsMockEnabled = vi.mocked(isPopularWeaponsMockEnabled);

describe("isPopularityPublishingEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    mockedIsPopularWeaponsMockEnabled.mockReset();
    mockedIsPopularWeaponsMockEnabled.mockReturnValue(false);
  });

  test("is false when Upstash env vars are missing", () => {
    expect(isPopularityPublishingEnabled()).toBe(false);
  });

  test("is true when Upstash env vars are set", () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");
    expect(isPopularityPublishingEnabled()).toBe(true);
  });

  test("is false when mock mode is on", () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");
    mockedIsPopularWeaponsMockEnabled.mockReturnValue(true);
    expect(isPopularityPublishingEnabled()).toBe(false);
  });
});
