import "server-only";
import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

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
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET ?? "noeyarmory-dev-insecure-session-secret-change-me",
  cookieName: "noeyarmory_session",
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  },
};

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

export function isSignedIn(session: SessionData): boolean {
  return Boolean(session.accessToken && session.membershipId);
}
