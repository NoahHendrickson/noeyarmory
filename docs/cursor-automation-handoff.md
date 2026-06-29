# Handoff: Cursor PR review automations

**Repo:** [NoahHendrickson/noeyarmory](https://github.com/NoahHendrickson/noeyarmory)  
**Date:** 2026-06-29  
**Status:** Thermo-nuclear automation live; fix automation + run-once guard **needs Cursor UI update**

---

## Goal

Two chained Cursor automations on pull requests:

| Step | Automation | Runs |
|------|------------|------|
| 1 | **Thermo-nuclear PR review** | **Once per PR** (on open) |
| 2 | **Fix thermo-nuclear feedback** | After step 1 submits its review |

Thermo-nuclear must **not** re-run on every push. Re-review is opt-in via a label.

---

## Why “PR commented” does not chain these

GitHub splits PR feedback into different event types. Thermo-nuclear posts as `cursor[bot]` via:

- **PR review submitted** — the summary review body
- **PR review comment** — inline threads on the diff

It does **not** post **issue comments** (Conversation tab). The “Pull request commented” trigger listens for issue comments only, and bot-authored conversation comments are filtered anyway.

Wire the fix automation to **PR review submitted** (or **PR review comment** for per-thread fixes).

---

## Automation 1: Thermo-nuclear PR review (run once)

**Cursor automation:** [Thermo-nuclear PR review](https://cursor.com/automations/1429c53b-c661-4338-ae0f-52122a70ce3c)  
**Automation ID:** `1429c53b-c661-4338-ae0f-52122a70ce3c`

### Trigger (required change)

Use **only**:

- **Pull request opened**

Remove **Pull request pushed** if it is currently enabled. Pushed commits should not re-trigger thermo-nuclear automatically.

### Instructions — paste at the top of the automation prompt

```markdown
## Skip conditions (check before doing any work)

Exit immediately with no review and no comments if ANY of the following are true.

### 1. Already reviewed this PR (run-once rule)

A thermo-nuclear review already exists on this pull request — at any commit.

To check:

1. List reviews: `gh api repos/{owner}/{repo}/pulls/{number}/reviews`
2. Skip if any review `body` contains BOTH:
   - `Thermo-nuclear code quality review`
   - `CURSOR_AUTOMATION_ID`

This automation runs **once per PR**. Do not re-review after fix commits or human pushes unless the human adds the `cursor:re-review` label (see below).

### 2. Fix-in-progress label

The PR has the label `cursor:fixing`. Do not remove it. Do not post a review.

### 3. Draft PRs

If the PR is a draft and this automation is not configured for “draft opened”, skip.

---

## Opt-in re-review

If the PR has the label `cursor:re-review`, proceed even when a prior thermo-nuclear review exists. Remove the `cursor:re-review` label after posting the new review so it does not loop.

---

If you skip, post nothing to the PR (no “skipped” comment).
```

### Manual re-review

When you want a fresh thermo-nuclear pass after fixes:

```bash
gh pr edit <number> --add-label "cursor:re-review"
```

Then push or re-open as needed; thermo-nuclear will run because the run-once guard is overridden.

---

## Automation 2: Fix thermo-nuclear feedback

Create a **new** automation (or use the Cursor Marketplace template **Autofix PR review comments** and add the filters below).

### Trigger

- **PR review submitted** (recommended — one run per thermo-nuclear review)

Alternative: **PR review comment** (one run per inline thread).

### Instructions

```markdown
## Skip conditions (check before doing any work)

Exit immediately with no commits, no pushes, and no comments if ANY of the following are true.

### 1. Wrong review source

The triggering review body does NOT contain BOTH:

- `Thermo-nuclear code quality review`
- `CURSOR_AUTOMATION_ID`

Ignore reviews from humans, Vercel, Bugbot, or other automations.

### 2. Nothing actionable

The review is approve-only, or has no blockers and no inline review comments from the same thermo-nuclear run.

Inline comments from thermo-nuclear include `CURSOR_AUTOMATION_ID` in the body. If there are zero such inline comments AND the review body has no concrete blocker fix requests, exit.

### 3. Already fixed

Every thermo-nuclear inline thread on the current HEAD is resolved, OR each has a reply from `cursor[bot]` containing `[cursor:fixed]`.

### 4. Fix already in progress

The PR has the label `cursor:fixing` and the most recent commit is from a cursor agent within the last 10 minutes. Another fix run is likely in flight — exit.

---

## Process (when proceeding)

1. Read the triggering review and fetch all inline review comments on this PR.
2. Prioritize **blockers** and inline threads over non-blockers.
3. Add label `cursor:fixing` before editing code.
4. Make the smallest correct fix on the existing PR branch.
5. Run relevant tests/typecheck for touched areas.
6. Commit with message prefix: `[cursor] Address thermo-nuclear review feedback`
7. Push to the PR branch (do not open a new PR).
8. Reply on each addressed inline thread; end each reply with `[cursor:fixed]`.
9. Resolve threads that are fully addressed.
10. Remove label `cursor:fixing`.
11. Leave one short PR comment summarizing fixes and anything not safely auto-fixed.

## Rules

- Match existing code patterns; minimal diff only.
- Do not guess on design questions — reply asking for clarification instead.
- Do not approve the PR.
- Do not post a new PR review or re-run thermo-nuclear.
- Skip non-blockers unless the fix is trivial (<5 lines).
```

---

## One-time repo setup

Create GitHub labels:

```bash
gh label create "cursor:fixing" \
  --color "FFA500" \
  --description "Cursor agent is addressing review feedback" \
  --repo NoahHendrickson/noeyarmory

gh label create "cursor:re-review" \
  --color "0075CA" \
  --description "Request a fresh thermo-nuclear review on this PR" \
  --repo NoahHendrickson/noeyarmory
```

---

## Expected flow

```
PR opened
  → Thermo-nuclear (once): posts review + inline comments
  → Fix automation: PR review submitted → push [cursor] fix → reply on threads
  → Further pushes: thermo-nuclear does NOT run (run-once guard)
  → Optional: human adds cursor:re-review → thermo-nuclear runs again
```

---

## Verification (PR #62)

Thermo-nuclear already ran successfully on [PR #62](https://github.com/NoahHendrickson/noeyarmory/pull/62):

- **Review:** 2026-06-29T18:23:53Z — verdict “request changes”
- **Inline comment:** `apps/web/lib/weapons-context.tsx` line 300 (`useWeaponDetail` early-return regression)
- **Run ID:** `bc-7137b915-8dd0-402c-89ee-ba7fc7ba056d`

After applying this handoff:

1. Update thermo-nuclear trigger to **Pull request opened** only and paste the run-once skip block.
2. Create the fix automation with **PR review submitted**.
3. Open a test PR (or add `cursor:re-review` on #62) to confirm thermo-nuclear runs once and fix automation fires on the review.

---

## Checklist

- [ ] Thermo-nuclear trigger = **Pull request opened** only (remove **Pull request pushed**)
- [ ] Run-once skip block pasted into thermo-nuclear instructions
- [ ] Fix automation created with **PR review submitted** trigger
- [ ] Labels `cursor:fixing` and `cursor:re-review` created on the repo
- [ ] End-to-end test on a PR
