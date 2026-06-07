import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { IronSession } from "iron-session";
import {
  buildArchetypeMap,
  buildModMap,
  resolveArchetypeFromPlugMap,
  resolveArmor30Stats,
  resolveTertiaryStat,
  resolveTunableStatForInstance,
  type ArmorDoc,
  type ArmorIndex,
  type ItemStat,
  type PerkRef,
  type ReusablePlug,
  type WeaponSummary,
} from "@repo/destiny";

import { refreshAccessToken, requireEnv } from "./bungie-auth";
import type { SessionData } from "./session";
import { getWeaponIndex } from "./weapon-index-server";

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
    characters?: { data?: { characters?: Record<string, { classType: number }> } };
    itemComponents?: {
      sockets?: { data?: Record<string, { sockets: ProfileSocket[] }> };
      stats?: {
        data?: Record<string, { stats?: Record<string, ProfileStatRecord> }>;
      };
      reusablePlugs?: { data?: Record<string, ProfileReusablePlugs> };
    };
  };
}

const CLASS_TYPE_NAMES: Record<number, string> = {
  0: "Titan",
  1: "Hunter",
  2: "Warlock",
};

export type ArmorLocation = "vault" | "inventory" | "equipped";

export interface CharacterRef {
  characterId: string;
  classType: string;
}

interface LocatedProfileItem {
  item: ProfileItem;
  location: ArmorLocation;
  ownerCharacterId?: string;
}

export interface OwnedWeapon {
  weapon: WeaponSummary;
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
  stats?: ReturnType<typeof resolveArmor30Stats>;
  location: ArmorLocation;
  ownerCharacterId?: string;
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

function collectLocatedProfileItems(r: ProfileResponse["Response"]): LocatedProfileItem[] {
  const located: LocatedProfileItem[] = [];

  for (const [characterId, equipment] of Object.entries(r.characterEquipment?.data ?? {})) {
    for (const item of equipment.items) {
      located.push({ item, location: "equipped", ownerCharacterId: characterId });
    }
  }

  for (const [characterId, inventory] of Object.entries(r.characterInventories?.data ?? {})) {
    for (const item of inventory.items) {
      located.push({ item, location: "inventory", ownerCharacterId: characterId });
    }
  }

  for (const item of r.profileInventory?.data?.items ?? []) {
    located.push({ item, location: "vault" });
  }

  return located;
}

function parseCharacters(r: ProfileResponse["Response"]): CharacterRef[] {
  const characters = r.characters?.data?.characters ?? {};
  return Object.entries(characters).map(([characterId, character]) => ({
    characterId,
    classType: CLASS_TYPE_NAMES[character.classType] ?? "Any",
  }));
}

/** Map armor class label to the matching account character id. */
export function resolveCharacterForArmor(
  classType: string,
  characters: CharacterRef[],
): string | undefined {
  return characters.find((character) => character.classType === classType)?.characterId;
}

interface ProfileItemComponents {
  socketData: Record<string, { sockets: ProfileSocket[] }>;
  statsData: Record<string, { stats?: Record<string, ProfileStatRecord> }>;
  reusablePlugData: Record<string, ProfileReusablePlugs>;
}

async function fetchProfile(session: IronSession<SessionData>): Promise<{
  items: ProfileItem[];
  locatedItems: LocatedProfileItem[];
  characters: CharacterRef[];
  components: ProfileItemComponents;
}> {
  const accessToken = await ensureAccessToken(session);
  const { membershipType, membershipId } = session;
  if (membershipType == null || !membershipId) throw new Error("No membership in session");

  const profile = await authedGet<ProfileResponse>(
    `/Destiny2/${membershipType}/Profile/${membershipId}/?components=102,200,201,205,300,304,305,310`,
    accessToken,
  );

  const locatedItems = collectLocatedProfileItems(profile.Response);

  return {
    items: locatedItems.map((located) => located.item),
    locatedItems,
    characters: parseCharacters(profile.Response),
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
  const { byHash, perkMap } = getWeaponIndex();

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
  const { locatedItems, components } = await fetchProfile(session);
  const { byHash, modMap, archetypeMap } = loadArmorIndex();

  const owned: OwnedArmor[] = [];
  const seen = new Set<string>();
  for (const located of locatedItems) {
    const item = located.item;
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
      stats: isArmor30
        ? resolveArmor30Stats(profileStatsToItemStats(components.statsData[instanceId]?.stats))
        : undefined,
      location: located.location,
      ownerCharacterId: located.ownerCharacterId,
    });
  }

  owned.sort((a, b) => a.armor.name.localeCompare(b.armor.name));
  return owned;
}

/** Look up one owned armor piece and the account's characters (single profile fetch). */
export async function findOwnedArmorForAction(
  session: IronSession<SessionData>,
  instanceId: string,
): Promise<{ armor: OwnedArmor; characters: CharacterRef[] } | undefined> {
  const { locatedItems, characters, components } = await fetchProfile(session);
  const { byHash, modMap, archetypeMap } = loadArmorIndex();

  const located = locatedItems.find((entry) => entry.item.itemInstanceId === instanceId);
  if (!located?.item.itemInstanceId) return undefined;

  const armorDoc = byHash.get(located.item.itemHash);
  if (!armorDoc) return undefined;

  const instance = located.item.itemInstanceId;
  const sockets = components.socketData[instance]?.sockets ?? [];
  const isArmor30 = armorDoc.isArmor30 ?? false;

  return {
    characters,
    armor: {
      armor: armorDoc,
      instanceId: instance,
      rolledMods: resolveRolledPlugs(instance, modMap, components.socketData),
      isArmor30,
      setName: isArmor30 ? armorDoc.setName : undefined,
      archetype: isArmor30
        ? resolveArchetypeFromPlugMap(sockets, archetypeMap)
        : undefined,
      tertiaryStat: isArmor30
        ? resolveTertiaryStat(profileStatsToItemStats(components.statsData[instance]?.stats))
        : undefined,
      tunableStat: isArmor30
        ? resolveTunableStatForInstance(
            sockets,
            profileReusablePlugsToRecord(components.reusablePlugData[instance]),
          )
        : undefined,
      stats: isArmor30
        ? resolveArmor30Stats(profileStatsToItemStats(components.statsData[instance]?.stats))
        : undefined,
      location: located.location,
      ownerCharacterId: located.ownerCharacterId,
    },
  };
}
