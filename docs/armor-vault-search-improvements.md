# Owned armor vault search — improvements plan

**Created:** 2026-06-09  
**Priority:** User cares about **searching owned armor** (vault + characters + equipped). **Owned weapon rolls are out of scope.**

**UX constraint:** Same command palette + chip model as today (`?mode=armor` on `/`). No new layouts or query languages.

**Relation to destiny.report research:** That work targets the **manifest weapon catalog** only. destiny.report has no armor or vault features. Performance patterns (worker, deferred search) may apply to armor later if lists grow large; the main wins here are **new filter fields** on data we already fetch.

---

## What exists today

### Flow

1. User signs in (Bungie OAuth) → armor mode on home page.
2. `GET /api/armor` (`apps/web/app/api/armor/route.ts`) calls `getOwnedArmor()` in `bungie-profile.ts`.
3. Profile components: vault (`profileInventory`), character inventories, equipped gear.
4. Each piece is joined with `armor.json` for definitions + Armor 3.0 roll data (set, archetype, stats, mods).
5. Client caches in `use-owned-armor.ts`; search runs in `use-armor-search-results.ts`.

### Palette categories (armor mode)

| Category | Field | Notes |
|----------|-------|-------|
| Class | `classType` | Titan / Hunter / Warlock |
| Set bonus | `setName` | Armor 3.0 only in facet counts |
| Archetype | `archetype` | Armor 3.0 only |
| Tertiary stat | `tertiaryStat` | Armor 3.0 only |
| Tunable stat | `tunableStat` | Armor 3.0 only |

### Text search (`searchOwnedArmor`)

Fuse + `matchRank` over: `name`, `classType`, `setName`, `archetype`, `tertiaryStat`, `tunableStat`.

### Actions

Equip / move from vault — `ArmorResultRow` + `/api/armor/equip`, `/api/armor/transfer`.

---

## Gaps (data already on `OwnedArmorItem`, not searchable)

From `apps/web/lib/armor-types.ts` and API mapping:

| Field | Example values | Search value |
|-------|----------------|--------------|
| `rolledMods[]` | `{ name: "Harmonic Siphon", … }` | **High** — "which pieces have X mod?" |
| `slot` | Helmet, Gauntlets, Chest, Legs, Class Item | **High** — slot-specific farming |
| `location` | `vault` \| `inventory` \| `equipped` | **High** — vault-only view |
| `rarity` | Legendary, Exotic | Medium |
| `stats[]` | `{ name: "Mobility", value: 18 }` | **High** — stat threshold builds |
| `type` | Duplicate of slot label in practice | Low (redundant with slot) |
| `ownerCharacterId` | Bungie character id | Medium — "on my Hunter" needs character list |

**Known doc/code mismatch:** AGENTS.md notes mods are returned but not in search/palette — still true.

---

## Recommended improvements (phased)

### Phase A — Mod filter (highest user value)

**Goal:** Chip category **Mod** — piece must roll **all** selected mods (AND), matching weapon multi-perk behavior.

**Touch:**

- `packages/destiny/src/owned-armor-search.ts`
  - Extend `OwnedArmorSearchItem` with `modNames?: string[]` (lowercased names at map time, or compute in filter)
  - Extend `OwnedArmorFilters` with `mods?: string[]`
  - `filterOwnedArmor`: require every selected mod name ∈ piece's rolled mod names
  - `collectOwnedArmorFacets`: new `mods` facet from union of all `rolledMods[].name` across owned set
  - `createOwnedArmorFuse` / `armorSearchFields`: add mod names to fuse keys and text rank
- `apps/web/lib/palette/armor-categories.ts` — `perkCategory`-style mod picker (reuse pattern from weapon perks)
- `apps/web/lib/armor-types.ts` — ensure client maps mods consistently (already does)
- `packages/destiny/src/owned-armor-search.test.ts` — AND mod filter, facet counts

**Palette:** New category id `mods`, label **Mod**, `getValues` searches mod names from facets.

**Verify:** Sign in, chip `Mod: Harmonic Siphon`, only matching pieces; two mod chips = AND.

