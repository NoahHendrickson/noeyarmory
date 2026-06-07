# Bungie setup (My Vault + My Armor)

Bungie allows **one redirect URL per application**, so local dev and production need **separate Bungie apps**. Each app has its own linked set of `BUNGIE_API_KEY`, `BUNGIE_CLIENT_ID`, and `BUNGIE_CLIENT_SECRET`.

## Step 1 — Create two Bungie apps (~10 min)

Open [bungie.net/en/Application](https://www.bungie.net/en/Application) and create **two** apps.

### Dev app (local)

| Field | Value |
|-------|-------|
| Name | e.g. `noeyarmory dev` |
| OAuth Client Type | **Confidential** |
| Redirect URL | `https://localhost:4111/api/auth/callback` |
| Scopes | **ReadDestinyInventoryAndVault**, **ReadBasicUserProfile**, **MoveEquipDestinyItems** |

### Prod app (Vercel)

| Field | Value |
|-------|-------|
| Name | e.g. `noeyarmory` |
| OAuth Client Type | **Confidential** |
| Redirect URL | `https://<your-vercel-domain>/api/auth/callback` |
| Scopes | same as dev |

Copy **API Key**, **OAuth client_id**, and **OAuth client_secret** from each app page.

## Step 2 — Local `.env` (dev app only)

```bash
cp .env.example .env
# Paste the DEV app's three Bungie values into .env
pnpm setup:bungie
```

`setup:bungie` will:

- Auto-generate `SESSION_SECRET` if blank
- Validate your dev credentials
- Download the manifest and write `weapons.json` + `armor.json`

Then:

```bash
pnpm dev
# Open https://localhost:4111 (HTTPS required for OAuth)
```

Sign in via **My Vault** or the **My Armor** tab.

## Step 3 — Vercel env vars (prod app only)

In **Vercel → Project → Settings → Environment Variables**, add the **PROD app** credentials:

| Variable | Environments |
|----------|--------------|
| `BUNGIE_API_KEY` | Production, Preview, **Build** |
| `BUNGIE_CLIENT_ID` | Production, Preview |
| `BUNGIE_CLIENT_SECRET` | Production, Preview |
| `SESSION_SECRET` | Production, Preview |

Generate a unique production session secret:

```bash
openssl rand -hex 32
```

Do **not** reuse your local `SESSION_SECRET` in production.

Optional: for **Popular lately** on the home screen, also add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` — see [popularity-setup.md](./popularity-setup.md).

### Vercel project settings (monorepo)

Use **one** Vercel project for this app. In **Settings → Build and Deployment**:

| Setting | Value |
|---------|-------|
| Root Directory | `apps/web` **or** leave empty (repo root — uses root `vercel.json`) |
| Install Command | leave empty (use repo `vercel.json`) |
| Build Command | leave empty (use repo `vercel.json`) |

If Root Directory is `apps/web`, enable **Include source files outside of the Root Directory in the Build Step** so workspace packages (`@repo/ui`, `@repo/destiny`) are available.

Do **not** set Install Command to `cd ../.. && pnpm install` when Root Directory is the repo root — that escapes the project and breaks Next.js detection.

## Verify

1. **Local:** sign in at `https://localhost:4111` → `/vault` shows weapons, **My Armor** shows owned armor
2. **Prod:** deploy → sign in on your production URL → same checks

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| OAuth redirect error | Redirect URL in Bungie must **exactly** match (`https`, port `4111`, path `/api/auth/callback`) |
| `Missing BUNGIE_*` on auth | Fill repo-root `.env` with **dev** app credentials, restart `pnpm dev` |
| Empty vault/armor after sign-in | Run `pnpm setup:bungie` to generate `weapons.json` and `armor.json` |
| Equip / Move armor fails with scope error | Add **MoveEquipDestinyItems** to your Bungie app scopes, then sign out and sign back in |
| Equip fails in-game | Bungie requires you to be **in orbit or a social space** to equip or transfer items |
| Prod OAuth fails | Confirm Vercel uses **prod** app credentials, not dev |
| `No Next.js version detected` on deploy | Root Directory must be `apps/web` (with outside files enabled) **or** repo root with root `vercel.json`; clear custom Install/Build overrides in Vercel settings |

Official reference: [Bungie OAuth docs](https://github.com/Bungie-net/api/wiki/OAuth-Documentation)
