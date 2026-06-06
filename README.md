# noeyarmory

A personal Destiny 2 weapon & perk search app — search weapons by their perks,
rolls, and attributes. Inspired by the (now-defunct) **D2Foundry**, rebuilt on a
modern stack and scoped to the parts that matter:

- **Find a weapon → see its perks** (every possible random roll, per column) + stats
- **Find a perk → see every weapon that can roll it** (by name, across archetypes)
- **Filter** by element, weapon type, ammo, rarity, frame, and perk
- **My Vault** — sign in with Bungie to search the weapons _you own_ and the exact rolls you have

## Stack

- **pnpm** workspace monorepo (Node 24)
- **Next.js 16** (App Router) — `apps/web`
- **@repo/ui** — component library: **shadcn** components on **Base UI**
  primitives, **Tailwind v4** (CSS-first), documented in **Storybook 10**
- **Vitest** — jsdom unit tests + Storybook play-function tests (browser)
- **TypeScript 6** (strict), **ESLint 9** (flat config) + **Prettier**
- Data layer (`@repo/destiny`): **Bungie manifest → weapon index**, searched
  client-side with **fuse.js**
- **iron-session** for the Bungie OAuth session (My Vault)

## Directory map

```
noeyarmory/
├── apps/
│   └── web/            # Next.js 16 App Router — search UI, /vault, OAuth routes
├── packages/
│   ├── ui/             # @repo/ui — Base UI + Tailwind v4 components + Storybook
│   ├── destiny/        # @repo/destiny — Bungie manifest pipeline, weapon index, search
│   └── tsconfig/       # @repo/tsconfig — shared TS presets (base / nextjs / react-library)
├── .mcp.json           # Storybook MCP server (http://localhost:6006/mcp)
└── pnpm-workspace.yaml
```

## Commands

| Command          | What it does                                              |
| ---------------- | -------------------------------------------------------- |
| `pnpm dev`       | Web app on **https://localhost:4111** + Storybook (6006) |
| `pnpm build`     | Builds `@repo/ui` → `@repo/destiny` → the web app         |
| `pnpm storybook` | Storybook only (http://localhost:6006)                   |
| `pnpm test`      | All Vitest projects (unit + Storybook)                   |
| `pnpm lint`      | ESLint across the workspace                              |
| `pnpm format`    | Prettier (with Tailwind class sorting)                   |

> Dev runs over **HTTPS** (a local mkcert cert via Next `--experimental-https`)
> on a fixed port **4111**, because Bungie OAuth requires an `https` redirect.

## Setup

### 1. Weapon data (required)

The weapon index is generated from the live Bungie manifest:

```bash
cp .env.example .env       # then paste your BUNGIE_API_KEY
pnpm --filter @repo/destiny generate
```

This writes `apps/web/public/data/weapons.json`. Re-run after a Destiny patch to
pick up new weapons and perks. A Bungie API key is free — see `.env.example`.

### 2. My Vault — sign in with Bungie (optional)

To search your own owned rolls, the app needs Bungie OAuth:

1. In your Bungie app (https://www.bungie.net/en/Application):
   - **OAuth Client Type → Confidential** (gives a `client_id` + `client_secret`)
   - **Redirect URL → `https://localhost:4111/api/auth/callback`**
2. Create `apps/web/.env.local`:
   ```ini
   BUNGIE_API_KEY=…
   BUNGIE_CLIENT_ID=…
   BUNGIE_CLIENT_SECRET=…
   SESSION_SECRET=…        # 32+ random chars (e.g. `openssl rand -hex 32`)
   ```
3. `pnpm dev`, open **https://localhost:4111**, then **My Vault → Sign in with Bungie**.

The API key, client secret, and session are read server-side only and never
shipped to the browser. All `.env*` files are gitignored.
