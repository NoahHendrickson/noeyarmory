# Handoff: GitHub branch protection (ruleset)

**Repo:** [NoahHendrickson/noeyarmory](https://github.com/NoahHendrickson/noeyarmory)  
**Default branch:** `main`  
**Date:** 2026-06-07  
**Status:** CI merged; ruleset **not yet applied** (blocked on repo-admin credentials)

---

## Goal

Finish protecting `main` so GitHub stops flagging the repo as unprotected. Target end state:

| Rule | Setting |
|------|---------|
| Target branch | Default branch (`main`) |
| Require pull request | Yes, **0 approvals** (solo-maintainer friendly) |
| Block force pushes | Yes |
| Block branch deletion | Yes |
| Required status check | **`build`** (CI job name) |
| Strict status checks | Yes (PR branch must be up to date with `main`) |

---

## What is already done

### 1. CI workflow merged (PR #9)

- **PR:** https://github.com/NoahHendrickson/noeyarmory/pull/9 (merged 2026-06-07)
- **Merge commit:** `a9e95adf4c4e0ac224549797a7185a9930db2c7c`
- **Workflow file:** `.github/workflows/ci.yml`
- **Triggers:** `pull_request`, `push` to `main`
- **Job name:** `build` — this exact string is the required status-check context in the ruleset

**CI steps:**

1. `pnpm install --frozen-lockfile`
2. `pnpm build`
3. `pnpm --filter @repo/destiny test`

**Intentionally excluded from CI (for now):**

- Root `pnpm typecheck` — fails on pre-existing `@repo/ui` Storybook type errors (`feedback-dialog.stories.tsx`)
- `@repo/ui` Vitest Storybook browser project — requires Playwright/Chromium; heavier than needed for merge gating

**Verified:** CI `build` job passed on merge to `main` (run `27082276284`).

### 2. Placeholder ruleset exists (incomplete)

- **Name:** `first-rule-set`
- **Ruleset ID:** `17363603`
- **Settings URL:** https://github.com/NoahHendrickson/noeyarmory/rules/17363603
- **Current rules:** `deletion`, `non_fast_forward` only
- **Problem:** `conditions.ref_name.include` is **empty** — does not target `main` / default branch
- **Missing:** `pull_request`, `required_status_checks`

---

## What remains (primary task)

Apply the **Protect main** ruleset by updating ruleset `17363603`.

### Option A — `gh` CLI (preferred)

Must run as a GitHub user with **repo admin** on `NoahHendrickson/noeyarmory`. The cloud agent account `cursor` **cannot** do this (returns `403 Resource not accessible by integration`).

```bash
gh auth status   # confirm logged-in user is repo owner/admin, not cursor bot

gh api -X PUT repos/NoahHendrickson/noeyarmory/rulesets/17363603 \
  -H "Accept: application/vnd.github+json" \
  --input - <<'EOF'
{
  "name": "Protect main",
  "target": "branch",
  "enforcement": "active",
  "conditions": {
    "ref_name": {
      "include": ["~DEFAULT_BRANCH"],
      "exclude": []
    }
  },
  "rules": [
    {
      "type": "pull_request",
      "parameters": {
        "allowed_merge_methods": ["merge", "squash", "rebase"],
        "dismiss_stale_reviews_on_push": true,
        "require_code_owner_review": false,
        "require_last_push_approval": false,
        "required_approving_review_count": 0,
        "required_review_thread_resolution": false
      }
    },
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    {
      "type": "required_status_checks",
      "parameters": {
        "required_status_checks": [{ "context": "build" }],
        "strict_required_status_checks_policy": true,
        "do_not_enforce_on_create": false
      }
    }
  ]
}
EOF
```

### Option B — GitHub UI

1. Repo → **Settings** → **Rules** → **Rulesets**
2. Edit **`first-rule-set`** (or create new and delete the placeholder)
3. **Target branches:** Default branch
4. Enable: Require pull request (0 approvals), block force push, block deletion
5. **Required status checks:** add `build` (exact job name from CI workflow)
6. Save with enforcement **Active**

### Verify success

```bash
gh api repos/NoahHendrickson/noeyarmory/rulesets/17363603 \
  --jq '{name, conditions, rules: [.rules[].type]}'
```

**Expected output:**

```json
{
  "name": "Protect main",
  "conditions": {
    "ref_name": {
      "exclude": [],
      "include": ["~DEFAULT_BRANCH"]
    }
  },
  "rules": [
    "pull_request",
    "deletion",
    "non_fast_forward",
    "required_status_checks"
  ]
}
```

### Smoke test after ruleset is live

1. Create a trivial branch + PR (e.g. README typo)
2. Confirm direct push to `main` is rejected
3. Confirm PR shows required check **`build`**
4. Confirm merge is blocked until `build` is green

---

## Auth / permissions notes for agents

| Actor | Can read rulesets | Can update rulesets |
|-------|-------------------|---------------------|
| Cloud agent (`cursor` integration token) | Yes | **No** (403) |
| Repo owner / admin (`gh auth login` as human) | Yes | Yes |

If an agent hits 403, **stop retrying the API** and either:

- Hand the `gh api` command to the repo owner to run locally, or
- Use GitHub UI instructions above

Do **not** commit ruleset JSON into the repo — GitHub rulesets are repository settings, not file-based config.

---

## Repo context (for unrelated work)

- **Node:** 24 (`.nvmrc`, `engines.node >= 24`)
- **Package manager:** pnpm 10 (`packageManager` in root `package.json` — do not pin conflicting version in `pnpm/action-setup`)
- **Correctness gates:** `pnpm typecheck`, `pnpm build` (typecheck currently has known `@repo/ui` story failures)
- **Other workflow:** `release-please.yml` runs on push to `main` (separate from CI `build` check)
- **Vercel** also reports preview checks on PRs; ruleset only requires `build`, not Vercel

---

## Optional follow-ups (out of scope unless requested)

1. **Expand CI** — add `pnpm typecheck` after fixing `@repo/ui` story TS errors
2. **Playwright in CI** — install Chromium + run `@repo/ui` Storybook Vitest project
3. **Require 1 approval** — when there are regular reviewers
4. **Protect `release/*` branches** — add another ruleset pattern if needed

---

## Quick reference

| Item | Value |
|------|-------|
| Ruleset ID | `17363603` |
| Required check context | `build` |
| CI workflow path | `.github/workflows/ci.yml` |
| Merged PR | #9 |
| Blocked by | Repo-admin-only ruleset API/UI |
