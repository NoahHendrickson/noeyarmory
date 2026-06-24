import { beforeEach, describe, expect, it, vi } from "vitest";

const fs = vi.hoisted(() => ({
  readFileSync: vi.fn(),
  statSync: vi.fn(),
}));

vi.mock("node:fs", () => fs);

vi.mock("./generated-data-server", () => ({
  generatedDataFilePath: (key: string) => `/fake/${key}.json`,
}));

vi.mock("@repo/destiny", () => ({
  // Returns a fresh dummy lookups object; identity tells us whether the index was rebuilt.
  buildWeaponIndexLookups: vi.fn(() => ({ byHash: new Map() })),
  expandWeapon: vi.fn(),
}));

import { getWeaponIndex } from "./weapon-index-server";

describe("getWeaponIndex caching", () => {
  beforeEach(() => {
    fs.readFileSync.mockReset();
    fs.statSync.mockReset();
    fs.readFileSync.mockReturnValue(JSON.stringify({ version: "v1", generatedAt: "t1" }));
  });

  it("reads and parses the index only once while the file mtime is unchanged", () => {
    fs.statSync.mockReturnValue({ mtimeMs: 1 });

    const first = getWeaponIndex();
    getWeaponIndex();
    getWeaponIndex();

    // The browse index file is read+parsed once; subsequent calls hit the cache.
    expect(fs.readFileSync).toHaveBeenCalledTimes(1);
    expect(getWeaponIndex()).toBe(first);
  });

  it("re-parses the index after the file mtime changes", () => {
    fs.statSync.mockReturnValue({ mtimeMs: 1 });
    getWeaponIndex();
    const before = fs.readFileSync.mock.calls.length;

    fs.statSync.mockReturnValue({ mtimeMs: 2 });
    getWeaponIndex();

    expect(fs.readFileSync.mock.calls.length).toBe(before + 1);
  });
});
