# Handoff: Shader background performance investigation & optimizations

**Repo:** [NoahHendrickson/noeyarmory](https://github.com/NoahHendrickson/noeyarmory)  
**Branch:** `cursor/shader-perf-optimizations-9e02`  
**PR:** https://github.com/NoahHendrickson/noeyarmory/pull/33 (draft)  
**Commit:** `f7fe1c8` — `perf: lazy-load shader bundle and trim background GPU work`  
**Date:** 2026-06-08  
**Status:** Investigation complete; optimizations implemented on feature branch; PR open as draft

---

## Original request

User asked to explore whether the app's **"Pretty shader"** WebGPU background is having a significant impact on:

- UI smoothness
- GPU/CPU load for end users
- Whether enhancements could make it run smoother and lighter

---

## What the shader is

The app renders a decorative full-viewport WebGPU background behind the main UI shell.

| Piece | Location / detail |
|-------|-------------------|
| Toggle | Header → **"Pretty shader"** checkbox (`ShaderToggle`) |
| Preference state | `apps/web/lib/shader-preference.tsx` — localStorage key `noeyarmory-shader-background` |
| Background effect | `apps/web/components/shader-background.tsx` |
| Shell wiring | `apps/web/components/app-shell.tsx` wraps app in `ShaderPreferenceProvider` |
| Library | `shaders` npm package (`^2.5.129`) — React bindings at `shaders/react` |
| Effect stack | `ImageTexture` → `Group` → `FlowingGradient` + `Dither` |
| Texture | `/shaders/texture-primary.jpg` (~468KB, 1920×1080) |
| Render target | Fixed `position: fixed; inset: 0; opacity: 50%` behind UI (`z-0`) |

**Requirements for shader to run:**

1. User preference `enabled === true`
2. WebGPU supported (`navigator.gpu.requestAdapter()` succeeds)
3. Tab visible (`document.visibilitychange` handler)
4. Component mounted (client-only)

Design-capture routes under `app/design/*` intentionally omit AppShell (no shader).

---

## Investigation findings

### 1. Biggest problem: JS always loaded (before fix)

**Before this work:** `ShaderBackground` was **statically imported** in `app-shell.tsx`. That pulled ~**1.1MB of JS** (shaders core + Three.js WebGPU + related chunks) on **every page load**, even when the user had the shader toggled off.

Measured via Playwright against `https://localhost:4111/` (dev server):

| Scenario | Total JS loaded | Shader-specific JS | Canvas present |
|----------|-----------------|--------------------|----------------|
| Shader OFF (localStorage `false`) | ~1.1MB | **0 files** | No |
| Shader ON (localStorage `true`) | ~2.2MB | ~683KB | Yes |

Largest shader-related chunks when ON:

- `three/build/three.webgpu` (~416KB)
- `shaders/dist/core` (~202KB+)
- `shaders/dist/react` (barrel re-exports all components)

**After lazy-load fix:** OFF users no longer download shader/Three.js chunks at all.

### 2. Runtime smoothness (when enabled)

Headless Playwright profiling on the cloud VM (Chromium + WebGPU):

- **60fps** stable with and without shader on capable hardware
- Frame avg ~16.6ms, p95 ~16.7ms
- **0 janky frames** (>32ms) in 5-second samples
- No measurable long-task delta

**Caveat:** Cloud VM is not representative of low-end laptops, integrated GPUs, or mobile. Continuous full-screen WebGPU at 60fps can still affect battery/thermals on weaker devices.

### 3. GPU behavior (from `shaders` library internals)

When running, the library (`node_modules/shaders/dist/core/index.js`):

- Renders via **WebGPU** (Three.js WebGPURenderer)
- Requests `powerPreference: "high-performance"` on the GPU adapter
- Caps pixel ratio at `Math.min(devicePixelRatio, 2)` → up to 4× pixel count on Retina
- Runs continuous animation loop at up to **60fps** when visible
- Throttles to ~**1fps** when canvas is off-screen (IntersectionObserver)
- Pauses when tab hidden (app-level `visibilitychange` + library behavior)

### 4. Texture waste (before fix)

Previous `shader-background.tsx` included:

- 3 `ImageTexture` nodes (primary + 2 alts with `visible={false}`)
- Hidden `SineWave` node

**Important:** `ImageTexture` loads images via `TextureLoader` regardless of `visible` — invisible nodes still fetched ~1.2MB of JPGs. Only primary texture is needed now.

Unused files still in repo (safe to delete if confirmed unused elsewhere):

- `apps/web/public/shaders/texture-alt-1.jpg` (~227KB)
- `apps/web/public/shaders/texture-alt-2.jpg` (~489KB)

### 5. Safeguards already present (before this work)

- WebGPU probe before enabling (`probeWebGpu()` in shader-preference)
- User toggle persisted in localStorage
- Default off for `prefers-reduced-motion: reduce`
- Tab visibility pause in `shader-background.tsx`
- Toggle disabled with tooltip when WebGPU unavailable

### 6. Telemetry

The `Shader` root component sends sampled telemetry to Shader Effects Inc. on **non-localhost** production hosts (`isExternalUser()` in library). Not a major perf issue but privacy-relevant. Fixed in this PR with `disableTelemetry`.

---

## Changes implemented (PR #33)

### Files changed

```
apps/web/components/app-shell.tsx                — use ShaderBackgroundLoader instead of ShaderBackground
apps/web/components/shader-background-loader.tsx — NEW: dynamic import wrapper
apps/web/components/shader-background.tsx        — trim dead nodes, disableTelemetry, srgb
apps/web/lib/shader-preference.tsx               — default-off heuristics for save-data / low memory
```

### 1. Lazy-load shader bundle (`shader-background-loader.tsx`)

```tsx
// Only dynamic-imports shader-background when enabled AND webgpuSupported
void import("./shader-background").then((mod) => setShaderBackground(() => mod.ShaderBackground));
```

When user toggles off or WebGPU unavailable, component unmounts and chunk is not loaded (until re-enabled).

### 2. Trim shader graph (`shader-background.tsx`)

Removed:

- Unused `texture-alt-1.jpg` and `texture-alt-2.jpg` ImageTexture nodes
- Hidden `SineWave` node

Added on `<Shader>`:

- `disableTelemetry` — opt out of vendor telemetry
- `colorSpace="srgb"` — avoid default wide-gamut P3 processing

### 3. Smarter defaults (`shader-preference.tsx`)

Default shader **off** when (unless user explicitly opted in via toggle):

- `prefers-reduced-motion: reduce` (existing)
- `navigator.connection.saveData === true` (new)
- `navigator.deviceMemory <= 4` (new, when API available)

---

## Verification performed

```bash
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 24
export PATH="$NVM_DIR/versions/node/$(nvm version)/bin:$PATH"

pnpm install
pnpm typecheck          # passed
pnpm --filter web exec next build   # passed
```

Playwright chunk test (manual, not committed):

- Shader OFF → 0 shader JS files, ~1.1MB total JS
- Shader ON → ~683KB shader JS, ~2.2MB total JS

Dev server: `pnpm --filter web dev` → `https://localhost:4111` (HTTPS required for Bungie OAuth; not relevant to shader testing).

---

## What remains / optional follow-ups

Not implemented — candidate next steps for a follow-up agent:

| Idea | Rationale |
|------|-----------|
| **Delete unused JPGs** | `texture-alt-1.jpg`, `texture-alt-2.jpg` no longer referenced |
| **CSS gradient fallback** | Non-WebGPU browsers get plain background today |
| **Default off on mobile** | e.g. `(hover: none)` or coarse pointer — battery/GPU concern |
| **Lower render resolution** | Library caps DPR at 2 but no simple quality knob; would need custom wrapper or upstream API |
| **Restore dither pixel-size scaling** | Older commits (`03e9cfb`, `328ba2b`) scaled `Dither pixelSize` with viewport width for consistent grain; removed when effect stack changed to FlowingGradient + Dither. May be worth re-adding if grain looks too coarse on 4K |
| **Real-device profiling** | Test on integrated GPU laptop + phone; headless VM numbers are optimistic |
| **Merge PR #33** | Review draft PR, run CI, merge if acceptable |

---

## Key code references

### App shell wiring

```tsx
// apps/web/components/app-shell.tsx
<ShaderPreferenceProvider>
  <ShaderBackgroundLoader />
  ...
  <ShaderToggle />
</ShaderPreferenceProvider>
```

### Shader effect (current)

```tsx
// apps/web/components/shader-background.tsx
<Shader className="size-full" disableTelemetry colorSpace="srgb">
  <ImageTexture url="/shaders/texture-primary.jpg" />
  <Group>
    <FlowingGradient />
    <Dither colorB="#1c90e8" visible />
  </Group>
</Shader>
```

### Preference storage

- Key: `noeyarmory-shader-background` (`"true"` / `"false"`)
- Context hook: `useShaderPreference()` → `{ enabled, setEnabled, webgpuSupported }`

---

## Repo / environment notes for next agent

- **Node 24 required** — prepend nvm Node 24 to PATH before pnpm scripts (see `AGENTS.md`)
- **`shaders` package** is in `transpilePackages` in `apps/web/next.config.ts`
- Importing from `shaders/react` barrel pulls entire component library into the dynamic chunk — individual component imports don't avoid the core + three.webgpu cost
- Do **not** commit auto-generated changes to `apps/web/next-env.d.ts` after builds
- Branch naming convention for cloud agents: `cursor/<descriptive-name>-9e02`

---

## Conversation summary for context

1. User asked for shader performance research and possible optimizations.
2. Agent investigated codebase, `shaders` library internals, bundle sizes, and ran Playwright profiling.
3. Main finding: **load cost >> runtime jank** on desktop; static import was the primary issue.
4. Agent implemented lazy loading + cleanup on branch `cursor/shader-perf-optimizations-9e02`, opened draft PR #33.
5. User sent commit reminder — only uncommitted file was auto-generated `next-env.d.ts`; correctly discarded.
6. User requested this handoff document.

---

## Quick start for next agent

```bash
git fetch origin cursor/shader-perf-optimizations-9e02
git checkout cursor/shader-perf-optimizations-9e02

# Verify
pnpm typecheck
pnpm --filter web exec next build

# Manual test
pnpm --filter web dev
# Open https://localhost:4111 — toggle "Pretty shader" in header
# DevTools Network: confirm shader JS chunks only load when enabled
```

To merge: review PR #33, ensure CI green, mark ready for review, merge to `main`.
