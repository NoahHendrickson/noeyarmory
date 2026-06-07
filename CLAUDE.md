# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

noeyarmory is a Destiny 2 weapon & perk search app: find a weapon → see every random roll it can have; find a perk → see every weapon that rolls it; sign in with Bungie to search your own owned rolls ("My Vault"). pnpm workspace monorepo, Node 24, Next.js 16 App Router.

## Commands

```bash
pnpm dev                                  # web on https://localhost:4111 + Storybook on :6006
pnpm build                                # builds in order: @repo/ui → @repo/destiny → web
pnpm test                                 # all Vitest projects (recursive, --if-present)
pnpm typecheck                            # tsc --noEmit across the workspace
pnpm lint                                 # ESLint (flat config, type-checked rules)
pnpm format                               # Prettier + Tailwind class sort

pnpm --filter @repo/destiny generate      # (re)build the weapon index — see "Weapon data" below
pnpm --filter web dev                     # web only
pnpm storybook                            # Storybook only

# Single test / file (Vitest)
pnpm --filter @repo/destiny exec vitest run src/search.test.ts
pnpm --filter @repo/destiny exec vitest run -t "reverse search by perk hash"
pnpm --filter @repo/ui exec vitest run --project unit        # jsdom unit project only
```

There is no Turborepo/Nx — scripts fan out with `pnpm -r` / `pnpm --filter`. Run package scripts through the workspace filter, not by `cd`-ing into a package.

## Weapon data — the generated index

The app's entire dataset is one generated file: **`apps/web/public/data/weapons.json`**. It is **gitignored**, so a fresh clone has no data until you generate it. Until then the UI falls back to a tiny bundled `sampleWeapons` fixture.

Pipeline (all in `packages/destiny/src`):

```
generate.ts → manifest.ts (download Bungie manifest slices)
            → build-index.ts (buildWeaponIndex: flatten → WeaponDoc[])
            → writes apps/web/public/data/weapons.json
```

- `generate` reads `BUNGIE_API_KEY` from the **repo-root `.env`** (not `apps/web`). Re-run after a Destiny patch to pick up new weapons/perks.
- **`build-index.ts` is the trickiest, most domain-heavy code.** It encodes Destiny specifics: socket-category hashes (intrinsic vs. perk columns), random/reusable plug-set resolution, cosmetic/empty-plug filtering, and `columnKind()` heuristics that guess a column label ("Barrel", "Magazine", …) from plug-category identifier strings. New weapon archetypes that don't match these heuristics are where flattening silently goes wrong. A couple of fields are deliberate simplifications: `craftable` is always `false`, `adept` is a name regex.
- `search.ts` is pure functions over `WeaponDoc[]` — `filterWeapons`, `weaponsWithPerk` (reverse lookup), fuse.js fuzzy search, `collectFacets`, `buildPerkMap`. No I/O; this is what the unit tests cover.
- `@repo/destiny` is consumed as **TypeScript source** (`exports` → `./src/index.ts`); its `tsup` build exists only as a standalone artifact / CI type-gate.

## How the web app uses the data (two consumers, one file)

`weapons.json` is read **two different ways** — keep both in mind when changing the `WeaponDoc` shape:

1. **Client** — `lib/use-weapons.ts` `fetch`es `/data/weapons.json` in the browser for all browse/search/detail pages (client components), falling back to `sampleWeapons` on 404.
2. **Server** — `lib/bungie-profile.ts` `readFileSync`s the same file (module-cached) to turn the user's owned item hashes + equipped plug hashes into `WeaponDoc`s with their actual rolled perks.

## My Vault — Bungie OAuth (server-only)

All auth code imports `"server-only"`; secrets never reach the client. Runtime OAuth env vars live in the **repo-root `.env`** (loaded by Next.js via `next.config.ts`); run `pnpm setup:bungie` to validate and generate indexes.

Flow:
- `lib/session.ts` — iron-session encrypted cookie (`SessionData`); `isSignedIn` gate.
- `app/api/auth/login` → sets a CSRF `oauthState`, redirects to Bungie authorize.
- `app/api/auth/callback` → verifies state, exchanges code (`bungie-auth.ts`), resolves membership (`bungie-profile.ts`), saves tokens, redirects to home (or `oauthReturnTo`).
- `lib/bungie-profile.ts` `ensureAccessToken()` auto-refreshes the access token ~60s before expiry; `getOwnedArmor()` pulls profile components for owned armor search on the home page.
- Owned armor search/equip/transfer live on `/` in armor mode (no separate `/vault` route).

Dev runs over **HTTPS on the fixed port 4111** (`next dev --experimental-https`, mkcert cert in `apps/web/certificates/`) specifically because Bungie OAuth requires an `https` redirect URI. Don't change the port/scheme casually — the registered Bungie redirect (`https://localhost:4111/api/auth/callback`) must match.

## UI library (`@repo/ui`)

shadcn/ui components ported from Radix onto **Base UI** (`@base-ui/react`, imported as `@base-ui/react/*` — not `@mui/base`). The key porting pattern: Radix's `asChild` becomes Base UI's **`render` prop via the `useRender` hook** (+ `mergeProps`) — see `src/components/button.tsx`. Variants use `class-variance-authority`; `cn()` (`src/lib/utils.ts`) is `clsx` + `tailwind-merge`.

- **Tailwind v4, CSS-first** — no `tailwind.config`. Theme/tokens live in `src/styles/theme.css` + `globals.css`; Prettier's `tailwindStylesheet` points there.
- Tests: two Vitest projects (`packages/ui/vitest.config.ts`) — **`unit`** (jsdom + Testing Library) and **`storybook`** (every `*.stories.tsx` play function run as a test in real Chromium via Playwright browser mode).
- `.mcp.json` registers a Storybook MCP server at `http://localhost:6006/mcp` (only live while Storybook runs).

## Conventions & gotchas

- **TS 6, strict**, with `verbatimModuleSyntax: true` → type-only imports **must** use `import type { … }`, or lint/build fails. Also `noUncheckedIndexedAccess` (array/record access is `T | undefined`). Shared presets in `@repo/tsconfig` (`base` / `nextjs` / `react-library`).
- **ESLint is pinned to 9** (flat config, `eslint.config.mjs`) using `recommendedTypeChecked` + `projectService` — rules are type-aware, so lint needs a working type graph. `packages/destiny/generated/**` and build outputs are ignored.
- pnpm 10 blocks dependency build scripts by default; the allowlist is `onlyBuiltDependencies` in `pnpm-workspace.yaml` (esbuild, `@tailwindcss/oxide`, sharp). Add to it if a new dep needs a postinstall build.
- Prettier: double quotes, semicolons, trailing commas, `printWidth` 100.
- All `.env*` (except `.env.example`), `certificates/`, and `apps/web/public/data/` are gitignored.
