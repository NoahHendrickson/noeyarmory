import { describe, expect, test } from "vitest";

import { safeHttpsUrl } from "./safe-url";

describe("safeHttpsUrl", () => {
  test("allows https URLs", () => {
    expect(safeHttpsUrl("https://d2clarity.com/discord")).toBe("https://d2clarity.com/discord");
  });

  test("rejects javascript URLs", () => {
    expect(safeHttpsUrl("javascript:alert(1)")).toBeUndefined();
  });

  test("rejects invalid URLs", () => {
    expect(safeHttpsUrl("not a url")).toBeUndefined();
  });
});
