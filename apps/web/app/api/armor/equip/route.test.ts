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
  equipArmor: vi.fn(),
  transferArmorToCharacter: vi.fn(),
}));

import { equipArmor, transferArmorToCharacter } from "../../../../lib/bungie-actions";
import { findOwnedArmorForAction, resolveCharacterForArmor } from "../../../../lib/bungie-profile";
import { getSession, isSignedIn } from "../../../../lib/session";

const mockedGetSession = vi.mocked(getSession);
const mockedIsSignedIn = vi.mocked(isSignedIn);
const mockedFindOwnedArmorForAction = vi.mocked(findOwnedArmorForAction);
const mockedResolveCharacterForArmor = vi.mocked(resolveCharacterForArmor);
const mockedEquipArmor = vi.mocked(equipArmor);
const mockedTransferArmorToCharacter = vi.mocked(transferArmorToCharacter);

function request(instanceId = "item-1") {
  return new Request("https://example.com/api/armor/equip", {
    method: "POST",
    headers: { Origin: "https://example.com" },
    body: JSON.stringify({ instanceId }),
  });
}

function foundArmor({
  location,
  ownerCharacterId,
  classType = "Warlock",
}: {
  location: "vault" | "inventory" | "equipped";
  ownerCharacterId?: string;
  classType?: string;
}) {
  return {
    armor: {
      instanceId: "item-1",
      location,
      ownerCharacterId,
      armor: {
        hash: 123,
        name: "Test Hood",
        classType,
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

describe("POST /api/armor/equip", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("transfers vault armor to the matching class and then equips it", async () => {
    const session = { accessToken: "token" } as Awaited<ReturnType<typeof getSession>>;
    mockedGetSession.mockResolvedValue(session);
    mockedIsSignedIn.mockReturnValue(true);
    mockedFindOwnedArmorForAction.mockResolvedValue(foundArmor({ location: "vault" }));
    mockedResolveCharacterForArmor.mockReturnValue("warlock-1");

    const response = await POST(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(mockedTransferArmorToCharacter).toHaveBeenCalledWith(session, {
      instanceId: "item-1",
      itemHash: 123,
      characterId: "warlock-1",
    });
    expect(mockedEquipArmor).toHaveBeenCalledWith(session, {
      instanceId: "item-1",
      characterId: "warlock-1",
    });
  });

  test("equips inventory armor that is already on the matching class", async () => {
    const session = { accessToken: "token" } as Awaited<ReturnType<typeof getSession>>;
    mockedGetSession.mockResolvedValue(session);
    mockedIsSignedIn.mockReturnValue(true);
    mockedFindOwnedArmorForAction.mockResolvedValue(
      foundArmor({ location: "inventory", ownerCharacterId: "warlock-1" }),
    );
    mockedResolveCharacterForArmor.mockReturnValue("warlock-1");

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(mockedTransferArmorToCharacter).not.toHaveBeenCalled();
    expect(mockedEquipArmor).toHaveBeenCalledWith(session, {
      instanceId: "item-1",
      characterId: "warlock-1",
    });
  });

  test("rejects inventory armor on the wrong character", async () => {
    mockedGetSession.mockResolvedValue({ accessToken: "token" } as Awaited<
      ReturnType<typeof getSession>
    >);
    mockedIsSignedIn.mockReturnValue(true);
    mockedFindOwnedArmorForAction.mockResolvedValue(
      foundArmor({ location: "inventory", ownerCharacterId: "titan-1" }),
    );
    mockedResolveCharacterForArmor.mockReturnValue("warlock-1");

    const response = await POST(request());

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Item is not on the matching class character",
    });
    expect(mockedEquipArmor).not.toHaveBeenCalled();
  });

  test("rejects armor when there is no matching class character", async () => {
    mockedGetSession.mockResolvedValue({ accessToken: "token" } as Awaited<
      ReturnType<typeof getSession>
    >);
    mockedIsSignedIn.mockReturnValue(true);
    mockedFindOwnedArmorForAction.mockResolvedValue(foundArmor({ location: "vault" }));
    mockedResolveCharacterForArmor.mockReturnValue(undefined);

    const response = await POST(request());

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "No Warlock character on this account",
    });
    expect(mockedTransferArmorToCharacter).not.toHaveBeenCalled();
    expect(mockedEquipArmor).not.toHaveBeenCalled();
  });
});
