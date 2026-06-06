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
| Scopes | **ReadDestinyInventoryAndVault**, **ReadBasicUserProfile** |

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

## Verify

1. **Local:** sign in at `https://localhost:4111` → `/vault` shows weapons, **My Armor** shows owned armor
2. **Prod:** deploy → sign in on your production URL → same checks

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| OAuth redirect error | Redirect URL in Bungie must **exactly** match (`https`, port `4111`, path `/api/auth/callback`) |
| `Missing BUNGIE_*` on auth | Fill repo-root `.env` with **dev** app credentials, restart `pnpm dev` |
| Empty vault/armor after sign-in | Run `pnpm setup:bungie` to generate `weapons.json` and `armor.json` |
| Prod OAuth fails | Confirm Vercel uses **prod** app credentials, not dev |

Official reference: [Bungie OAuth docs](https://github.com/Bungie-net/api/wiki/OAuth-Documentation)
