# Owned armor vault search — plan

**Updated:** 2026-06-09  
**User priority:** Fast search, fast results, smooth scrolling in armor mode. **Not** new filter dimensions beyond **Location**.

**UX constraint:** Keep command palette + chips. No layout redesign.

**Out of scope (explicit):** Mod filters, slot, rarity, type, owner character ID, stat-threshold chips, owned weapon vault, DIM query strings.

**Keep as-is:** Stat bars in results (`ArmorStatsSubtitle` on Armor 3.0 pieces) — user likes showing stats; no change required unless perf tuning touches that component.

---

## What exists today

1. Sign in → `/?mode=armor` → `GET /api/armor` → cached in `use-owned-armor.ts`.
2. Palette categories: Class, Set bonus, Archetype, Tertiary stat, Tunable stat.
3. Text search: `searchOwnedArmor` + fuse over name/class/set/archetype/stats labels.
4. Results: `ArmorResultRow` — icon, name, **stat subtitle**, Equip / Move buttons.
5. Cap: 50 results default, 200 max (`MAX_SHOW_ALL`).

---

## Only new filter: Location

Add one palette category:

| Category id | Label | Chip values |
|-------------|-------|-------------|
| `location` | Location | Vault, On character, Equipped |

Maps to `OwnedArmorItem.location`: `vault` | `inventory` | `equipped`.

**Touch:**

- `packages/destiny/src/owned-armor-search.ts` — `OwnedArmorFilters.location`, `filterOwnedArmor`, `collectOwnedArmorFacets`
- `apps/web/lib/palette/armor-categories.ts`
- `packages/destiny/src/owned-armor-search.test.ts`

**Do not** add mods/slot/rarity/type/ownerCharacterId to search, fuse keys, or facets.

---

## Performance — primary focus

Armor rows are **heavier** than weapon rows (stat subtitle + two action buttons + images). The palette **does not virtualize** result lists — it renders up to 200 DOM rows (`packages/ui/.../palette-list.tsx`).

### Likely bottlenecks

| Area | File | Issue |
|------|------|--------|
| Search on main thread | `use-armor-search-results.ts` | `filterOwnedArmor` + fuse every deferred query change |
| Preview while typing | same | Multiple `filterOwnedArmor` + `searchOwnedArmor` per keystroke when inline suggestions fire |
| Facet rebuild | `buildArmorCategories(owned)` | Full `collectOwnedArmorFacets` scan when `owned` reference changes |
| Fuse rebuild | `createOwnedArmorFuse(owned)` | Rebuilt when `owned` array updates |
| Result DOM | `palette-list.tsx` | No virtualization; armor rows taller than weapons |
| Row render | `armor-result-row.tsx` | `ArmorStatsSubtitle`, dual buttons, Next `Image` per row |

### Recommended work (ordered)

#### 1. Profile first

Chrome DevTools → Performance, 6× CPU throttle, armor mode:

- Type in palette with chips active
- Scroll results list with 50–200 items
- Note long tasks >50ms

#### 2. Preview path (quick wins)

`apps/web/hooks/use-armor-search-results.ts` — mirror weapon optimizations:

- Cap preview filter passes (Firefox already has lower limits in `constants.ts`; consider uniform cap)
- Skip preview when query unchanged (stable chip hash)
- Avoid re-running full `searchOwnedArmor(owned, …)` when only chip suggestions change — filter from current result set when possible

#### 3. Memoize facets + fuse

- Cache `collectOwnedArmorFacets(owned)` keyed by `owned.length` + stable signature (or compute once in `use-owned-armor` after fetch)
- Only rebuild `armorFuse` when owned armor actually changes, not on unrelated parent re-renders

#### 4. Virtualize armor results (if scroll janks)

Weapons use `VirtualizedWeaponGrid` on perk pages; **palette results do not**.

Options (pick smallest that fixes scroll):

- Add optional virtualized results mode to `PaletteList` when `results.length > N`
- Or armor-specific slimmer row variant for list density (keep stats subtitle; defer button layout cost)

#### 5. Row-level perf

- Confirm `ArmorResultRow` stays `memo`'d with stable `actionState` references
- `ArmorStatsSubtitle` — avoid unnecessary re-renders; keep stat display
- Consider lazy-loading Bungie icons for off-screen rows if virtualizer added

#### 6. Worker (optional)

If main-thread search still blocks after 1–4: move `filterOwnedArmor` + fuse search to shared worker (same pattern as weapon catalog plan in `destiny-report-research.md`). Armor lists are usually smaller than manifest — try steps 2–4 first.

#### 7. API / payload (optional)

`GET /api/armor` still returns `rolledMods` for display if needed elsewhere — **do not** index or search them. If payload size matters, mods could be stripped from API later (separate decision; not required for search perf).

---

## Code map

```
Search
  packages/destiny/src/owned-armor-search.ts
  apps/web/hooks/use-armor-search-results.ts
  apps/web/lib/palette/armor-categories.ts

Data
  apps/web/lib/use-owned-armor.ts
  apps/web/app/api/armor/route.ts
  apps/web/lib/bungie-profile.ts

UI
  apps/web/components/home-search.tsx
  apps/web/components/armor-result-row.tsx
  apps/web/components/armor-stats-subtitle.tsx
  packages/ui/src/components/command-palette/palette-list.tsx

Constants
  apps/web/lib/palette/constants.ts
```

---

## Suggested first task for agent

1. Add **Location** chip filter (small, user-approved).
2. Profile armor palette; implement preview caps + facet/fuse memoization.
3. If scroll still janks at 50+ results → virtualize palette results or slim row render path.

---

## Verify

```bash
pnpm --filter @repo/destiny exec vitest run src/owned-armor-search.test.ts
pnpm typecheck
```

Manual: sign in, armor mode, filter Location: Vault, scroll 50+ results, type with chips — no visible stutter.

---

## Non-goals

- Mod / slot / rarity / type / character filters
- Stat threshold search chips (stats **display** in rows is fine)
- Owned weapon vault
- Palette UX redesign
