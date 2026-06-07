import { NextResponse } from "next/server";

import { transferArmorToCharacter } from "../../../../lib/bungie-actions";
import { findOwnedArmorForAction, resolveCharacterForArmor } from "../../../../lib/bungie-profile";
import { getSession, isSignedIn } from "../../../../lib/session";

export const dynamic = "force-dynamic";

/** Move a vault armor piece onto the matching class character. */
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
    if (armor.location !== "vault") {
      return NextResponse.json({ error: "Item is not in the vault" }, { status: 400 });
    }

    const characterId = resolveCharacterForArmor(armor.armor.classType, characters);
    if (!characterId) {
      return NextResponse.json(
        { error: `No ${armor.armor.classType} character on this account` },
        { status: 400 },
      );
    }

    await transferArmorToCharacter(session, {
      instanceId,
      itemHash: armor.armor.hash,
      characterId,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to transfer armor";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
