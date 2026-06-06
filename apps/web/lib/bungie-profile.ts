import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { IronSession } from "iron-session";
import {
  buildPerkMap,
  type PerkRef,
  type WeaponDoc,
  type WeaponIndex,
} from "@repo/destiny";

import { refreshAccessToken, requireEnv } from "./bungie-auth";
import type { SessionData } from "./session";

const PLATFORM = "https://www.bungie.net/Platform";

async function authedGet<T>(path: string, accessToken: string): Promise<T> {
  const res = await fetch(`${PLATFORM}${path}`, {
    headers: {
      "X-API-Key": requireEnv("BUNGIE_API_KEY"),
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) {
    throw new Error(`Bungie GET ${path} → ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

/** Ensure the session has a valid access token, refreshing if it's near expiry. */
export async function ensureAccessToken(session: IronSession<SessionData>): Promise<string> {
  if (!session.accessToken || !session.refreshToken) throw new Error("Not signed in");
  if (session.accessExpiresAt && Date.now() < session.accessExpiresAt - 60_000) {
    return session.accessToken;
  }
  const tokens = await refreshAccessToken(session.refreshToken);
  session.accessToken = tokens.accessToken;
  session.refreshToken = tokens.refreshToken;
  session.accessExpiresAt = tokens.accessExpiresAt;
  session.refreshExpiresAt = tokens.refreshExpiresAt;
  await session.save();
  return tokens.accessToken;
}

interface DestinyMembership {
  membershipId: string;
  membershipType: number;
  displayName: string;
  crossSaveOverride: number;
}
interface MembershipsResponse {
  Response: {
    destinyMemberships: DestinyMembership[];
    primaryMembershipId?: string;
    bungieNetUser?: { uniqueName?: string };
  };
}

/** Resolve the signed-in user's primary Destiny membership + display name. */
export async function getMembership(
  accessToken: string,
): Promise<{ membershipId: string; membershipType: number; bungieName: string }> {
  const data = await authedGet<MembershipsResponse>(
    "/User/GetMembershipsForCurrentUser/",
    accessToken,
  );
  const memberships = data.Response.destinyMemberships;
  const primary =
    (data.Response.primaryMembershipId
      ? memberships.find((m) => m.membershipId === data.Response.primaryMembershipId)
      : undefined) ??
    memberships.find((m) => m.crossSaveOverride === m.membershipType) ??
    memberships[0];
  if (!primary) throw new Error("No Destiny memberships on this account");
  return {
    membershipId: primary.membershipId,
    membershipType: primary.membershipType,
    bungieName: data.Response.bungieNetUser?.uniqueName ?? primary.displayName,
  };
}

interface ProfileItem {
  itemHash: number;
  itemInstanceId?: string;
}
interface ProfileSocket {
  plugHash?: number;
  isVisible?: boolean;
}
interface ProfileResponse {
  Response: {
    profileInventory?: { data?: { items: ProfileItem[] } };
    characterInventories?: { data?: Record<string, { items: ProfileItem[] }> };
    characterEquipment?: { data?: Record<string, { items: ProfileItem[] }> };
    itemComponents?: { sockets?: { data?: Record<string, { sockets: ProfileSocket[] }> } };
  };
}

export interface OwnedWeapon {
  weapon: WeaponDoc;
  instanceId: string;
  rolledPerks: PerkRef[];
}

let indexCache: { byHash: Map<number, WeaponDoc>; perkMap: Map<number, PerkRef> } | null = null;
function loadIndex(): { byHash: Map<number, WeaponDoc>; perkMap: Map<number, PerkRef> } {
  if (indexCache) return indexCache;
  const file = join(process.cwd(), "public", "data", "weapons.json");
  const index = JSON.parse(readFileSync(file, "utf8")) as WeaponIndex;
  indexCache = {
    byHash: new Map(index.weapons.map((w) => [w.hash, w])),
    perkMap: buildPerkMap(index.weapons),
  };
  return indexCache;
}

/** Fetch the user's profile and return every owned weapon with its rolled perks. */
export async function getOwnedWeapons(session: IronSession<SessionData>): Promise<OwnedWeapon[]> {
  const accessToken = await ensureAccessToken(session);
  const { membershipType, membershipId } = session;
  if (membershipType == null || !membershipId) throw new Error("No membership in session");

  const profile = await authedGet<ProfileResponse>(
    `/Destiny2/${membershipType}/Profile/${membershipId}/?components=102,201,205,305`,
    accessToken,
  );

  const { byHash, perkMap } = loadIndex();
  const r = profile.Response;
  const items: ProfileItem[] = [
    ...(r.profileInventory?.data?.items ?? []),
    ...Object.values(r.characterInventories?.data ?? {}).flatMap((c) => c.items),
    ...Object.values(r.characterEquipment?.data ?? {}).flatMap((c) => c.items),
  ];
  const socketData = r.itemComponents?.sockets?.data ?? {};

  const owned: OwnedWeapon[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    if (!item.itemInstanceId || seen.has(item.itemInstanceId)) continue;
    const weapon = byHash.get(item.itemHash);
    if (!weapon) continue;
    seen.add(item.itemInstanceId);

    const rolledPerks: PerkRef[] = [];
    for (const socket of socketData[item.itemInstanceId]?.sockets ?? []) {
      if (socket.plugHash == null) continue;
      const perk = perkMap.get(socket.plugHash);
      if (perk) rolledPerks.push(perk);
    }
    owned.push({ weapon, instanceId: item.itemInstanceId, rolledPerks });
  }

  owned.sort((a, b) => a.weapon.name.localeCompare(b.weapon.name));
  return owned;
}
