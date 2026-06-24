# Weapon Detail Full-Screen Search Handoff

Date: 2026-06-22
Branch: `ux/weapon-details`

## Goal

Change weapon detail UX so selecting a weapon opens a full-screen weapon detail route instead of a modal. The weapon detail page should have a full-width app header with a search bar. Clicking that search bar, or pressing `F`, should open the command palette while staying on the weapon detail screen so users can start a new weapon search.

## Current Status

Implemented. The old search-result modal path has been replaced with route navigation to `/weapon/<hash>`, and the weapon detail route now has a sticky full-width header with `moonfang armory` plus the reusable weapon search palette.

No commit has been created.

## Main Changes

- `apps/web/components/weapon-search-palette.tsx`
  - New reusable weapon-only palette component extracted from the old weapon-mode portion of `HomeSearch`.
  - Owns weapon categories, chips, recents, custom filters, sort, pins, previews, result rows, and `onSelectWeapon`.

- `apps/web/components/home-search.tsx`
  - Simplified home search orchestration.
  - Weapon mode now renders `WeaponSearchPalette`.
  - Weapon result, pinned weapon, and popular weapon selections call `router.push("/weapon/<hash>")`.
  - Armor mode remains on the home page with its own reduced palette wiring.

- `apps/web/components/weapon-detail.tsx`
  - Added `WeaponDetailAppHeader`.
  - Header spans full width, links app title back home, and embeds `WeaponSearchPalette`.
  - Detail-page search selection routes to another `/weapon/<hash>` without leaving the detail experience.
  - Existing weapon detail layout and version selector behavior are preserved.

- `apps/web/components/weapon-detail-modal.tsx`
  - Removed. No remaining references to `WeaponDetailModal` or `weapon-detail-modal`.

- `packages/ui/src/components/command-palette/palette-input-bar.tsx`
  - Updated search bar click handling to call `onOpenPanel()` directly after focusing.
  - This makes clicking the search bar open the dropdown immediately, matching the requested detail-page behavior.

- `apps/web/hooks/use-armor-search-results.ts`
  - Typed the empty armor duplicate-diff fallback map to avoid unsafe assignment lint in the refactored home search path.

## Verification Performed

Passing:

```bash
pnpm --filter web typecheck
pnpm --filter @repo/ui typecheck
pnpm --filter @repo/ui exec eslint src/components/command-palette/palette-input-bar.tsx
```

Manual browser verification against `https://localhost:4111`:

- Home search selected a weapon and navigated to `/weapon/1684914716`.
- Detail page showed the full-width header with app title and search.
- Clicking the detail header search opened the command palette in place.
- Typing a new query and selecting a result navigated to another detail route, `/weapon/1802315656`.
- Pressing `F` on the detail page opened the header search palette.

## Known Caveats

Full lint still fails on pre-existing unrelated issues:

- `pnpm --filter web lint`
  - Missing `@next/next/no-img-element` rule references in `app-background.tsx` and `moonfang-screensaver.tsx`.
  - Existing `weapon-share-button.tsx` `no-misused-promises` issue.
  - Existing `use-cursor-copied-feedback.tsx` hook dependency warning.

- `pnpm --filter @repo/ui lint`
  - Existing Storybook story lint errors and warnings.
  - Existing `command-palette.tsx` warnings.

During browser automation, React reported a hydration warning caused by Cursor's injected `data-cursor-ref` attribute on the input. The dev server stack pointed at `palette-input-bar.tsx`, but the diff showed the injected attribute as the mismatch, not app-rendered markup.

## Local Dev Server

The user asked to run the app locally after implementation. A dev server was started with:

```bash
pnpm --filter web dev
```

It reported ready at:

```text
https://localhost:4111
```

## Suggested Next Steps

- Review the UI on desktop and narrow/mobile widths, especially the sticky header search width.
- Decide whether the home armor path should be further re-shared later; for this change it was kept scoped and functional.
- Fix the unrelated lint debt separately if full package lint needs to become a merge gate.
