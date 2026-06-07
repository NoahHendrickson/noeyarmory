import "server-only";
import type { IronSession } from "iron-session";

import { ensureAccessToken } from "./bungie-profile";
import { requireEnv } from "./bungie-auth";
import type { SessionData } from "./session";

const PLATFORM = "https://www.bungie.net/Platform";

interface BungieActionResponse {
  ErrorCode: number;
  Message: string;
}

async function authedPost<T>(path: string, accessToken: string, body: unknown): Promise<T> {
  const res = await fetch(`${PLATFORM}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": requireEnv("BUNGIE_API_KEY"),
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Bungie POST ${path} → ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

function assertBungieOk(response: BungieActionResponse): void {
  if (response.ErrorCode !== 1) {
    throw new Error(response.Message || `Bungie error ${response.ErrorCode}`);
  }
}

/** Move an armor piece from the vault onto a character's inventory. */
export async function transferArmorToCharacter(
  session: IronSession<SessionData>,
  {
    instanceId,
    itemHash,
    characterId,
  }: { instanceId: string; itemHash: number; characterId: string },
): Promise<void> {
  const accessToken = await ensureAccessToken(session);
  const membershipType = session.membershipType;
  if (membershipType == null) throw new Error("No membership in session");

  const result = await authedPost<BungieActionResponse>(
    "/Destiny2/Actions/Items/TransferItem/",
    accessToken,
    {
      itemReferenceHash: itemHash,
      stackSize: 1,
      transferToVault: false,
      itemId: instanceId,
      characterId,
      membershipType,
    },
  );
  assertBungieOk(result);
}

/** Equip an armor piece that is already on a character's inventory. */
export async function equipArmor(
  session: IronSession<SessionData>,
  { instanceId, characterId }: { instanceId: string; characterId: string },
): Promise<void> {
  const accessToken = await ensureAccessToken(session);
  const membershipType = session.membershipType;
  if (membershipType == null) throw new Error("No membership in session");

  const result = await authedPost<BungieActionResponse>(
    "/Destiny2/Actions/Items/EquipItem/",
    accessToken,
    {
      itemId: instanceId,
      characterId,
      membershipType,
    },
  );
  assertBungieOk(result);
}
