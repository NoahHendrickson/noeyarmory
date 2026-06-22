# Handoff: Weapon detail version selector

**Repo:** [NoahHendrickson/noeyarmory](https://github.com/NoahHendrickson/noeyarmory)  
**Branch:** `main`  
**Date:** 2026-06-22  
**Status:** Implemented locally, **not committed or pushed**

---

## Goal

Weapon detail should let users switch between currently acquirable same-name perk pools when Bungie ships multiple active definitions for the same weapon.

Primary user example: `Zaouli's Bane` has an active `Pantheon` perk pool and an active `King's Fall` craftable perk pool. The detail view should make those easy to compare.

Scoped behavior:

- Show a selector only when an exact weapon name has more than one distinct current perk pool.
- Exclude historical/unattainable definitions marked `superseded`.
- Dedupe duplicate active hashes with the same perk pool.
- Keep search collapsed to one primary result per weapon name.

---

## Implemented changes

### Domain helper

`packages/destiny/src/weapon-variants.ts`

Added `currentWeaponPerkPoolVersions(...)`, exported from `packages/destiny/src/index.ts`.

Behavior:

- Starts from exact-name sibling weapon summaries, normally from `nameIndex.byName`.
- Filters with existing `isCatalogWeapon(...)`, so superseded historical pools stay hidden.
- Fingerprints non-intrinsic roll columns to collapse duplicate active hashes with identical perk pools.
- Sorts representatives newest-first using existing `sortWeaponVersions(...)`.
- Uses a sourceful duplicate for the option label when the newest representative is source-less.

This preserves direct URL access to old hashes, but the selector only surfaces current catalog-visible perk pools.

### UI selector

`apps/web/components/weapon-detail.tsx`

Added a `PillSelect`-based `WeaponVersionSelector` rendered inside the weapon detail header. `WeaponDetailWithVersions` now reads `nameIndex.byName`, derives current distinct perk-pool versions, and calls `onSelectVersion(hash)` when the user selects another pool.

The selector is hidden when there is only one current distinct pool.

### Entry point wiring

`apps/web/components/weapon-detail-modal.tsx`

Accepts `onSelectVersion` and passes it into `WeaponDetailWithVersions`.

`apps/web/components/home-search.tsx`

Passes `setSelectedHash`, so modal version switches reuse the existing `useWeaponDetail(selectedHash)` loader.

`apps/web/components/weapon-detail.tsx`

Standalone `/weapon/[hash]` now keeps local `activeHash` state for switching and calls `router.replace("/weapon/${hash}", { scroll: false })` so the URL/share target follows the selected version.

### Analytics and share behavior

`WeaponShareButton` already receives the displayed `weapon.hash`, so it follows the selected version automatically.

The view-tracking wrapper still tracks the displayed hash. The previous `skipInitialViewTrack` behavior is preserved for the first search-open render, but version swaps can track normally.

---

## Key data cases

### Zaouli's Bane

From local `apps/web/public/data/weapons.json`:

| Hash | Label | Notes |
| --- | --- | --- |
| `3066945855` | `Pantheon` | Newest Pantheon-era hash, source-less, same pool as `3647341740` |
| `3647341740` | `Pantheon` | Sourceful Pantheon duplicate, deduped behind `3066945855` |
| `431721920` | `King's Fall` | Craftable active King's Fall pool |

Expected selector options: exactly `Pantheon` and `King's Fall`.

### Hidden historical pools

These should not expose old versions in the selector:

- `Kindled Orchid`: old Black Armory forge pool hidden; current `Arena Ops` pool remains.
- `Cynosure`: old unattainable pool hidden; current `Fireteam Ops` pool remains.
- `Threat Level`: superseded Scourge/Pantheon duplicates hidden; current Pantheon-era pool remains.

---

## Tests added

`packages/destiny/src/weapon-variants.test.ts`

New coverage:

- `currentWeaponPerkPoolVersions(...)` excludes superseded historical pools for `Threat Level`, `Kindled Orchid`, and `Cynosure`-shaped groups.
- A Zaouli-shaped fixture keeps the active `Pantheon` and `King's Fall` pools while collapsing duplicate Pantheon hashes into one labeled option.

---

## Verification performed

Automated:

```bash
pnpm --filter @repo/destiny exec vitest run src/weapon-variants.test.ts
pnpm --filter web typecheck
pnpm --filter web test
pnpm --filter @repo/destiny typecheck
```

Results:

- `src/weapon-variants.test.ts`: 14 tests passed.
- `web` typecheck passed.
- `web` tests passed: 23 files, 110 tests.
- `@repo/destiny` typecheck passed.

Generated-catalog sanity check:

```text
Zaouli's Bane -> Pantheon, King's Fall
Kindled Orchid -> Arena Ops only
Cynosure -> Fireteam Ops only
```

Browser smoke on local `https://localhost:4111`:

- `/weapon/3066945855` showed a `Version` menu with exactly `Pantheon` and `King's Fall`.
- Selecting `King's Fall` changed the URL to `/weapon/431721920` and swapped to the King's Fall perk pool (`Ensemble`, `Hip-Fire Grip`, `Pugilist`, etc.).
- `/weapon/334964261` (`Kindled Orchid`) showed no version selector.
- `/weapon/2511482352` (`Cynosure`) showed no version selector.

---

## Files changed

```text
apps/web/components/home-search.tsx
apps/web/components/weapon-detail-modal.tsx
apps/web/components/weapon-detail.tsx
packages/destiny/src/index.ts
packages/destiny/src/weapon-variants.test.ts
packages/destiny/src/weapon-variants.ts
```

This handoff doc was added after implementation:

```text
docs/weapon-version-selector-handoff.md
```

---

## Notes and follow-ups

- No commit has been created.
- `apps/web/public/data/weapons.json` is gitignored; the local browser/manual QA used the generated data present on this machine.
- The selector uses exact weapon name grouping. Adept/Harrowed names remain separate, e.g. `Zaouli's Bane (Harrowed)` is not grouped with base `Zaouli's Bane`.
- The helper fingerprints roll columns and ignores the intrinsic column. If Bungie ships two active definitions with the same traits but different intrinsic-only behavior, this helper would collapse them.
