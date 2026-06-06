import "server-only";

const BUNGIE = "https://www.bungie.net";
const AUTHORIZE_URL = `${BUNGIE}/en/OAuth/Authorize`;
const TOKEN_URL = `${BUNGIE}/Platform/App/OAuth/token/`;

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var ${name}`);
  return value;
}

export function newOAuthState(): string {
  return crypto.randomUUID();
}

/** Build the Bungie OAuth authorize URL (redirect_uri is the one registered on the app). */
export function getAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: requireEnv("BUNGIE_CLIENT_ID"),
    response_type: "code",
    state,
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

export interface BungieTokens {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: number;
  refreshExpiresAt: number;
  membershipId: string;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_expires_in: number;
  membership_id: string;
}

async function tokenRequest(body: Record<string, string>): Promise<BungieTokens> {
  const clientId = requireEnv("BUNGIE_CLIENT_ID");
  const clientSecret = requireEnv("BUNGIE_CLIENT_SECRET");
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-API-Key": requireEnv("BUNGIE_API_KEY"),
      Authorization: `Basic ${basic}`,
    },
    body: new URLSearchParams(body).toString(),
  });

  if (!res.ok) {
    throw new Error(`Bungie token request failed: ${res.status} ${await res.text()}`);
  }

  const json = (await res.json()) as TokenResponse;
  const now = Date.now();
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    accessExpiresAt: now + json.expires_in * 1000,
    refreshExpiresAt: now + json.refresh_expires_in * 1000,
    membershipId: json.membership_id,
  };
}

export function exchangeCodeForTokens(code: string): Promise<BungieTokens> {
  return tokenRequest({ grant_type: "authorization_code", code });
}

export function refreshAccessToken(refreshToken: string): Promise<BungieTokens> {
  return tokenRequest({ grant_type: "refresh_token", refresh_token: refreshToken });
}
