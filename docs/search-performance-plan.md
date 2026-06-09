# Plan: instant-feeling search & smarter suggestions

Goal: when a user is typing to find a weapon, a perk, or (eventually) armor, the
UI should feel **instant** — every keystroke updates suggestions and previews
with no perceptible lag — and the **predictions should be smart**: the right
thing on top, typo-tolerant, ranked by what people actually look for.

This doc is the result of (a) auditing how we ingest Bungie data and run search
today and (b) studying how [d2foundry](https://d2foundry.gg) (the reference
weapon-roll explorer) solves the same problem. It proposes a phased set of
improvements with concrete success criteria, ordered by impact-per-effort.

---

## 1. How we work today (audit)

### Ingestion (`packages/destiny/src`)

`pnpm generate` downloads 8 Bungie manifest slices, flattens them, and writes
three gitignored files under `apps/web/public/data/`:

| File | Shape | Consumer |
| --- | --- | --- |
| `weapons.json` | `WeaponIndex` — `WeaponSummary[]` + **interned** global `perks[]` + `weaponsByPerkName` reverse index | client (browse/search) + server (SSR) |
| `weapons-detail.json` | `WeaponDetailIndex` — screenshot/flavor/stats per hash + shared `statGroups` | client (lazy, ~1.5s after load) + server |
| `armor.json` | `ArmorIndex` — `ArmorDoc[]` with **inline (non-interned)** perk pools | server only (`bungie-profile.ts`) |

Good things already in place:

- **Weapon perk interning** (`intern-weapons.ts`) — perks live once in a global
  pool; columns store `perkIndices`. `perksLower` is stripped on disk and
  re-derived at load (`stripPerksLowerReplacer`).
- **Browse/detail split** — heavy fields (screenshots, stats) are deferred to a
  second file so the first paint payload is smaller.
- **Build-time reverse index** — `weaponsByPerkName` is precomputed.

Gaps:

- The browser `fetch`es the **entire** `weapons.json`, then the **entire**
  `weapons-detail.json` — no sharding, no streaming, no precompression strategy
  we own. Parsing the whole `WeaponIndex` to JS objects on the main thread is a
  fixed up-front cost before search is usable.
- **Armor is not interned and not split.** Each `ArmorDoc` repeats full
  `PerkRef` objects (name + description + icon) per column per piece across
  thousands of pieces. There is no client-side armor *catalog* search at all —
  only owned-armor search via `/api/armor`.
- The Fuse index is **built in the browser on load** (`createWeaponFuse`), not
  shipped prebuilt.

### Search & suggestions

- `packages/destiny/src/search.ts` — pure functions over `WeaponSummary[]`:
  `filterWeapons` (faceted AND/OR), `weaponsWithPerk` (reverse lookup),
  `filterWeaponNames` + `suggestWeaponNames` (substring rank ladder from
  `@repo/search-rank`), `createWeaponFuse` (fuse.js, `threshold: 0.3`,
  `keys: name×3, type, perks`), `rankWeaponResults` (pin name matches, then sort).
- UI: `CommandPalette` (`@repo/ui`) → `useHomeSearchPaletteState` →
  `usePaletteInlineSuggestions` (`scanValueSuggestions`) and
  `useWeaponSearchResults`. **No debounce, no web worker.** Responsiveness comes
  from `useDeferredValue`, result caps (`MAX_RESULTS = 50`), and Firefox-specific
  DOM tweaks.

Gaps:

- **All search runs on the main thread.** On a full manifest (thousands of
  weapons), `filterWeapons` / `filterWeaponNames` / `fuse.search` per keystroke
  can jank on slower devices — deferral hides it but doesn't remove it.
- `filterWeaponNames` **rebuilds a name→count `Map` on every call**, and
  `weaponsMatchingTextQuery` does `weapons.filter(...)` **once per matched name**
  (O(n × matches)). Both run on every keystroke.
- Inline suggestions call `category.getValues(q)` for **every category on every
  keystroke** — perk categories do linear substring scans of the full perk-name
  list, with a fuse fallback.
- **Suggestion ranking ignores real popularity.** We track `trackWeaponView` /
  `trackPerkCommit` in Redis, but that only feeds the "Popular lately" home
  module — **not** the autocomplete ordering. Suggestions rank by match-rank →
  *catalog* count (how many weapons share a name/perk, usually 1) → alpha.
- **No typo tolerance in the inline list.** Inline suggestions are capped at
  `maxRank: 2` (prefix / word-boundary), so a single typo drops the suggestion
  entirely; fuzzy only shows up in committed results and ghost completion.
