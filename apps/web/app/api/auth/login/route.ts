import { NextResponse, type NextRequest } from "next/server";

import { getAuthorizeUrl, newOAuthState } from "../../../../lib/bungie-auth";
import { getSession } from "../../../../lib/session";

function safeReturnTo(value: string | null): string | undefined {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return undefined;
  return value;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  const state = newOAuthState();
  session.oauthState = state;
  const returnTo = safeReturnTo(req.nextUrl.searchParams.get("returnTo"));
  if (returnTo) session.oauthReturnTo = returnTo;
  await session.save();
  return NextResponse.redirect(getAuthorizeUrl(state));
}
