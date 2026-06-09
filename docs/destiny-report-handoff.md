# Agent handoff: destiny.report research → implementation

**Created:** 2026-06-09  
**Branch:** `cursor/destiny-report-research-4b1b`  
**PR:** https://github.com/NoahHendrickson/noeyarmory/pull/48  

---

## Document index

| File | Purpose |
|------|---------|
| [`destiny-report-research.md`](./destiny-report-research.md) | Full research: weapon catalog perf, index enrichments, DR tech stack |
| [`destiny-report-handoff.md`](./destiny-report-handoff.md) | This file — onboarding + weapon catalog plan |
| [`armor-vault-search-improvements.md`](./armor-vault-search-improvements.md) | **Owned armor** vault search — mods, slot, location, stats (user priority) |

---

## 1. What this conversation was about

Research [destiny.report](https://destiny.report) for lessons on **weapon catalog** performance, search, and index shape — **without changing** our command palette UX.

Follow-up clarified:

- **Do not** pursue owned **weapon** vault search.
- **Do** care about **owned armor** vault search improvements → see [`armor-vault-search-improvements.md`](./armor-vault-search-improvements.md).

### User constraints

| Do | Do not |
|----|--------|
| Keep command palette + chip/pill filters | DIM query bar, CodeMirror editor, rail/pin layouts |
| Keep modal weapon detail | Replace chips with URL query strings |
| Add palette **categories** for new filter fields | Copy destiny.report browse UX |
| Improve search under the hood (worker, index) | Owned weapon roll search |

---

## 2. Product context

| Area | Status |
|------|--------|
| Weapon catalog search | `weapons.json` + lazy `weapons-detail.json`; `filterWeapons` on main thread |
| Armor vault search | **Live** — OAuth, `GET /api/armor`, armor mode palette; gaps in [`armor-vault-search-improvements.md`](./armor-vault-search-improvements.md) |
| Search UX | `home-search.tsx` + `use-weapon-search-results.ts` / `use-armor-search-results.ts` |
| Weapon hot path | Preview loop → many `filterWeapons` calls per keystroke |

---

## 3. destiny.report (TL;DR)

Weapon-only SPA: Worker + Comlink, optional WASM trigram (~6.4MB), ~3.5MB weapons JSON preloaded in `<head>`. No armor, no vault. Details → [`destiny-report-research.md`](./destiny-report-research.md).

---

## 4. Weapon catalog plan (from DR research)

### Phase 1 — Index enrichment + palette categories

`build-index.ts` → Source, Foundry, Champion, Holofoil, Featured, Reissued, manifest `isAdept`.

### Phase 2 — Display stats on `WeaponSummary` (stat chips)

### Phase 3 — Search perf: worker, preload, preview optimizations

### Phase 4 — Content-hashed index + precomputed facets

### Phase 5 — WASM trigram (only if Phase 3 insufficient)

Full checklists → [`destiny-report-research.md`](./destiny-report-research.md) § Recommended implementation plan.

**Suggested first task (weapons):** Phase 1 — `sources`, `foundry`, `breaker` in `build-index.ts`.

---

## 5. Armor vault plan (user priority)

**Not from destiny.report** — our own gap analysis.

**Suggested first task (armor):** Phase A — **Mod** chip filter (`rolledMods` already in API).

Phases B–E → [`armor-vault-search-improvements.md`](./armor-vault-search-improvements.md).

---

## 6. Code map

**Weapons (catalog)**

```
packages/destiny/src/build-index.ts, search.ts, generate.ts
apps/web/hooks/use-weapon-search-results.ts
apps/web/lib/palette/weapon-categories.ts
apps/web/lib/weapons-context.tsx
```

**Armor (owned vault)**

```
apps/web/lib/bungie-profile.ts, app/api/armor/route.ts
packages/destiny/src/owned-armor-search.ts
apps/web/hooks/use-armor-search-results.ts
apps/web/lib/palette/armor-categories.ts
```

---

## 7. Explicit non-goals

- Owned **weapon** rolls / vault weapon search
- DIM query UI, rail layout, pins, PWA
- destiny.report visual design

---

## 8. Dev commands

```bash
source scripts/ensure-cloud-env.sh
pnpm --filter @repo/destiny test
pnpm typecheck
pnpm setup:bungie    # full weapon/armor indexes; needs .env
```

Armor manual test: sign in → `/?mode=armor` → https://localhost:4111

---

## 9. Git state

Branch `cursor/destiny-report-research-4b1b`, PR #48 (docs). New implementation: branch `cursor/<task>-4b1b` off `main`.
