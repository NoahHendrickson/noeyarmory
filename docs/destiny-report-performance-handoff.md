# Handoff: destiny.report performance research → implementation

**Repo:** [NoahHendrickson/noeyarmory](https://github.com/NoahHendrickson/noeyarmory)  
**Research branch:** `cursor/destiny-report-research-9998` (docs merged or open as PR #49)  
**Implementation branches:** create new `cursor/<phase-name>-9998` off `main` per phase  
**Research PR:** https://github.com/NoahHendrickson/noeyarmory/pull/49 (draft, docs only)  
**Date:** 2026-06-09  
**Status:** Research complete; **no performance code implemented yet**

---

## Goal (from user)

Study [destiny.report](https://destiny.report) to understand how they achieve fast weapon search/browse, and identify **performance lessons** applicable to noeyarmory.

**Hard constraint from user:** Do **not** change UX, layout, or design. Performance-only improvements.

---

## What the previous agent did

### 1. Researched destiny.report (no public source repo)

Method: live HTTP inspection — HTML, response headers, downloaded assets, worker/WASM bundles.

**Key findings** (full write-up in `docs/destiny-report-performance-research.md`):

| Area | destiny.report approach |
|------|-------------------------|
| Architecture | Client-only SPA (Vite-style; ~468 KB main bundle) |
| Initial data | Single `weapons.json` — 3.6 MB raw / ~740 KB gzip, ~1,837 weapons |
| Preload | Inline `<script>` starts `fetch(weapons.json)` **before** JS bundle runs (`__destinyReportPreloads`) |
| Caching | Content-hashed assets + `max-age=31536000, immutable`; HTML short-cached (60s) |
| Search | Web Worker (`weapon-search.worker.js`, Comlink RPC) off main thread |
| Text search | WASM trigram index (6.5 MB `.bin` + 19 KB `.wasm`) + filter predicate fallback |
| Rendering | Virtual scrolling on all browse list modes |
| Icons | Self-hosted baked WebP (`bakedIcon`) — no Bungie CDN at runtime |
| Extra data | `weapon-stats.json` (3.7 MB) loaded separately from catalog |
| Service worker | No-op — PWA installability only, **no** offline cache |

### 2. Mapped noeyarmory's current performance architecture

| Area | noeyarmory today |
|------|------------------|
| Data | Split index: `weapons.json` (browse) + lazy `weapons-detail.json` (idle + 1.5s delay) |
| Perks | Interned indices, `perksLower` stripped at serialize, `weaponsByPerkName` precomputed |
| Search | Main-thread Fuse.js + `filterWeapons`; `useDeferredValue`; hard result caps |
| Virtualization | `@tanstack/react-virtual` only on perk reverse grid (>60 items) |
| SSR | Seeds on `/weapon/[hash]` and `/perk/[hash]` via `weapon-index-server.ts` |
| Caching | Module singleton caches client + server; **no** long-cache headers on `/data/*.json` |
| Images | Bungie CDN (`<Image unoptimized>`) |

### 3. Delivered documentation

| File | Purpose |
|------|---------|
| `docs/destiny-report-performance-research.md` | Full research + phased plan (P0–P3) + benchmark matrix |
| `docs/destiny-report-performance-handoff.md` | This file — agent continuation guide |

### 4. Opened draft PR

- **PR #49:** docs only, branch `cursor/destiny-report-research-9998`
- Commit: `c9c54d7` — adds research doc

---

## What remains (implementation work)

Execute the phased plan from the research doc. **Recommended order:**

### Phase 1 — P0 quick wins (1 PR)

**Target:** Faster cold load + better repeat-visit caching. No behavior change.

1. **Preload `weapons.json` from root layout**
   - Add inline script or Next.js `beforeInteractive` script in `apps/web/app/layout.tsx`
   - Store fetch promise on `globalThis` (mirror `__destinyReportPreloads`)
   - Update `apps/web/lib/weapons-context.tsx` to consume existing promise before starting new fetch
   - **Watch:** CSP in `next.config.ts` allows `script-src 'self'` — confirm chosen approach complies

2. **Content-hashed + immutable cache for generated JSON**
   - In `packages/destiny/src/generate.ts`: emit `weapons.<hash>.json` + small `weapons.manifest.json` (path + version)
   - Add `Cache-Control: public, max-age=31536000, immutable` for hashed `/data/*` in `next.config.ts`
   - Update client fetch paths to read manifest first (or inject manifest path at build time)
   - Apply same pattern to `weapons-detail.json`, `weapon-dps.json`, `armor.json`

**Verify Phase 1:**
- DevTools waterfall: JSON fetch starts before/at JS parse
- Repeat visit: weapon index served from disk cache
- `pnpm typecheck` + `pnpm build` pass
- SSR seeds on `/weapon/[hash]` still work

### Phase 2 — P1 worker offload (1 PR)

**Target:** Move search off main thread. **Identical palette UX** (same caps, same ranking).

1. Create `apps/web/workers/weapon-search.worker.ts` (or similar)
2. Port `filterWeapons`, facet logic, Fuse search from `packages/destiny/src/search.ts` + hooks
3. Thin RPC wrapper (Comlink or manual `postMessage`)
4. Wire `use-weapon-search-results.ts` / `home-search.tsx` to call worker instead of inline `useMemo`
5. Re-test Firefox paths (`apps/web/lib/is-firefox.ts`, lower preview caps)

**Suggested worker API:**

```ts
interface WeaponSearchWorker {
  init(index: SerializedWeaponIndex): Promise<void>;
  search(query: string, filters: WeaponFilters): Promise<SearchResult[]>;
  reversePerk(perkName: string): Promise<number[]>;
}
```

**Verify Phase 2:**
- Rapid palette typing: main-thread long tasks < 50ms
- Result sets identical to pre-worker behavior (snapshot test or manual Fatebringer/Stormchase checks)
- `pnpm --filter @repo/destiny test` still pass (pure functions unchanged)

### Phase 3 — P1 virtualization (1 PR)

**Target:** Reduce DOM pressure on large result sets. Same row components.

1. Audit where `WeaponResultRow` renders without virtualization (home browse, palette "show all")
2. Reuse `VirtualizedWeaponGrid` / `@tanstack/react-virtual` pattern with threshold (existing: 60)
3. Do **not** change row layout — only mount visible rows

**Verify Phase 3:** Smooth scroll with 500+ results on perk page and any newly virtualized lists.

### Phase 4 — Spike (benchmark gate)

Only proceed to P2 items if Phase 2 profiling shows Fuse + filter > 16ms median on target hardware.

| P2 item | Gate |
|---------|------|
| Binary trigram / WASM text index | Worker search still too slow after Phase 2 |
| Build-time icon baking (WebP) | Network panel shows Bungie icon waterfall hurting LCP |
| More aggressive DPS JSON deferral | Low priority; optional after Phase 1 |

### Phase 5 — P3 observability (optional, small PR)

- `x-noeyarmory-manifest-version` response header
- Dev-only search timing logs (`{ query, resultCount, elapsedMs, path }`)

---

## What NOT to do

| Do not | Why |
|--------|-----|
| Change command palette UX, layout, or visual design | Explicit user constraint |
| Rewrite as SPA / drop Next.js | Loses SSR, OAuth, armor vault |
| Merge browse + detail into one monolithic JSON | Regresses our smaller initial payload unless benchmarked |
| Port destiny.report's DIM filter DSL | UX/product change |
| Ship 6.5 MB WASM trigram index by default | High bandwidth cost; spike only |
| Add offline service worker caching | destiny.report deliberately avoids this; adds complexity |

---

## Key files to touch (by phase)

### Phase 1
- `apps/web/app/layout.tsx` — preload script
- `apps/web/lib/weapons-context.tsx` — consume preload promise
- `packages/destiny/src/generate.ts` — hashed output filenames + manifest
- `apps/web/next.config.ts` — cache headers for `/data/*`

### Phase 2
- `packages/destiny/src/search.ts` — keep pure; serialize index for worker
- `apps/web/hooks/use-weapon-search-results.ts`
- `apps/web/components/home-search.tsx`
- New: `apps/web/workers/weapon-search.worker.ts`

### Phase 3
- `apps/web/components/virtualized-weapon-grid.tsx` — reference implementation
- Whatever component renders uncapped weapon lists (grep for `WeaponResultRow`, `weaponShown`)

### Already correct — read before changing
- `packages/destiny/src/intern-weapons.ts` — perk interning, `stripPerksLowerReplacer`
- `packages/destiny/src/weapon-index-lookups.ts` — `buildWeaponIndexLookups`, `weaponsByPerkName`
- `apps/web/lib/weapon-index-server.ts` — server SSR cache
- `apps/web/lib/schedule-idle.ts` — detail preload timing

---

## Environment & commands

```bash
source scripts/ensure-cloud-env.sh   # Node 24 required
node -v                              # should print v24.x
pnpm install
pnpm build
pnpm typecheck                       # stronger gate than lint
pnpm --filter @repo/destiny test
```

**Weapon data:** `apps/web/public/data/weapons.json` is gitignored. Without Bungie credentials, `pnpm --filter @repo/destiny generate` writes sample indexes. For full-catalog perf testing, need repo-root `.env` + `pnpm setup:bungie`.

**Dev server:** `pnpm --filter web dev` → https://localhost:4111 (use tmux for long-running).

---

## Benchmark checklist (run before/after each phase)

| Scenario | Metric | Tool |
|----------|--------|------|
| First visit | JSON start → `WeaponsProvider` ready | Network waterfall |
| Repeat visit | `weapons.json` cache hit | Network panel (disk cache) |
| Palette typing | Main-thread blocking / INP | Performance panel |
| Perk page 200+ weapons | Scroll FPS | Performance monitor |
| `/weapon/1` deep link | TTFB + hydration with SSR seed | Lighthouse |

Sample-data smoke tests: search **Fatebringer** (hash `1`), **Stormchase**; direct URL `/weapon/1`.

---

## Open questions for the next agent

1. **Actual `weapons.json` browse size** — not measured in-repo (gitignored). Run full `generate` and compare to destiny.report's 3.6 MB monolith to validate our split is still winning on TTI.
2. **Is palette search already fast enough?** — Our 50-result cap may mean worker offload is lower priority than preload + caching. Profile first if time-constrained.
3. **CSP + inline preload** — Confirm Next.js `Script strategy="beforeInteractive"` vs raw inline script works with current CSP.
4. **Hashed JSON + SSR** — `weapon-index-server.ts` uses `readFileSync` of fixed paths; manifest lookup must work server-side too.
5. **PR strategy** — Research is on PR #49 (`cursor/destiny-report-research-9998`). Implementation should use **new branches** per phase: `cursor/<phase-name>-9998`.

---

## Suggested first message to the new agent

> Implement Phase 1 (P0) from `docs/destiny-report-performance-handoff.md`: preload `weapons.json` before React hydrates, and add content-hashed immutable cache headers for generated data files. Do not change UX or layout. Read `docs/destiny-report-performance-research.md` for background. Verify with DevTools waterfall and `pnpm build` + `pnpm typecheck`.

---

## Reference links

- Research doc: `docs/destiny-report-performance-research.md`
- destiny.report: https://destiny.report
- Draft research PR: https://github.com/NoahHendrickson/noeyarmory/pull/49
- Repo agent guide: `AGENTS.md`, `CLAUDE.md`
