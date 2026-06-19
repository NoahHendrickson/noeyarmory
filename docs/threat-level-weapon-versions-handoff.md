# Handoff: Threat Level / weapon version selection bug

**Repo:** [NoahHendrickson/noeyarmory](https://github.com/NoahHendrickson/noeyarmory)  
**Branch:** `main`  
**Date:** 2026-06-18  
**Status:** Fix implemented locally, **not committed or pushed**

---

## Goal

Threat Level (and other reprised weapons) should show the **current perk pool** in search and weapon detail — not the legacy Scourge of the Past definition.

**User report:** Opening Threat Level showed old traits (Trench Barrel, Rampage, etc.) instead of the Pantheon reprised pool (One-Two Punch, Bewildering Burst, etc.).

---

## Root cause

The index contains **multiple item hashes** with the same display name. Version selection used a sort key that overweighted `seasonNumber`:

```typescript
// OLD (buggy) — in weaponVersionSortKey
(seasonNumber ?? 0) * 1_000_000 + releaseIndex
```

Original Threat Level has `seasonNumber: 5`; Pantheon reprisals have **no season metadata** (`undefined` → 0). The old hash therefore always scored higher and was picked as the "primary" version for search collapse and detail.

---

## Threat Level data (from `apps/web/public/data/weapons.json`)

| Hash | Source | seasonNumber | releaseIndex | Perk pool |
|------|--------|--------------|--------------|-----------|
| `1664372054` | Scourge of the Past | 5 | 29,444 | **Old** — Trench Barrel, Rampage, Moving Target, Snapshot Sights, etc. |
| `1523151869` | Pantheon | — | 35,273 | **New** — One-Two Punch, Bewildering Burst, Lead from Gold, Cascade Point, etc. |
| `950894542` | (unset) | — | 35,285 | **New** — same updated pool as Pantheon |

After the fix, `primaryWeaponVersion()` picks **`950894542`** on the existing index (verified locally).

---

## Fix (uncommitted)

### Files changed

```
packages/destiny/src/weapon-variants.ts      (+53/-21)  — main fix
packages/destiny/src/weapon-variants.test.ts (+57)      — Threat Level regression tests
packages/destiny/src/types.ts                (comment)   — superseded field doc update
```

### 1. Sort key — `weaponVersionSortKey`

Manifest insertion order (`releaseIndex`) is now primary; season only breaks ties:

```typescript
weapon.releaseIndex * 1_000 + (weapon.seasonNumber ?? 0)
```

**Effect:** Works immediately on existing `weapons.json` without regenerating the index.

### 2. Reconcile — `reconcileCraftableTwins`

Extended to also supersede **non-craftable** same-name duplicates at index build time:

- Keep the hash with the highest `releaseIndex`
- Mark older same-name defs `superseded: true`
- Copy `source` from legacy onto the primary when missing (Threat Level primary gets `"Pantheon"` from sibling)

**Effect:** Requires `pnpm --filter @repo/destiny generate` to take effect in `weapons.json`.

### 3. Tests

- Threat Level sort-key regression test
- Non-craftable reprisal superseding test
- Cynosure sort test updated to use realistic releaseIndex ordering

All `@repo/destiny` tests pass: **244/244**.

---

## How version selection flows through the app

```
build-index.ts
  → reconcileCraftableTwins()   // marks superseded at generate time
  → internWeaponCatalog()

Runtime:
  weapon-variants.ts — weaponVersionSortKey / primaryWeaponVersion / collapseWeaponVersions
  → use-weapon-search-results.ts   // collapseWeaponVersions on ranked results
  → home-search.tsx                // setSelectedHash(weapon.hash) from collapsed results
  → useWeaponDetail(hash)          // loads perk pool for that hash
```

Direct URL `/weapon/1664372054` should still show old perks (intentional — vault legacy copies).

---

## Related prior work (already on `main`, pushed)

Commit **`5e9c2a9`** — *feat: Collapse duplicate weapon versions in search and add generic trait filter.*

Added:

- `collapseWeaponVersions` in search results
- Generic `trait:` filter (query language + palette)
- `WeaponDetailWithVersions` for view tracking

That work introduced version collapsing but **did not fix** the sort-key bug — which is why Threat Level still showed old perks until this fix.

---

## Suggested next steps

1. Review uncommitted diff in the 3 files above; **commit and push if the user asks**.
2. Regenerate index: `pnpm --filter @repo/destiny generate` (requires `BUNGIE_API_KEY` in repo-root `.env`) so old Threat Level hashes get `superseded: true`.
3. **Manual verify:** Search "Threat Level" → open detail → confirm new trait perks (One-Two Punch, Bewildering Burst), not Rampage/Trench Barrel.
4. Spot-check other reprisals — ~83/547 duplicate-name groups had sort-key disagreements; fix should help cases where reprisals lack season metadata. No broad regression testing beyond unit tests.

---

## Key files

| File | Role |
|------|------|
| `packages/destiny/src/weapon-variants.ts` | Sort key, reconcile, collapse — **main fix** |
| `packages/destiny/src/weapon-variants.test.ts` | Threat Level + reconcile tests |
| `packages/destiny/src/build-index.ts` | Calls `reconcileCraftableTwins` at generate time |
| `apps/web/hooks/use-weapon-search-results.ts` | `collapseWeaponVersions` in search |
| `apps/web/public/data/weapons.json` | Generated, gitignored — needs `generate` to refresh |

---

## Commands

```bash
git diff packages/destiny/src/weapon-variants.ts   # review fix

pnpm --filter @repo/destiny exec vitest run src/weapon-variants.test.ts
pnpm --filter @repo/destiny exec vitest run          # all destiny tests
pnpm --filter @repo/destiny generate               # refresh weapons.json + superseded flags
pnpm dev                                           # https://localhost:4111
```

---

## Open questions

- User has **not** asked to commit the Threat Level fix yet.
- No browser smoke test run on Threat Level detail modal.
- `950894542` (no source) vs `1523151869` (Pantheon source) — both have identical new perk pools; fix picks highest `releaseIndex` and copies source from Pantheon sibling during reconcile.
- `reconcileCraftableTwins` name is now a misnomer (handles all same-name duplicates); rename was intentionally avoided to minimize API churn.

---

## Conventions (from repo docs)

- Do **not** commit unless the user explicitly asks.
- `weapons.json` is gitignored; fresh clones use `sampleWeapons` until `pnpm setup:bungie` / `generate`.
- Run package scripts via `pnpm --filter`, not by `cd`-ing into packages.
