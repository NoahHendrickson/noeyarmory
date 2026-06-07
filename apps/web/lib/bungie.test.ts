import { describe, expect, test } from "vitest";

import { BUNGIE_ORIGIN, bungieIcon } from "./bungie";

describe("bungieIcon", () => {
  test("prefixes relative manifest paths with the Bungie origin", () => {
    expect(bungieIcon("/common/destiny2_content/icons/icon.png")).toBe(
      `${BUNGIE_ORIGIN}/common/destiny2_content/icons/icon.png`,
    );
  });

  test("allows Bungie absolute icon URLs", () => {
    const url = `${BUNGIE_ORIGIN}/common/destiny2_content/icons/icon.png`;
    expect(bungieIcon(url)).toBe(url);
  });

  test("rejects non-Bungie absolute icon URLs", () => {
    expect(bungieIcon("https://example.com/tracker.png")).toBeUndefined();
  });
});
