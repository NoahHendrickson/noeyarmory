# AGENTS.md

Guidance for cloud agents working in this repository.

## Cursor Cloud specific instructions

### Environment bootstrap

Cloud agents load `.cursor/environment.json`, which runs `scripts/ensure-cloud-env.sh`, then `pnpm install`, then Playwright Chromium for `@repo/ui` Storybook browser tests. The bootstrap script:

- Activates **Node 24** from `.nvmrc` (the VM default at `/exec-daemon/node` is Node 22)
- Normalizes `origin` owner casing to `NoahHendrickson` when the remote already points at this repo (preserves HTTPS auth tokens and SSH URLs)
- Appends a `~/.bashrc` hook so interactive shells under `/workspace` also use Node 24

Re-run manually after a fresh clone or if `pnpm` warns about `Unsupported engine`:

```bash
source scripts/ensure-cloud-env.sh
node -v   # should print v24.x
```

### Node.js version

The repo requires **Node 24** (`engines.node >= 24`, `.nvmrc` is `24`). If the bootstrap script was skipped, prepend nvm's Node 24 to `PATH` before pnpm scripts:

```bash
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 24
export PATH="$NVM_DIR/versions/node/$(nvm version)/bin:$PATH"
node -v   # should print v24.x
```

### Pull requests

- Create PRs with the PR management tool or `gh pr create`.
- If `update_pr` fails with *"PR URL must belong to the current repository"*, run `bash scripts/ensure-cloud-env.sh` first, then fall back to `gh pr edit <number> --body-file /tmp/pr-body.md`.

### Install & refresh dependencies

From repo root:

```bash
pnpm install
```

See root `package.json` / `README.md` for standard commands (`pnpm dev`, `pnpm build`, `pnpm test`, `pnpm lint`, `pnpm typecheck`).

### Running the web app

- **Dev (web only):** `pnpm --filter web dev` → **https://localhost:4111** (HTTPS via Next `--experimental-https`; mkcert certs auto-generated under `apps/web/certificates/`).
- **Dev (web + Storybook):** `pnpm dev` also starts Storybook on **http://localhost:6006**.
- Use **tmux** for long-running dev servers in cloud VMs.
- Do **not** change port 4111 or drop HTTPS casually — Bungie OAuth redirect is registered to `https://localhost:4111/api/auth/callback`.

### Weapon / armor data

`apps/web/public/data/weapons.json` and `armor.json` are **gitignored**. Without them the UI falls back to bundled `sampleWeapons` / sample armor fixtures (banner: "Sample data — run pnpm setup:bungie for the full index").

For full catalog + vault/armor flows, configure repo-root `.env` (see `.env.example`, `docs/bungie-setup.md`) and run `pnpm setup:bungie` (requires `BUNGIE_API_KEY` and OAuth credentials).

### Code → Figma

When pushing UI into Figma, follow `~/.cursor/skills/code-to-figma/SKILL.md` — capture live UI with `generate_figma_design`, never hand-draw frames. In this repo, use Storybook (`:6006`) or `/design/*` routes outside `app/(app)/` (no AppShell chrome).

### Search UX

The command palette is keyboard-driven: press **F** to focus search, then type a weapon or perk name. Sample-data weapons include **Fatebringer** (hash `1`) and **Stormchase**; direct URL `/weapon/1` works if the palette search misbehaves before data finishes loading.

### Tests

- `@repo/destiny` tests are pure Vitest (no browser).
- `@repo/ui` includes Storybook browser tests via Playwright. Cloud agents install Chromium during `.cursor/environment.json` bootstrap; locally after a fresh clone:

  ```bash
  cd packages/ui && pnpm exec playwright install chromium
  ```

  Browsers cache under `~/.cache/ms-playwright/` and persist across sessions.

### Lint

`pnpm lint` may report pre-existing a11y / Storybook-story issues in the tree; `pnpm typecheck` and `pnpm build` are the stronger correctness gates.

### Bungie OAuth / My Vault

Requires repo-root `.env` with dev Bungie app credentials. Without them, browse/search still works on sample or generated data; armor mode sign-in will not.