- `FUSE_PRE_LIMIT = 300` is defined but unused (dead constant).

---

## 2. What d2foundry does (and what to borrow)

Source: [`d2foundry/search`](https://github.com/d2foundry/search) (the package
behind their site) + `oracle_engine`.

1. **Flat, denormalized "search DB item" per weapon.** Each weapon is reduced at
   build time to a single record with every searchable field already resolved:
   `adept, ammo, craftable, energy, event, foundry, frame, name, perk[],
   rarity, rpm, season, slot, source, sunset, trait_1[], trait_2[], weapon,
   zoom` + metadata (`hash, iconSrc, watermarkSrc`). One record, all facets — no
   per-query socket walking.
   - *Borrow:* this is essentially our `WeaponSummary` plus more facets
     (`rpm`, `zoom`, `source`, `event`, `foundry`, `sunset`). The schema is a
     clean target for a **keyword query language** (below).
2. **Resolver pattern** (`formatToDb` at build / `getFromDb` at query). Each
   facet is one small declarative resolver. Easy to add a facet without touching
   the flattener.
3. **`lz-string` compression** of the index — compressed on the server/build,
   decompressed on the client. Smaller payload over the wire **and** a smaller
   string to hold before parse.
4. **Keyword query syntax** — `perk:rampage`, `is:adept`, `trait_1:...`,
   `rpm:>600`, `season:23`. Power users filter precisely; the parser maps tokens
   to the flat schema.
5. **Deterministic multi-key sort** — sunset last, then **fuse score**, then
   rarity priority (Legendary > Exotic > rest), then newest season. Predictable,
   not just "whatever fuse returned".
6. **WASM (`oracle_engine`)** for stat/DPS math. *Not* search-related — out of
   scope here, but confirms heavy compute is pushed off the hot path.

What we already do **better/equivalently:** perk interning (they denormalize),
a browse/detail split, and a `@repo/search-rank` substring ladder that is more
deliberate than relying on fuse alone.

---

## 3. Proposed improvements

Three tracks. Each phase is independently shippable and additive.

### Track A — make the data instantly usable (load & parse)

**A1. Ship a prebuilt search index, don't build it in the browser.**
`createWeaponFuse` rebuilds the Fuse index from scratch on every cold load.
Fuse supports `Fuse.createIndex` + `Fuse.parseIndex`: build the index at
`generate` time, serialize it next to `weapons.json`, and on the client do
`new Fuse(weapons, options, parsedIndex)`. Removes the largest one-time main-
thread cost before search is ready.
- *Verify:* measure time from `weapons.json` loaded → first usable search; index
  build no longer appears in a profile of cold load.

**A2. Own the compression of the static payload.**
Pre-generate `.br`/`.gz` siblings of `weapons.json` / `weapons-detail.json` at
build (or confirm Vercel already brotli-serves them) and/or adopt d2foundry's
`lz-string` approach for the largest file. Goal is fewer bytes over the wire and
less to parse.
- *Verify:* transferred size of the data files drops materially; documented in
  `generate` output.

**A3. Intern + split armor like weapons, and add a client armor catalog index.**
Apply `intern-weapons.ts`'s technique to `build-armor-index.ts`: global perk/mod
pool + `armorByModName` reverse index, and split heavy fields into
`armor-detail.json`. Then the home page can offer **catalog** armor search
(not just owned), reusing the existing `filterArmor` / `fuzzySearchArmor` in
`@repo/destiny`.
- *Verify:* `armor.json` shrinks; a client armor search path exists with parity
  to weapon search.

### Track B — never block the main thread (instant typing)

**B1. Build a prefix structure for name/perk autocomplete.**
Replace the per-keystroke `Map` rebuild in `filterWeaponNames` with a structure
built **once** per `weapons` load: a sorted name array (binary-search the prefix
range) or a small trie, plus a precomputed `name→count`. Autocomplete then
becomes a range scan instead of a full O(n) pass that re-allocates a Map every
keystroke.
- *Verify:* a microbenchmark shows name-suggestion time per keystroke is
  constant-ish vs. catalog size; `search.test.ts` suggestion tests still pass.

