---
name: address-thermo-nuclear-review
description: Implement fixes for thermo-nuclear code quality review feedback on a pull request. Use when a PR comment contains maintainability findings from the thermo-nuclear review automation.
disable-model-invocation: true
---

# Address Thermo-Nuclear Review Feedback

Use this skill after the thermo-nuclear PR review automation posts findings on a pull request. Implement structural fixes while preserving behavior.

## Loop prevention (run first)

Exit immediately with **no commits and no PR comments** when any of these is true:

- The triggering comment contains `<!-- thermo-nuclear-fix-automation -->`.
- The triggering comment does not contain `<!-- thermo-nuclear-review-automation -->` and is not otherwise thermo-nuclear review output (human discussion, CI bots, unrelated threads).
- The review reported no major structural issues and there is nothing actionable to implement.
- This PR already has a completion comment from this automation, or recent commits clearly address the same findings.

Only proceed when the triggering comment is review feedback with concrete structural or maintainability issues to fix.

## Workflow

1. **Read feedback** — Start from the triggering PR comment. Read the full PR diff and materially changed files.
2. **Triage** — Fix high-conviction structural issues: decomposition, spaghetti reduction, boundary cleanup, canonical helper reuse, type clarity. Skip subjective product calls, debatable style-only nits, and changes that would alter intended behavior.
3. **Implement surgically** — Match repo conventions. Minimize scope. Prefer deleting complexity over rearranging it.
4. **Verify** — Run targeted checks for touched areas (`pnpm typecheck`, package tests, or focused Vitest as appropriate). Fix failures before committing.
5. **Commit and push** — One focused commit (or a small logical sequence) on the PR branch with a clear message referencing the review fixes.
6. **Summarize on the PR** — Post one brief comment starting with `<!-- thermo-nuclear-fix-automation -->`, then list what you fixed, what you skipped (with reason), and verification you ran.

## Guardrails

- Preserve behavior unless fixing a clear bug uncovered while refactoring.
- Do not expand scope beyond what the review flagged.
- Do not rewrite unrelated code.
- Do not create commits when there is nothing actionable to change — exit silently instead.
- Follow project rules in `CLAUDE.md` and `AGENTS.md` for commands, package layout, and conventions.

## What to prioritize

1. Structural regressions and file-size decomposition
2. Code-judo simplifications with a clear path
3. Spaghetti / special-case branching added by the PR
4. Boundary leaks and duplicate helpers
5. Type-contract cleanup that simplifies control flow

## What to skip (note in summary)

- Findings that need author/product judgment
- Large rewrites that exceed the PR's scope
- Suggestions already satisfied by current code
- Low-value cosmetic nits when structural work is done or absent
