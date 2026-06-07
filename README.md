# noeyarmory

A personal Destiny 2 weapon & perk search app — search weapons by their perks,
rolls, and attributes. Inspired by the (now-defunct) **D2Foundry**, rebuilt on a
modern stack and scoped to the parts that matter:

- **Find a weapon → see its perks** (every possible random roll, per column) + stats
- **Find a perk → see every weapon that can roll it** (by name, across archetypes)
- **Filter** by element, weapon type, ammo, rarity, frame, and perk
- **My Vault** — sign in with Bungie to search the weapons _you own_ and the exact rolls you have
- **My Armor** — sign in to search owned armor by slot, class, rarity, and equipped mods

## Stack

- **pnpm** workspace monorepo (Node 24)
- **Next.js 16** (App Router) — `apps/web`
- **@repo/ui** — component library: **shadcn** components on **Base UI**
  primitives, **Tailwind v4** (CSS-first), documented in **Storybook 10**
- **Vitest** — jsdom unit tests + Storybook play-function tests (browser)
- **TypeScript 6** (strict), **ESLint 9** (flat config) + **Prettier**
- Data layer (`@repo/destiny`): **Bungie manifest → weapon + armor indexes**, searched
  client-side with **fuse.js**
- **iron-session** for the Bungie OAuth session (My Vault / My Armor)

## Directory map

```
noeyarmory/
├── apps/
│   └── web/            # Next.js 16 App Router — search UI, OAuth routes, owned armor on home
├── packages/
│   ├── ui/             # @repo/ui — Base UI + Tailwind v4 components + Storybook
│   ├── destiny/        # @repo/destiny — Bungie manifest pipeline, indexes, search
│   └── tsconfig/       # @repo/tsconfig — shared TS presets (base / nextjs / react-library)
├── docs/
│   └── bungie-setup.md # Bungie dev + prod app checklist
├── .mcp.json           # Storybook MCP server (http://localhost:6006/mcp)
└── pnpm-workspace.yaml
```

## Commands

| Command            | What it does                                              |
| ------------------ | -------------------------------------------------------- |
| `pnpm dev`         | Web app on **https://localhost:4111** + Storybook (6006) |
| `pnpm setup:bungie`| Validate `.env`, generate session secret, build indexes  |
| `pnpm build`       | Builds `@repo/ui` → `@repo/destiny` → the web app         |
| `pnpm storybook`   | Storybook only (http://localhost:6006)                   |
| `pnpm test`        | All Vitest projects (unit + Storybook)                   |
| `pnpm lint`        | ESLint across the workspace                              |
| `pnpm format`      | Prettier (with Tailwind class sorting)                   |

> Dev runs over **HTTPS** (a local mkcert cert via Next `--experimental-https`)
> on a fixed port **4111**, because Bungie OAuth requires an `https` redirect.

## Setup (your 3 steps)

See **[docs/bungie-setup.md](docs/bungie-setup.md)** for the full checklist.

1. **Create two Bungie apps** (dev + prod) — Bungie allows only one redirect URL per app
2. **Local:** paste dev credentials into repo-root `.env`, run `pnpm setup:bungie`
3. **Vercel:** paste prod credentials into project env vars (including Build for `BUNGIE_API_KEY`)

Then `pnpm dev` → **https://localhost:4111** → sign in for My Vault / My Armor.

All secrets are server-side only and never shipped to the browser. `.env` is gitignored.
