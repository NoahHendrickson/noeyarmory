import { NextResponse } from "next/server";

import { equipArmor } from "../../../../lib/bungie-actions";
import { findOwnedArmorForAction, resolveCharacterForArmor } from "../../../../lib/bungie-profile";
import { getSession, isSignedIn } from "../../../../lib/session";

export const dynamic = "force-dynamic";

/** Equip an armor piece from the matching class character's inventory. */
export async function POST(req: Request) {
  const session = await getSession();
  if (!isSignedIn(session)) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = (await req.json()) as { instanceId?: string };
  const instanceId = body.instanceId;
  if (!instanceId) {
    return NextResponse.json({ error: "instanceId is required" }, { status: 400 });
  }

  try {
    const found = await findOwnedArmorForAction(session, instanceId);
    if (!found) {
      return NextResponse.json({ error: "Armor not found" }, { status: 404 });
    }

    const { armor, characters } = found;
    if (armor.location !== "inventory") {
      return NextResponse.json(
        { error: "Item must be on a character's inventory to equip" },
        { status: 400 },
      );
    }

    const characterId = resolveCharacterForArmor(armor.armor.classType, characters);
    if (!characterId) {
      return NextResponse.json(
        { error: `No ${armor.armor.classType} character on this account` },
        { status: 400 },
      );
    }

    if (armor.ownerCharacterId !== characterId) {
      return NextResponse.json(
        { error: "Item is not on the matching class character" },
        { status: 400 },
      );
    }

    await equipArmor(session, { instanceId, characterId });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to equip armor";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
