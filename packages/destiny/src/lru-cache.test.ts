import { describe, expect, test } from "vitest";

import { createLruCache } from "./lru-cache";

describe("createLruCache", () => {
  test("stores and retrieves values", () => {
    const cache = createLruCache<string, number>(3);
    cache.set("a", 1);
    expect(cache.get("a")).toBe(1);
    expect(cache.has("a")).toBe(true);
    expect(cache.get("missing")).toBeUndefined();
  });

  test("evicts the least-recently-used entry past capacity", () => {
    const cache = createLruCache<string, number>(2);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3); // evicts "a"
    expect(cache.has("a")).toBe(false);
    expect(cache.get("b")).toBe(2);
    expect(cache.get("c")).toBe(3);
  });

  test("reads promote recency so the read key survives eviction", () => {
    const cache = createLruCache<string, number>(2);
    cache.set("a", 1);
    cache.set("b", 2);
    expect(cache.get("a")).toBe(1); // "a" now most-recently-used
    cache.set("c", 3); // evicts "b", not "a"
    expect(cache.has("a")).toBe(true);
    expect(cache.has("b")).toBe(false);
  });

  test("can cache undefined values without breaking has()", () => {
    const cache = createLruCache<string, number | undefined>(2);
    cache.set("u", undefined);
    expect(cache.has("u")).toBe(true);
    expect(cache.get("u")).toBeUndefined();
  });
});
