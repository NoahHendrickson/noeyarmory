# Agent handoff: destiny.report research → implementation

**Created:** 2026-06-09  
**Branch:** `cursor/destiny-report-research-4b1b`  
**PR:** https://github.com/NoahHendrickson/noeyarmory/pull/48  
**Deep-dive doc:** [`docs/destiny-report-research.md`](./destiny-report-research.md)

---

## 1. What this conversation was about

The user asked to **research [destiny.report](https://destiny.report)** — a community Destiny 2 weapon database — and learn what noeyarmory (*moonfang armory*) could improve.

### Work completed

1. **Live reverse-engineering** of destiny.report production assets (no public source repo found for the current SPA):
   - HTML shell, runtime config, worker bundle, WASM trigram index
   - Public `weapons.json` schema (~1,837 weapons, ~1,112 perks)
2. **Comparison** against our codebase (`@repo/destiny`, command palette, index pipeline).
3. **Written deliverable:** `docs/destiny-report-research.md` (revised twice per user feedback).
4. **Draft PR #48** — docs only, no implementation yet.

### User direction (read this first)

> *"I don't really want to change the UX of ours — I like our command palette, search, and pills. What I really want is to learn how we can improve **performance** and **search**, and what **index enrichments** we can add. I'm also interested in their **tech stack**."*

**Hard constraints for any follow-up agent:**

| Do | Do not |
|----|--------|
| Keep command palette + chip/pill filters | Add DIM-style query bar or CodeMirror filter editor |
| Keep modal weapon detail | Add rail layout, pin sidebar, split detail panel |
| Add new **palette categories** for enriched index fields | Replace chip UX with URL query strings |
| Improve search **under the hood** (worker, preload, index shape) | Copy destiny.report browse UX wholesale |

---

## 2. Product context (noeyarmory today)

**App:** Destiny 2 weapon & perk search (+ owned armor with Bungie OAuth).

| Area | Status |
|------|--------|
| Weapon catalog search | Client-side `weapons.json` + lazy `weapons-detail.json` |
| Search UX | `CommandPalette` in `apps/web/components/home-search.tsx` — categories, chips, ghost completion, custom saved perk filters |
| Filter engine | `filterWeapons()` in `packages/destiny/src/search.ts` — main thread, O(n) scan |
| Text fuzzy search | fuse.js via `createWeaponFuse` / `weaponsMatchingTextQuery` |
| Hot path | `apps/web/hooks/use-weapon-search-results.ts` — **preview mode** can run many `filterWeapons` calls per keystroke |
| Index build | `packages/destiny/src/build-index.ts` → `pnpm setup:bungie` / `generate.ts` |
| Weapon vault | **Not built** — plan in `docs/vault-search-plan.md`; OAuth exists for armor only |

**Inspiration lineage:** README cites defunct D2Foundry; destiny.report is a modern peer in the same niche.

---

## 3. What destiny.report is (TL;DR)

- **Weapon-only** manifest search SPA (Vite, ~479KB main bundle).
- **No vault/OAuth** live today (`light:`/`power:` filters exist in worker but always return false).
- **Search architecture:** Web Worker + Comlink; DIM-adjacent query language; optional WASM trigram index (~6.4MB).
- **Data:** ~3.5MB `weapons.json` + ~3.6MB `weapon-stats.json` + trigram binary; preloaded in `<head>`.
- **Retired:** `archive.destiny.report` (manifest diff tool). Unrelated: old 2019 browser extension for Bungie.net raid stats.

Full architecture diagrams and asset sizes → [`destiny-report-research.md`](./destiny-report-research.md).

---

## 4. Key gaps vs us (actionable)

### Index enrichments → new palette chips (Phase 1 priority)

destiny.report precomputes fields we omit from `WeaponSummary`:

| Field | Example filter (their syntax) | Our delivery |
|-------|------------------------------|--------------|
| `sources[]` | `source:trials` | **Source** palette category |
| `foundry` | `foundry:hakke` | **Foundry** category |
| `breaker` | `breaker:barrier` | **Champion** category |
| `isHolofoil`, `isFeatured`, `reissueVersion` | `is:holofoil`, etc. | Yes/No chips |
| Manifest `isAdept` | `is:adept` | Replace name regex in `build-index.ts` |
| Display stats on summary | `stat:rpm:>=640` | Phase 2 — stat threshold chips |

We **already have:** Trait 1 / Trait 2 (their `perk1:`/`perk2:`), multi-perk AND, element/type/slot/ammo/frame facets, DPS sort, lazy detail split.

### Performance (Phase 3+)

| Their approach | Our gap |
|--------------|---------|
| Worker runs all filter + text search | Main thread; preview loop is expensive |
| `fetch(weapons.json)` in `<head>` | Fetch starts in `WeaponsProvider` after hydration |
| Content-hashed JSON + config sidecar | Static `/data/weapons.json` |
| Precomputed facets at build | `collectFacets(weapons)` on every client load |
| WASM trigram (6.4MB) | fuse.js only — may be enough in worker without WASM |

**Keep our advantage:** lazy `weapons-detail.json` (~1.5s idle) — don't ship their full upfront ~7MB stats bundle unless needed.

---

## 5. Implementation plan (ordered)

Each phase is independently shippable. **Do not skip Phase 1** before worker work — enriched fields make predicates cheap.

### Phase 1 — Index enrichment + new palette categories

**Goal:** Better search correctness; new chips without UX change.

**Touch:**

- `packages/destiny/src/build-index.ts` — extract source, foundry, breaker, event, flags from manifest
- `packages/destiny/src/types.ts` — extend `WeaponSummary`
- `packages/destiny/src/search.ts` — `WeaponFilters`, `filterWeapons`, `collectFacets`
- `apps/web/lib/palette/weapon-categories.ts` — new categories
- `packages/destiny/src/search.test.ts` — predicate tests

**Checklist:**

- [ ] `sources`, `sourceLabel`, `foundry`, `breaker`, `event` on summary
- [ ] `isHolofoil`, `isFeatured`, `isEnhanceable`, `reissueVersion`, `variantOf`
- [ ] Manifest-driven `isAdept` (fallback regex if needed)
- [ ] Palette: Source, Foundry, Champion, Holofoil, Featured, Reissued
- [ ] Regenerate index: `pnpm setup:bungie` (needs `.env` + `BUNGIE_API_KEY`)

**Verify:** `pnpm --filter @repo/destiny test`; spot-check Trials + raid weapons in palette facets.

**Open question:** Map Bungie source hashes → canonical tags (`trials`, `vaultofglass`, …) — see DR worker for ~40 source strings as reference.

---

### Phase 2 — Display stats on summary (stat chips)

**Goal:** Filter by RPM/range/etc. without loading detail JSON.

**Touch:** `build-index.ts`, `search.ts`, `weapon-categories.ts`

**Checklist:**

- [ ] Store scaled display stats on `WeaponSummary` (rpm, range, stability, handling, reload, mag)
- [ ] Extend `WeaponFilters` + `filterWeapons` for stat thresholds
- [ ] Palette category for stat filters (same chip picker pattern)

**Open question:** Range chips (`≥600`) vs buckets (`600–700`) — user hasn't decided.

---

### Phase 3 — Search performance

**Goal:** Palette stays responsive under load (6× CPU throttle test).

**Touch:**

- New worker: `packages/destiny/src/search-worker.ts` or `apps/web/workers/weapon-search.worker.ts`
- `apps/web/hooks/use-weapon-search-results.ts` — call worker instead of sync `filterWeapons`
- `apps/web/lib/weapons-context.tsx` — early fetch hookup
- Root layout — `<link rel="preload">` or inline preload script for `weapons.json`

**Preview quick wins (can ship before worker):**

- Reuse `weaponsByPerkName` for perk-only preview (set intersection, not full scan)
- Cap hypothetical filter passes (Firefox already has lower limits in `constants.ts`)
- Stable-hash early exit when chips unchanged

**Verify:** Chrome Performance, 6× CPU, 3+ chips, rapid typing — target no >50ms long tasks during preview.

**Note:** Worker is client-only; don't break SSR on `/weapon/[hash]` or `/perk/[hash]`.

---

### Phase 4 — Build pipeline hardening

**Touch:** `packages/destiny/src/generate.ts`, deploy/CDN config

- [ ] Content-hashed `weapons.<hash>.json` + tiny `weapons-manifest.json`
- [ ] Precomputed `facets` / column perk options in index JSON
- [ ] Show `generatedAt` + manifest `version` in sample-data banner

---

### Phase 5 — WASM trigram (conditional)

**Only if Phase 3 profiling shows fuse-in-worker is insufficient.**

- [ ] Build script for trigram `.bin` + load `.wasm` in worker
- [ ] Lazy-load binary after catalog (don't block first paint)

**Skip by default** — ~6MB extra download; ~2k weapons may not need it.

---

## 6. Critical code map

```
Index pipeline
  packages/destiny/src/generate.ts          # writes weapons.json + weapons-detail.json
  packages/destiny/src/build-index.ts     # manifest → WeaponDoc[] (trickiest domain code)
  packages/destiny/src/intern-weapons.ts  # interning, perksLower strip, lookups
  packages/destiny/src/weapon-index-lookups.ts

Search engine
  packages/destiny/src/search.ts            # filterWeapons, collectFacets, fuse helpers
  packages/destiny/src/suggest.ts           # perk name fuse for palette suggestions

Web UI (palette — do not redesign)
  apps/web/components/home-search.tsx
  apps/web/hooks/use-weapon-search-results.ts   # ← performance hot path
  apps/web/hooks/use-home-search-palette-state.ts
  apps/web/lib/palette/weapon-categories.ts
  apps/web/lib/palette/weapon-filters.ts        # chips → WeaponFilters
  apps/web/lib/weapons-context.tsx              # fetch + module cache

Related plans
  docs/vault-search-plan.md                 # future owned-weapon search (out of scope unless asked)
```

---

## 7. How we researched destiny.report

Methods used (no repo clone):

1. `curl` HTML shell → `destiny-report-config` JSON (asset URLs, manifest version)
2. Downloaded `weapons.*.json`, worker JS, WASM — inspected schema and filter registry
3. Compared against our types and search tests

**Reference URLs:**

- App: https://destiny.report
- Sample weapons bundle: `https://destiny.report/assets/public/data/weapons.8c33445bd4d59b2f.json`
- Worker filter keywords extracted from `weapon-search.worker-*.js` (source, foundry, stat, perk1, etc.)

---

## 8. Explicit non-goals

Do **not** implement unless the user explicitly asks:

- DIM/query-string search UI or `?q=` URL sync
- Rail / tile / list view modes
- Pin weapons sidebar or `pinned:` filter
- PWA / empty service worker
- Copying destiny.report visual design or CodeMirror editor
- Weapon vault (separate milestone — `vault-search-plan.md`)

---

## 9. Dev environment reminders

From `AGENTS.md` / `CLAUDE.md`:

```bash
source scripts/ensure-cloud-env.sh   # Node 24
pnpm install
pnpm --filter @repo/destiny test     # search unit tests
pnpm typecheck                       # correctness gate
pnpm setup:bungie                    # full index (needs .env)
```

- `apps/web/public/data/weapons.json` is **gitignored** — sample fixtures without Bungie setup
- Dev web: `pnpm --filter web dev` → https://localhost:4111
- Palette focus shortcut: **F**

---

## 10. Suggested first task for next agent

**Start Phase 1:** Add `sources` + `foundry` + `breaker` to `build-index.ts` and wire **Source** / **Foundry** / **Champion** palette categories.

Why first:

- Highest user value ("where does this drop?")
- Pure additive — no UX change
- Makes `filterWeapons` more useful before any worker investment
- Well-defined tests in `search.test.ts`

After Phase 1, ask user whether to prioritize **Phase 2 (stat chips)** or **Phase 3 (worker)** based on perceived palette lag.

---

## 11. Git state

| Item | Value |
|------|-------|
| Branch | `cursor/destiny-report-research-4b1b` |
| Commits | `b12fb68` initial research; `3611c49` refocus on perf/search/index |
| PR | #48 (draft, docs only) |
| Base | `main` |

New implementation work should branch from `main` or continue on a fresh `cursor/<task>-4b1b` branch per cloud agent rules.

---

## 12. Document index

| File | Purpose |
|------|---------|
| `docs/destiny-report-research.md` | Full research: architecture, schema, perf recommendations, phase details |
| `docs/destiny-report-handoff.md` | This file — conversation summary + agent onboarding |
| `docs/vault-search-plan.md` | Separate milestone: owned weapon rolls via OAuth |
