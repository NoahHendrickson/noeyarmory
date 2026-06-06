import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { IronSession } from "iron-session";
import {
  buildArchetypeMap,
  buildModMap,
  buildPerkMap,
  resolveArchetypeFromPlugMap,
  resolveTertiaryStat,
  resolveTunableStatForInstance,
  type ArmorDoc,
  type ArmorIndex,
  type ItemStat,
  type PerkRef,
  type ReusablePlug,
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
interface ProfileStatRecord {
  statHash: number;
  value: number;
}
interface ProfileReusablePlugs {
  plugs?: Record<string, { plugItemHash: number }[]>;
}
interface ProfileResponse {
  Response: {
    profileInventory?: { data?: { items: ProfileItem[] } };
    characterInventories?: { data?: Record<string, { items: ProfileItem[] }> };
    characterEquipment?: { data?: Record<string, { items: ProfileItem[] }> };
    itemComponents?: {
      sockets?: { data?: Record<string, { sockets: ProfileSocket[] }> };
      stats?: {
        data?: Record<string, { stats?: Record<string, ProfileStatRecord> }>;
      };
      reusablePlugs?: { data?: Record<string, ProfileReusablePlugs> };
    };
  };
}

export interface OwnedWeapon {
  weapon: WeaponDoc;
  instanceId: string;
  rolledPerks: PerkRef[];
}

export interface OwnedArmor {
  armor: ArmorDoc;
  instanceId: string;
  rolledMods: PerkRef[];
  isArmor30: boolean;
  setName?: string;
  archetype?: string;
  tertiaryStat?: string;
  tunableStat?: string;
}

let weaponIndexCache: { byHash: Map<number, WeaponDoc>; perkMap: Map<number, PerkRef> } | null =
  null;
function loadWeaponIndex(): { byHash: Map<number, WeaponDoc>; perkMap: Map<number, PerkRef> } {
  if (weaponIndexCache) return weaponIndexCache;
  const file = join(process.cwd(), "public", "data", "weapons.json");
  const index = JSON.parse(readFileSync(file, "utf8")) as WeaponIndex;
  weaponIndexCache = {
    byHash: new Map(index.weapons.map((w) => [w.hash, w])),
    perkMap: buildPerkMap(index.weapons),
  };
  return weaponIndexCache;
}

let armorIndexCache: {
  byHash: Map<number, ArmorDoc>;
  modMap: Map<number, PerkRef>;
  archetypeMap: Map<number, string>;
} | null = null;
function loadArmorIndex(): {
  byHash: Map<number, ArmorDoc>;
  modMap: Map<number, PerkRef>;
  archetypeMap: Map<number, string>;
} {
  if (armorIndexCache) return armorIndexCache;
  const file = join(process.cwd(), "public", "data", "armor.json");
  const index = JSON.parse(readFileSync(file, "utf8")) as ArmorIndex;
  armorIndexCache = {
    byHash: new Map(index.armor.map((a) => [a.hash, a])),
    modMap: buildModMap(index.armor),
    archetypeMap: buildArchetypeMap(index.archetypes ?? []),
  };
  return armorIndexCache;
}

function collectProfileItems(r: ProfileResponse["Response"]): ProfileItem[] {
  return [
    ...(r.profileInventory?.data?.items ?? []),
    ...Object.values(r.characterInventories?.data ?? {}).flatMap((c) => c.items),
    ...Object.values(r.characterEquipment?.data ?? {}).flatMap((c) => c.items),
  ];
}

interface ProfileItemComponents {
  socketData: Record<string, { sockets: ProfileSocket[] }>;
  statsData: Record<string, { stats?: Record<string, ProfileStatRecord> }>;
  reusablePlugData: Record<string, ProfileReusablePlugs>;
}

async function fetchProfile(session: IronSession<SessionData>): Promise<{
  items: ProfileItem[];
  components: ProfileItemComponents;
}> {
  const accessToken = await ensureAccessToken(session);
  const { membershipType, membershipId } = session;
  if (membershipType == null || !membershipId) throw new Error("No membership in session");

  const profile = await authedGet<ProfileResponse>(
    `/Destiny2/${membershipType}/Profile/${membershipId}/?components=102,201,205,300,304,305,310`,
    accessToken,
  );

  return {
    items: collectProfileItems(profile.Response),
    components: {
      socketData: profile.Response.itemComponents?.sockets?.data ?? {},
      statsData: profile.Response.itemComponents?.stats?.data ?? {},
      reusablePlugData: profile.Response.itemComponents?.reusablePlugs?.data ?? {},
    },
  };
}

function resolveRolledPlugs(
  instanceId: string,
  plugMap: Map<number, PerkRef>,
  socketData: Record<string, { sockets: ProfileSocket[] }>,
): PerkRef[] {
  const rolled: PerkRef[] = [];
  for (const socket of socketData[instanceId]?.sockets ?? []) {
    if (socket.plugHash == null) continue;
    const plug = plugMap.get(socket.plugHash);
    if (plug) rolled.push(plug);
  }
  return rolled;
}

function profileStatsToItemStats(
  statsRecord: Record<string, ProfileStatRecord> | undefined,
): ItemStat[] {
  if (!statsRecord) return [];
  return Object.values(statsRecord).map((s) => ({ statHash: s.statHash, value: s.value }));
}

function profileReusablePlugsToRecord(
  reusable: ProfileReusablePlugs | undefined,
): Record<number, ReusablePlug[]> | undefined {
  if (!reusable?.plugs) return undefined;
  const out: Record<number, ReusablePlug[]> = {};
  for (const [socketIndex, plugs] of Object.entries(reusable.plugs)) {
    out[Number(socketIndex)] = plugs.map((p) => ({ plugItemHash: p.plugItemHash }));
  }
  return out;
}

/** Fetch the user's profile and return every owned weapon with its rolled perks. */
export async function getOwnedWeapons(session: IronSession<SessionData>): Promise<OwnedWeapon[]> {
  const { items, components } = await fetchProfile(session);
  const { byHash, perkMap } = loadWeaponIndex();

  const owned: OwnedWeapon[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    if (!item.itemInstanceId || seen.has(item.itemInstanceId)) continue;
    const weapon = byHash.get(item.itemHash);
    if (!weapon) continue;
    seen.add(item.itemInstanceId);
    owned.push({
      weapon,
      instanceId: item.itemInstanceId,
      rolledPerks: resolveRolledPlugs(item.itemInstanceId, perkMap, components.socketData),
    });
  }

  owned.sort((a, b) => a.weapon.name.localeCompare(b.weapon.name));
  return owned;
}

/** Fetch the user's profile and return every owned armor piece with Armor 3.0 roll data. */
export async function getOwnedArmor(session: IronSession<SessionData>): Promise<OwnedArmor[]> {
  const { items, components } = await fetchProfile(session);
  const { byHash, modMap, archetypeMap } = loadArmorIndex();

  const owned: OwnedArmor[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    if (!item.itemInstanceId || seen.has(item.itemInstanceId)) continue;
    const armor = byHash.get(item.itemHash);
    if (!armor) continue;
    seen.add(item.itemInstanceId);

    const instanceId = item.itemInstanceId;
    const sockets = components.socketData[instanceId]?.sockets ?? [];
    const isArmor30 = armor.isArmor30 ?? false;

    owned.push({
      armor,
      instanceId,
      rolledMods: resolveRolledPlugs(instanceId, modMap, components.socketData),
      isArmor30,
      setName: isArmor30 ? armor.setName : undefined,
      archetype: isArmor30
        ? resolveArchetypeFromPlugMap(sockets, archetypeMap)
        : undefined,
      tertiaryStat: isArmor30
        ? resolveTertiaryStat(profileStatsToItemStats(components.statsData[instanceId]?.stats))
        : undefined,
      tunableStat: isArmor30
        ? resolveTunableStatForInstance(
            sockets,
            profileReusablePlugsToRecord(components.reusablePlugData[instanceId]),
          )
        : undefined,
    });
  }

  owned.sort((a, b) => a.armor.name.localeCompare(b.armor.name));
  return owned;
}