---

### Phase B — Slot, location, rarity

**Goal:** Common inventory questions without text search.

**Touch:** same files as Phase A.

| Category id | Label | Filter field |
|-------------|-------|--------------|
| `slot` | Slot | `slot` |
| `location` | Location | `location` — chips: Vault, On character, Equipped |
| `rarity` | Rarity | `rarity` |

**Display labels for location chips:**

| `location` value | Chip label |
|------------------|------------|
| `vault` | Vault |
| `inventory` | On character |
| `equipped` | Equipped |

**Verify:** Vault-only chip shows only `location === "vault"`; equip/transfer still works on results.

---

### Phase C — Stat threshold chips (Armor 3.0)

**Goal:** Find pieces with e.g. Mobility ≥ 20, Resilience ≥ 10.

**Options (pick one in implementation):**

1. **Per-stat category** — chip `Mobility ≥ 20` (numeric picker or preset buckets)
2. **Single "Stat" category** — two-step: pick stat name, then threshold bucket

**Touch:**

- Extend `OwnedArmorSearchItem` / filters with `statMin?: Record<string, number>` or `statThresholds?: { stat: string; min: number }[]`
- `filterOwnedArmor`: for Armor 3.0 pieces, compare `stats[]`; legacy armor skips or fails stat filters
- Facets: only offer stats that appear on owned Armor 3.0 pieces

**Open question:** Buckets (`≥10`, `≥15`, `≥20`) vs free numeric input — buckets match existing facet chip UX.

**Verify:** Tests with fixture stats; in-game spot-check one high-stat roll.

---

### Phase D — Character / class location (optional)

**Goal:** "Equipped on Hunter" vs "Hunter armor in vault".

**Needs:**

- Expose character class per `ownerCharacterId` (API could add `ownerClassType` when `location !== "vault"`)
- Or chip **Class** already filters armor class — combine with **Location: Equipped**

Lower priority than A–C unless user asks.

---

### Phase E — Performance (only if needed)

Armor list size is typically hundreds of instances, not thousands of manifest rows. Unlikely to need WASM trigram.

If profiling shows lag (large vaults + preview loop):

- Mirror weapon preview caps in `use-armor-search-results.ts` (already similar structure)
- Optional: run `filterOwnedArmor` + fuse in shared search worker alongside weapons

**Skip until user reports sluggish armor palette.**

---

## Code map

```
Server
  apps/web/lib/bungie-profile.ts       # getOwnedArmor, profile + armor.json join
  apps/web/app/api/armor/route.ts      # JSON shape → OwnedArmorItem

Client data
  apps/web/lib/use-owned-armor.ts      # fetch + module cache
  apps/web/lib/armor-types.ts          # OwnedArmorItem

Search engine
  packages/destiny/src/owned-armor-search.ts   # filter, search, facets, fuse
  apps/web/hooks/use-armor-search-results.ts   # palette results + preview
  apps/web/lib/palette/armor-categories.ts     # buildArmorCategories
  apps/web/lib/palette/weapon-filters.ts       # chipsToArmorFilters

UI
  apps/web/components/home-search.tsx          # armor mode toggle
  apps/web/components/armor-result-row.tsx     # row + equip/transfer
```

---

## Explicit non-goals

- Owned **weapon** vault search (`docs/vault-search-plan.md`) — user does not want this
- Public browse of full armor catalog (`armor-search.ts` exists in package; no web UI)
- DIM-style query strings
- Changing palette interaction model

---

## Suggested first task

**Phase A (mod filter)** — data is already on every piece; highest impact for vault armor theorycrafting.

Then **Phase B** (slot + location + rarity) in the same PR or follow-up.

---

## Verify checklist

```bash
source scripts/ensure-cloud-env.sh
pnpm --filter @repo/destiny exec vitest run src/owned-armor-search.test.ts
pnpm typecheck
```

Manual (requires Bungie dev app + `.env`):

1. Sign in → armor mode
2. Add mod chip → results match equipped/vault mods
3. Add Location: Vault → only vault pieces
4. Equip / move still works on filtered row
