import { describe, expect, test } from "vitest";

import { getSessionPassword } from "./session-secret";

describe("getSessionPassword", () => {
  test("uses a configured session secret", () => {
    expect(
      getSessionPassword({
        NODE_ENV: "production",
        SESSION_SECRET: "a".repeat(32),
      }),
    ).toBe("a".repeat(32));
  });

  test("rejects missing production session secret", () => {
    expect(() => getSessionPassword({ NODE_ENV: "production" })).toThrow(
      /SESSION_SECRET must be set/,
    );
  });

  test("rejects short production session secret", () => {
    expect(() =>
      getSessionPassword({
        NODE_ENV: "production",
        SESSION_SECRET: "short",
      }),
    ).toThrow(/SESSION_SECRET must be set/);
  });
});
