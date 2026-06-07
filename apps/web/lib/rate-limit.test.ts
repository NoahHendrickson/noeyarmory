import { describe, expect, test } from "vitest";

import { createRateLimiter } from "./rate-limit";

describe("createRateLimiter", () => {
  test("blocks requests over the limit inside the same window", () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 1_000 });

    expect(limiter.check("client", 0)).toBe(true);
    expect(limiter.check("client", 1)).toBe(true);
    expect(limiter.check("client", 2)).toBe(false);
  });

  test("allows requests again after the window resets", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1_000 });

    expect(limiter.check("client", 0)).toBe(true);
    expect(limiter.check("client", 1)).toBe(false);
    expect(limiter.check("client", 1_001)).toBe(true);
  });
});
