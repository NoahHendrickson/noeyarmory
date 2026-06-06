import { NextResponse, type NextRequest } from "next/server";

import { exchangeCodeForTokens } from "../../../../lib/bungie-auth";
import { getMembership } from "../../../../lib/bungie-profile";
import { getSession } from "../../../../lib/session";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const session = await getSession();

  if (!code || !state || state !== session.oauthState) {
    return NextResponse.redirect(new URL("/vault?error=oauth_state", req.url));
  }
  session.oauthState = undefined;

  try {
    const tokens = await exchangeCodeForTokens(code);
    const membership = await getMembership(tokens.accessToken);

    session.accessToken = tokens.accessToken;
    session.refreshToken = tokens.refreshToken;
    session.accessExpiresAt = tokens.accessExpiresAt;
    session.refreshExpiresAt = tokens.refreshExpiresAt;
    session.membershipId = membership.membershipId;
    session.membershipType = membership.membershipType;
    session.bungieName = membership.bungieName;

    const returnTo = session.oauthReturnTo ?? "/vault";
    session.oauthReturnTo = undefined;
    await session.save();

    return NextResponse.redirect(new URL(returnTo, req.url));
  } catch {
    return NextResponse.redirect(new URL("/vault?error=token", req.url));
  }
}
