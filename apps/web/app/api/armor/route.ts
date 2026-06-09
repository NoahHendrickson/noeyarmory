import { NextResponse } from "next/server";

import { getOwnedArmor } from "../../../lib/bungie-profile";
import { getSession, isSignedIn } from "../../../lib/session";

export const dynamic = "force-dynamic";

/** Return owned armor for the signed-in user. */
export async function GET() {
  const session = await getSession();
  if (!isSignedIn(session)) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  try {
    const owned = await getOwnedArmor(session);
    return NextResponse.json({
      armor: owned.map((o) => ({
        instanceId: o.instanceId,
        hash: o.armor.hash,
        name: o.armor.name,
        icon: o.armor.icon,
        watermark: o.armor.watermark,
        slot: o.armor.slot,
        classType: o.armor.classType,
        type: o.armor.type,
        rarity: o.armor.rarity,
        source: o.armor.source,
        rolledMods: o.rolledMods.map((m) => ({ hash: m.hash, name: m.name, icon: m.icon })),
        isArmor30: o.isArmor30,
        setName: o.setName,
        setBonuses: o.setBonuses,
        archetype: o.archetype,
        tertiaryStat: o.tertiaryStat,
        tunableStat: o.tunableStat,
        stats: o.stats,
        location: o.location,
        ownerCharacterId: o.ownerCharacterId,
      })),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load armor";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
