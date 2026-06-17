import { beforeEach, describe, expect, test, vi } from "vitest";

import { POST } from "./route";

vi.mock("../../../../lib/session", () => ({
  getSession: vi.fn(),
  isSignedIn: vi.fn(),
}));

vi.mock("../../../../lib/bungie-profile", () => ({
  findOwnedArmorForAction: vi.fn(),
  resolveCharacterForArmor: vi.fn(),
}));

vi.mock("../../../../lib/bungie-actions", () => ({
  transferArmorToCharacter: vi.fn(),
}));

import { transferArmorToCharacter } from "../../../../lib/bungie-actions";
import { findOwnedArmorForAction, resolveCharacterForArmor } from "../../../../lib/bungie-profile";
import { getSession, isSignedIn } from "../../../../lib/session";

const mockedGetSession = vi.mocked(getSession);
const mockedIsSignedIn = vi.mocked(isSignedIn);
const mockedFindOwnedArmorForAction = vi.mocked(findOwnedArmorForAction);
const mockedResolveCharacterForArmor = vi.mocked(resolveCharacterForArmor);
const mockedTransferArmorToCharacter = vi.mocked(transferArmorToCharacter);

function request(instanceId = "item-1") {
  return new Request("https://example.com/api/armor/transfer", {
    method: "POST",
    headers: { Origin: "https://example.com" },
    body: JSON.stringify({ instanceId }),
  });
}

function foundArmor(location: "vault" | "inventory" | "equipped") {
  return {
    armor: {
      instanceId: "item-1",
      location,
      armor: {
        hash: 123,
        name: "Test Hood",
        classType: "Warlock",
        slot: "Helmet",
        type: "Helmet",
        rarity: "Legendary",
        releaseIndex: 1,
        stats: [],
        columns: [],
        mods: [],
        modHashes: [],
      },
      rolledMods: [],
      isArmor30: true,
    },
    characters: [{ characterId: "warlock-1", classType: "Warlock" }],
  } as Awaited<ReturnType<typeof findOwnedArmorForAction>>;
}

describe("POST /api/armor/transfer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("moves vault armor to the matching class character", async () => {
    const session = { accessToken: "token" } as Awaited<ReturnType<typeof getSession>>;
    mockedGetSession.mockResolvedValue(session);
    mockedIsSignedIn.mockReturnValue(true);
    mockedFindOwnedArmorForAction.mockResolvedValue(foundArmor("vault"));
    mockedResolveCharacterForArmor.mockReturnValue("warlock-1");

    const response = await POST(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(mockedTransferArmorToCharacter).toHaveBeenCalledWith(session, {
      instanceId: "item-1",
      itemHash: 123,
      characterId: "warlock-1",
    });
  });

  test("rejects non-vault armor", async () => {
    mockedGetSession.mockResolvedValue({ accessToken: "token" } as Awaited<
      ReturnType<typeof getSession>
    >);
    mockedIsSignedIn.mockReturnValue(true);
    mockedFindOwnedArmorForAction.mockResolvedValue(foundArmor("inventory"));
    mockedResolveCharacterForArmor.mockReturnValue("warlock-1");

    const response = await POST(request());

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Item is not in the vault" });
    expect(mockedTransferArmorToCharacter).not.toHaveBeenCalled();
  });
});
