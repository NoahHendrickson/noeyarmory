# noeyarmory

A personal Destiny 2 weapon & perk search app — search weapons by their perks,
rolls, and attributes. Inspired by the (now-defunct) **D2Foundry**, rebuilt on a
modern stack and scoped to the parts that matter: find a weapon → see its perks,
find a perk → see every weapon that can roll it, and filter by element, type,
ammo, rarity, frame, and perk.

> Status: scaffold complete. The Destiny data layer and search UI are built in
> phases on top of this foundation.

## Stack

- **pnpm** workspace monorepo (Node 24)
- **Next.js 16** (App Router) — `apps/web`
- **@repo/ui** — component library: **shadcn** components on **Base UI**
  primitives, **Tailwind v4** (CSS-first), documented in **Storybook 10**
- **Vitest** — jsdom unit tests + Storybook play-function tests (browser)
- **TypeScript 6** (strict), **ESLint 10** (flat config) + **Prettier**
- Data layer (`@repo/destiny`): **Bungie manifest → weapon index**, searched
  client-side with **fuse.js**

## Directory map

```
noeyarmory/
├── apps/
│   └── web/            # Next.js 16 App Router — the search UI
├── packages/
│   ├── ui/             # @repo/ui — Base UI + Tailwind v4 components + Storybook
│   ├── destiny/        # @repo/destiny — Bungie manifest pipeline, weapon index, search
│   └── tsconfig/       # @repo/tsconfig — shared TS presets (base / nextjs / react-library)
├── .mcp.json           # Storybook MCP server (http://localhost:6006/mcp)
└── pnpm-workspace.yaml
```

## Commands

| Command           | What it does                                          |
| ----------------- | ----------------------------------------------------- |
| `pnpm dev`        | Runs the web app + Storybook in parallel              |
| `pnpm build`      | Builds packages (`@repo/ui`) then the web app         |
| `pnpm storybook`  | Storybook only (http://localhost:6006)                |
| `pnpm test`       | Runs all Vitest projects (unit + Storybook)           |
| `pnpm lint`       | ESLint across the workspace                           |
| `pnpm format`     | Prettier (with Tailwind class sorting)                |

### Refreshing weapon data

The weapon index is generated from the live Bungie manifest:

```bash
cp .env.example .env      # then paste your BUNGIE_API_KEY
pnpm --filter @repo/destiny generate
```

Re-run after a Destiny patch to pick up new weapons and perks. A Bungie API key
is free — see `.env.example`.
```
