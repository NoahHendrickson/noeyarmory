---
name: code-to-figma
description: >-
  Push noeyarmory UI from code into Figma with pixel-accurate captures (not
  hand-drawn frames). Use when the user asks to generate, sync, or update Figma
  designs from React components, Storybook stories, dialogs, modals, or any
  code→Figma / code-to-canvas workflow in this repo.
---

# Code → Figma (noeyarmory)

**Goal:** Figma output must match the running UI 1:1 — fonts (Geist), tokens, spacing, component behavior.

**Default method:** `generate_figma_design` (html-to-design capture). **Do not** hand-build dialogs with `use_figma` + guessed colors/fonts unless capture is impossible.

Also load Figma skills before MCP calls: `figma-generate-design`, `figma-use`.

---

## Hard rules (what went wrong before)

| Wrong | Right |
|-------|-------|
| Reconstruct UI in Figma with Inter + hex colors | Capture live DOM from Storybook or `/design/*` |
| Capture through `AppShell` (shader toggle, feedback trigger, etc.) | Render on an isolated surface with no app chrome |
| One capture ID for multiple states | One capture ID per state/page |
| Stop polling after 1–2 `pending` responses | Poll every 5s until `completed` (up to 10+ tries) |
| `use_figma` `layoutPositioning: ABSOLUTE` on non-auto-layout parents | Let capture handle layout |
| Move routes without fixing `../` imports | Update relative imports after `(app)/` moves |

---

## Pre-flight checklist

Copy and complete before any Figma write:

```
- [ ] Component source read (props, variants, states)
- [ ] All visual states listed (e.g. form/bug, form/feature, success, trigger)
- [ ] Isolated capture surface exists (Storybook story and/or /design route)
- [ ] Capture props on component if needed (defaultOpen, hideTrigger, etc.)
- [ ] Dev server running (Storybook :6006 or web :4111)
- [ ] Target Figma fileKey + nodeId from user URL
- [ ] Old hand-built frames in target node cleared before new captures
- [ ] One generate_figma_design capture ID per state
```

---

## Step 1 — Prepare the component for capture

### Where components live

- Shared UI: `packages/ui/src/components/`
- App-only wiring stays in `apps/web/`; prefer moving capture-worthy components to `@repo/ui` if they only depend on `@repo/ui`.

### Capture-friendly props (pattern)

Add optional defaults so stories/routes can force state without clicks:

```tsx
export interface MyDialogProps {
  defaultOpen?: boolean;
  defaultType?: "bug" | "feature";
  defaultSubmitState?: "idle" | "success";
  hideTrigger?: boolean;
}
```

### Storybook stories (`packages/ui`)

- File: `*.stories.tsx` next to the component
- `parameters: { layout: "fullscreen" }`
- Decorator: `bg-background min-h-screen flex items-center justify-center`
- One story per Figma state (e.g. `FormBug`, `FormFeature`, `Success`, `Trigger`)
- Story IDs: `curl -s http://localhost:6006/index.json` → `components-<name>--<story>`

### Design capture routes (`apps/web`)

For HTTPS/Geist parity with production:

```
apps/web/app/design/<feature>/page.tsx   # no AppShell
apps/web/app/design/layout.tsx           # passthrough only
apps/web/app/(app)/layout.tsx            # AppShell — main app only
apps/web/app/layout.tsx                  # html/body/globals only
```

Query-param states example: `/design/feedback?state=bug|feature|success|trigger`

**Never** wrap `/design/*` in `AppShell`.

---

## Step 2 — Start dev servers

```bash
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 24
export PATH="$NVM_DIR/versions/node/$(nvm version)/bin:$PATH"

# Storybook (preferred for component isolation)
pnpm --filter @repo/ui storybook    # http://localhost:6006

# Or web design routes (Geist + HTTPS)
pnpm --filter web dev               # https://localhost:4111
```

Storybook may fail in sandbox (`uv_interface_addresses`) — rerun with full permissions.

Verify the page in a browser **before** capturing (no build errors, no extra chrome).

---

## Step 3 — Capture to Figma

### 3a. Clear the target frame

```js
// use_figma: remove children of target node, keep frame for layout
```

### 3b. Generate capture IDs

Call `generate_figma_design` once per state with `fileKey` + optional `nodeId` (parent frame in Figma).

Parse URL: `figma.com/design/:fileKey/...?node-id=1-494` → `nodeId: "1:494"`

### 3c. Open each state with capture hash

**Storybook iframe (no manager chrome):**

```
http://localhost:6006/iframe.html?id=components-feedbackdialog--form-bug&viewMode=story
```

**Web design route:**

```
https://localhost:4111/design/feedback?state=bug
```

Append hash (replace `CAPTURE_ID`):

