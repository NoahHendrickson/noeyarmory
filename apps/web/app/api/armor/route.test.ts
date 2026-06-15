import { describe, expect, test, vi } from "vitest";

import { GET } from "./route";

vi.mock("../../../lib/session", () => ({
  getSession: vi.fn(),
  isSignedIn: vi.fn(),
}));

vi.mock("../../../lib/bungie-profile", () => ({
  getOwnedArmor: vi.fn(),
}));

import { getOwnedArmor } from "../../../lib/bungie-profile";
import { getSession, isSignedIn } from "../../../lib/session";

const mockedGetSession = vi.mocked(getSession);
const mockedIsSignedIn = vi.mocked(isSignedIn);
const mockedGetOwnedArmor = vi.mocked(getOwnedArmor);

describe("GET /api/armor", () => {
  test("returns 401 when not signed in", async () => {
    mockedGetSession.mockResolvedValue({} as Awaited<ReturnType<typeof getSession>>);
    mockedIsSignedIn.mockReturnValue(false);

    const response = await GET();
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Not signed in" });
  });

  test("returns owned armor for signed-in users", async () => {
    mockedGetSession.mockResolvedValue({ accessToken: "token" } as Awaited<
      ReturnType<typeof getSession>
    >);
    mockedIsSignedIn.mockReturnValue(true);
    mockedGetOwnedArmor.mockResolvedValue([
      {
        instanceId: "abc",
        armor: {
          hash: 1,
          name: "Virtuous Helm",
          icon: "/icon.png",
          watermark: "/wm.png",
          slot: "Helmet",
          classType: "Hunter",
          type: "Helmet",
          rarity: "Legendary",
        },
        rolledMods: [{ hash: 2, name: "Mod", icon: "/mod.png" }],
        isArmor30: true,
        setName: "Virtuous",
        setBonuses: [
          {
            requiredSetCount: 2,
            name: "Virtuous Synergy",
            description: "Rapidly defeating targets increases weapon damage.",
          },
        ],
        archetype: "Paragon",
        stats: [
          { hash: 2996146975, name: "Weapons", value: 30 },
          { hash: 392767087, name: "Health", value: 15 },
        ],
        location: "vault",
      },
      {
        instanceId: "def",
        armor: {
          hash: 2,
          name: "Iron Will Gauntlets",
          slot: "Gauntlets",
          classType: "Titan",
          type: "Gauntlets",
          rarity: "Legendary",
        },
        rolledMods: [],
        isArmor30: false,
        stats: [
          { hash: 4244567218, name: "Melee", value: 20 },
          { hash: 1735777505, name: "Grenade", value: 10 },
        ],
        location: "inventory",
      },
    ] as Awaited<ReturnType<typeof getOwnedArmor>>);

    const response = await GET();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      armor: [
        expect.objectContaining({
          instanceId: "abc",
          name: "Virtuous Helm",
          location: "vault",
          archetype: "Paragon",
          setBonuses: [
            expect.objectContaining({
              requiredSetCount: 2,
              name: "Virtuous Synergy",
            }),
          ],
          stats: [
            { hash: 2996146975, name: "Weapons", value: 30 },
            { hash: 392767087, name: "Health", value: 15 },
          ],
        }),
        expect.objectContaining({
          instanceId: "def",
          name: "Iron Will Gauntlets",
          location: "inventory",
          stats: [
            { hash: 4244567218, name: "Melee", value: 20 },
            { hash: 1735777505, name: "Grenade", value: 10 },
          ],
        }),
      ],
    });
  });
});
