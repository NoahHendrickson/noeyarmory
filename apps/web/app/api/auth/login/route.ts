import { NextResponse } from "next/server";

import { getAuthorizeUrl, newOAuthState } from "../../../../lib/bungie-auth";
import { getSession } from "../../../../lib/session";

export async function GET() {
  const session = await getSession();
  const state = newOAuthState();
  session.oauthState = state;
  await session.save();
  return NextResponse.redirect(getAuthorizeUrl(state));
}
