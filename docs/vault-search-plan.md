# Fast-follow: search your own vault

Let a **signed-in** user search/filter the weapons they actually own (vault +
characters) — including the specific **perk rolls** on each owned copy.

## Why this is a separate milestone

The current app is a **static manifest search**: no login, no server state, no
secrets — it could even deploy to a CDN. Vault search is fundamentally different:
it needs **OAuth** and a **server** (secrets, sessions, live per-user API calls).
Keeping it separate keeps the public search fast and simple.

## Bungie app changes (one-time)

The API key we use today needs **no OAuth**. Vault access does:

- Bungie app → **OAuth Client Type: Confidential** (gives a `client_id` +
  `client_secret`) — or **Public** for PKCE without a secret.
- Set a **Redirect URL**, e.g. `http://localhost:3000/api/auth/callback`.
- Scope: **`ReadDestinyInventoryAndVault`** (+ `ReadBasicUserProfile`).

## Flow

1. "Sign in with Bungie" → redirect to `bungie.net/en/OAuth/Authorize` (`client_id`, `response_type=code`, `state`).
2. Bungie redirects to `/api/auth/callback?code=…` → server exchanges the code for `access_token` + `refresh_token` (`POST /Platform/App/OAuth/token/`).
3. Persist tokens in an **httpOnly session cookie**; refresh on expiry.
4. `GetMembershipsForCurrentUser` → the user's primary Destiny `membershipType` + `membershipId`.
5. `GetProfile(components = 102 ProfileInventories, 201 CharacterInventories, 205 CharacterEquipment, 300 ItemInstances, 305 ItemSockets, 310 ItemReusablePlugs)` → owned items **with their instanced sockets** (the actual rolled perks).
6. Resolve each owned weapon's instanced socket plugs against the manifest defs to produce its real roll; match to our `WeaponDoc`.

## What we reuse (the seams already exist)

- **`@repo/destiny`**: the manifest download (`manifest.ts`), the weapon/perk
  model (`WeaponDoc`/`PerkRef`/`PerkColumn`), and socket→perk resolution logic
  all transfer directly. We'd add an `interpretProfileItem(profileItem, defs)`
  helper alongside `build-index.ts`.
- **UI**: `WeaponCard`, `PerkColumnView`, the filter/search functions — a "My
  Vault" view reuses them, just sourced from owned items instead of the index.
- **`bungie-api-ts`**: ships `getProfile`, `getMembershipsForCurrentUser`, and
  OAuth token types.

## New pieces to build

- `apps/web/app/api/auth/{login,callback,logout}/route.ts` (OAuth) + a session/token store with refresh.
- A **server-side full-manifest cache** (we currently only ship a flattened index; live socket resolution needs the raw defs server-side — reuse `downloadManifest`, cache to disk/KV, refresh on manifest version change).
- A **"My Vault"** page (auth-gated) that lists owned weapons + rolls, filterable with the existing search functions.
- Per-user **rate-limit / token-expiry** handling.

## Effort & risk

Medium. The Destiny data modeling is already done; the real work is **auth
plumbing** (token exchange, refresh, sessions, secret management) and a
server-side manifest cache. None of it requires changing the current app — it's
purely additive.
