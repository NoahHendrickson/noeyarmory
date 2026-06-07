import { afterEach, describe, expect, test, vi } from "vitest";

import { isPopularWeaponsMockEnabled } from "./mock";

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
