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
    mockedIsPopularWeaponsMockEnabled.mockReset();
    mockedIsPopularWeaponsMockEnabled.mockReturnValue(false);
  });

  test("is true in development when mock mode is off", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(isPopularityPublishingEnabled()).toBe(true);
  });

  test("is false in development when mock mode is on", () => {
    mockedIsPopularWeaponsMockEnabled.mockReturnValue(true);
    vi.stubEnv("NODE_ENV", "development");
    expect(isPopularityPublishingEnabled()).toBe(false);
  });

  test("is false in production unless POPULAR_WEAPONS_ENABLED=true", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("POPULAR_WEAPONS_ENABLED", undefined);
    expect(isPopularityPublishingEnabled()).toBe(false);

    vi.stubEnv("POPULAR_WEAPONS_ENABLED", "true");
    expect(isPopularityPublishingEnabled()).toBe(true);
  });
});