```
#figmacapture=CAPTURE_ID&figmaendpoint=https%3A%2F%2Fmcp.figma.com%2Fmcp%2Fcapture%2FCAPTURE_ID%2Fsubmit&figmadelay=3000
```

### 3c-manual. Show the “Send to Figma” toolbar (human-in-the-loop)

The floating toolbar (**Send to Figma**, **Entire screen**, **Select element**, **Open file**) only appears when:

1. A **capture ID** exists (`generate_figma_design` was called for that session).
2. The page loads **`capture.js`** with the **full hash** on the URL (not hash added after the fact on a stale tab).
3. You open the URL in a **normal browser** (Chrome/Safari/Firefox) — **not** Cursor’s embedded browser and **not** agent CDP auto-capture.

**Do this:**

```bash
# 1. Agent (or you via MCP) gets a capture ID for the target Figma file/frame.

# 2. Open in YOUR default browser (macOS):
open "https://localhost:4111/design/feedback?state=bug#figmacapture=CAPTURE_ID&figmaendpoint=https%3A%2F%2Fmcp.figma.com%2Fmcp%2Fcapture%2FCAPTURE_ID%2Fsubmit&figmadelay=3000"
```

Wait ~2–3s after load. A toolbar should pin to the top of the page.

- Click **Entire screen** (or **Send to Figma**) to push layers to the file tied to that capture ID.
- Click **Select element** to capture one node; add `&figmaselector=*` to the hash for a picker UI.
- Tell the agent to **poll** the same `captureId` until `completed`.

`/design/*` routes include `FigmaCaptureHelper`, which injects `capture.js` when the hash contains `figmacapture=`.

**If the toolbar still doesn’t show:**

- Hard-refresh the tab (hash must be present on first navigation).
- Accept the localhost HTTPS cert at `https://localhost:4111` before capturing.
- Confirm `capture.js` isn’t blocked (ad blocker, corporate proxy).
- Do **not** use agent `browser_cdp` / `captureForDesign` if you want the toolbar — that bypasses it.

**Ad-hoc bookmarklet** (any page, clipboard mode — no capture ID):

```text
javascript:(function(){var s=document.createElement('script');s.src='https://mcp.figma.com/mcp/html-to-design/capture.js';document.head.appendChild(s);setTimeout(function(){if(!location.hash.includes('figmacapture'))location.hash='figmacapture&figmadelay=1000';},500);})();
```

Save as a bookmark → click on a running page → toolbar appears → **Copy to clipboard** → paste in Figma.

### 3d. Poll until complete

```
generate_figma_design({ fileKey, captureId })
```

Wait 5s between polls. Status must be `completed` before starting the next state.

### 3e. If capture stays `pending`

1. Confirm dev server serves the correct page (screenshot/snapshot).
2. Re-open URL with hash, or inject via browser CDP:

```js
fetch('https://mcp.figma.com/mcp/html-to-design/capture.js')
  .then(r => r.text())
  .then(s => { const el = document.createElement('script'); el.textContent = s; document.head.appendChild(el); });

window.figma.captureForDesign({
  captureId: 'CAPTURE_ID',
  endpoint: 'https://mcp.figma.com/mcp/capture/CAPTURE_ID/submit',
  selector: 'body',
});
```

---

## Step 4 — Verify

1. `get_screenshot` on the Figma parent frame (`nodeId` from user).
2. Compare to browser screenshot — typography, green primary `#58c26c`, popover `#242322`, segmented toggle, dialog shadow.
3. If wrong: re-capture that state only (new capture ID). Do not patch with hand-drawn layers.

---

## When to use `use_figma` after capture

- Rename/reorder captured frames in the target section
- Delete duplicate or failed captures
- **Not** for initial 1:1 recreation of web components

---

## noeyarmory reference: FeedbackDialog

| State | Storybook ID | Design URL |
|-------|----------------|------------|
| Trigger | `components-feedbackdialog--trigger` | `?state=trigger` |
| Bug form | `components-feedbackdialog--form-bug` | `?state=bug` |
| Feature form | `components-feedbackdialog--form-feature` | `?state=feature` |
| Success | `components-feedbackdialog--success` | `?state=success` |

Source: `packages/ui/src/components/feedback-dialog.tsx`  
Figma section: frame `4:2` in file `PVcnjsdYMCdxQKPoUfr7Ak` (user may provide a different target).

---

## New component checklist (first time)

1. Add component to `@repo/ui` (or ensure app component is capturable).
2. Add optional `defaultOpen` / `hideTrigger` (or equivalent) props.
3. Add `*.stories.tsx` with one story per Figma artboard.
4. Add `apps/web/app/design/<name>/page.tsx` with `?state=` variants.
5. Confirm `app/(app)/` vs `app/design/` layout split (no AppShell on design).
6. Run capture workflow above.
