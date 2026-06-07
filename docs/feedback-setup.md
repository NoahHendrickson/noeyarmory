# Feedback → GitHub Issues

In-app feedback (top-right button) creates issues in a GitHub repo via the REST API. The token stays server-side; the browser never sees it.

## Step 1 — GitHub token (~5 min)

1. Open [GitHub → Settings → Developer settings → Fine-grained personal access tokens](https://github.com/settings/personal-access-tokens).
2. **Generate new token** scoped to this repository only.
3. Under **Repository permissions**, set **Issues** to **Read and write**.
4. Copy the token (starts with `github_pat_` or `ghp_`).

## Step 2 — Labels

Create these labels on the target repo if they do not exist (defaults):

| Label | Used for |
|-------|----------|
| `bug` | Bug reports |
| `enhancement` | Feature requests |

Override names via `GITHUB_FEEDBACK_LABEL_BUG` and `GITHUB_FEEDBACK_LABEL_FEATURE` in `.env`.

## Step 3 — Local `.env`

Add to repo-root `.env` (alongside Bungie vars):

```env
GITHUB_TOKEN=github_pat_...
GITHUB_REPO=noahhendrickson/noeyarmory
```

Restart `pnpm dev` after changing env vars.

## Step 4 — Vercel (production)

In **Vercel → Project → Settings → Environment Variables**, add:

| Variable | Environments |
|----------|--------------|
| `GITHUB_TOKEN` | Production, Preview |
| `GITHUB_REPO` | Production, Preview |

Use the same repo or a dedicated feedback repo. Redeploy after adding vars.

## Verify

1. Open the app → click the message icon (top-right).
2. Submit a test bug and a test feature request.
3. Confirm issues appear in GitHub with the correct labels and metadata (page URL, timestamp).

`GITHUB_REPO` defaults to `noahhendrickson/noeyarmory` when unset. `GITHUB_TOKEN` is required — without it, feedback submission returns an error.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Submit fails with "not available right now" | Set `GITHUB_TOKEN` in `.env` / Vercel and redeploy |
| 403 from GitHub | Token lacks Issues write access on the repo, or repo name is wrong |
| Issues created without labels | Create `bug` / `enhancement` labels on the repo, or set custom label env vars |
