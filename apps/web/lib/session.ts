import "server-only";
import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

import { getSessionPassword } from "./session-secret";

export interface SessionData {
  accessToken?: string;
  refreshToken?: string;
  /** epoch ms when the access token expires */
  accessExpiresAt?: number;
  /** epoch ms when the refresh token expires */
  refreshExpiresAt?: number;
  membershipId?: string;
  membershipType?: number;
  bungieName?: string;
  /** transient CSRF state during the OAuth handshake */
  oauthState?: string;
  /** post-login redirect path (must start with /) */
  oauthReturnTo?: string;
}

function getSessionOptions(): SessionOptions {
  return {
    password: getSessionPassword(),
    cookieName: "noeyarmory_session",
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    },
  };
}

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), getSessionOptions());
}

export function isSignedIn(session: SessionData): boolean {
  return Boolean(session.accessToken && session.membershipId);
}