**B2. Reduce `weaponsMatchingTextQuery` from O(n × matches) to O(n).**
Group weapons by name once (reuse B1's structure) so we append by name lookup
instead of `weapons.filter(...)` per matched name.
- *Verify:* same result ordering as today (covered by existing tests), fewer
  passes in a profile.

**B3. Move full-result filtering/fuse into a Web Worker.**
Keep `useDeferredValue` for previews, but run `filterWeapons` + `fuse.search` +
`rankWeaponResults` for the **committed result list** in a worker (Comlink or a
thin `postMessage` wrapper), posting back capped results. Inline suggestions
(small, prefix-based after B1) can stay synchronous on the main thread.
- *Verify:* main-thread long-task profile during fast typing shows no blocking
  search work; results still arrive within one frame of settling.

**B4. Cache results by query (incremental narrowing).**
Small LRU keyed by normalized query + active facets; when the query only grows
(`fat` → `fate`), filter the previous result set instead of the whole catalog.
- *Verify:* repeated/growing queries hit the cache (instrument a counter in dev).

### Track C — smarter predictions

**C1. Feed real popularity into suggestion ranking.**
We already persist `trackWeaponView` / `trackPerkCommit` counts. Export a compact
popularity map (build-time snapshot and/or a cached `/api/popularity` read) and
add it as a ranking signal in `scanValueSuggestions` / `suggestWeaponNames`,
*after* match-rank but *before* the current catalog-count tiebreak. So among
equally-good prefix matches, the weapon/perk people actually open wins.
- *Verify:* given a tie in match rank, the higher-popularity item sorts first
  (unit test with a stubbed popularity map).

**C2. Typo tolerance + aliases in the inline list.**
Allow a bounded fuzzy fallback in inline suggestions (raise the effective
`maxRank` only when there are too few prefix hits, mirroring `suggest.ts`'s
perk behavior) and add a small **alias table** for common community nicknames
/ abbreviations (e.g. shortenings, "void" ↔ damage type) that maps to canonical
names before ranking.
- *Verify:* a one-character typo on a popular weapon still surfaces it; alias
  inputs resolve to the canonical suggestion (unit tests).

**C3. Adopt a structured keyword query language (d2foundry-style).**
Extend our facet schema toward d2foundry's (`rpm:`, `zoom:`, `source:`,
`event:`, `foundry:`, `is:adept`, `is:craftable`, range operators) and parse
typed tokens into existing `WeaponFilters`. This makes power-user search exact
and fast (no fuzzy needed) and gives the palette richer chip suggestions.
- *Verify:* `perk:`, `is:adept`, `rpm:>600` etc. parse to the right filters and
  return the same set as the equivalent facet chips (unit tests).

**C4. Deterministic result sort, popularity-aware.**
Layer a d2foundry-style tiebreak into `rankWeaponResults` (after name-match
pinning): popularity desc → rarity priority → newest season, so "show all" and
text results have a stable, sensible order beyond raw fuse score.
- *Verify:* documented sort order; snapshot test on a fixture set.

---

## 4. Suggested sequencing

1. **Track B (B1, B2)** — biggest responsiveness win for least risk; pure
   functions in `@repo/destiny`, fully unit-testable, no payload/format change.
2. **A1 (prebuilt Fuse index)** — removes the cold-load stall; small build change.
3. **C1 + C2** — "smarter" predictions users feel immediately; needs the
   popularity export plumbed in.
4. **B3 (worker)** — larger structural change; do it once B1/B2 prove where the
   remaining main-thread cost is.
5. **C3 (keyword language)** and **A3 (armor catalog)** — feature-expanding,
   schema-touching; sequence after the core is fast.
6. **A2, B4, C4** — polish/optimization once the above land.

## 5. Risks & notes

- **Format changes are dual-consumer.** `weapons.json` is read both client-side
  (`weapons-context.tsx`) and server-side (`weapon-index-server.ts`). Any shape
  change (interned armor, prebuilt index, compression) must update both readers
  and the `search.test.ts` round-trip (`perksLower` strip/re-derive pattern is
  the template).
- **Keep the static-CDN property.** Today public search needs no server. Workers,
  prebuilt indexes, and compression preserve that; a popularity *snapshot* baked
  at build keeps C1 CDN-friendly (live `/api/popularity` is an enhancement, not a
  hard dependency).
- **Don't regress correctness for speed.** Every Track B/C change should keep the
  existing `@repo/destiny` and `@repo/ui` search tests green and add new ones for
  the new behavior (Karpathy: write the verifying test, then make it pass).
- **Measure first.** The data files are gitignored and absent in a fresh clone,
  so real weapon/armor counts and payload sizes need a `generate` run with a
  `BUNGIE_API_KEY`. Capture baseline numbers (file sizes, cold-load timing,
  per-keystroke timing) before optimizing so each phase has a before/after.
