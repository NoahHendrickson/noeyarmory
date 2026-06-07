# Popular weapons setup

The home screen can show **Popular lately** — up to four weapons ranked by anonymous detail views over the last seven days. The section stays hidden until traffic crosses a minimum threshold (20 total views and 4 distinct weapons).

## Step 1 — Create an Upstash Redis database

1. Sign in at [console.upstash.com](https://console.upstash.com).
2. Create a **Redis** database (free tier is enough for expected traffic).
3. Pick a region close to your Vercel deployment if possible.
4. Open the database → **REST API** tab.
5. Copy **UPSTASH_REDIS_REST_URL** and **UPSTASH_REDIS_REST_TOKEN**.

## Step 2 — Local dev (optional)

Add to repo-root `.env`:

```env
POPULAR_WEAPONS_ENABLED=true
UPSTASH_REDIS_REST_URL=https://…
UPSTASH_REDIS_REST_TOKEN=…
```

Without `POPULAR_WEAPONS_ENABLED=true`, weapon view tracking is a no-op and the home section never appears — even if Upstash creds are set. Browse/search still works normally.

### Dev-only: skip Redis (optional)

If you point local dev at a shared production Upstash database and want to avoid reading or writing popularity counters:

```env
POPULAR_WEAPONS_MOCK=true
```

Only works when `NODE_ENV=development`. **Do not set this on Vercel.** Mock mode skips all Redis reads/writes; **Popular lately** stays hidden until real rankings are available from Redis.

## Step 3 — Vercel (production)

In **Vercel → Project → Settings → Environment Variables**, add both Upstash vars for **Production** (and **Preview** if you want popularity in PR previews). Redeploy after saving.

**Do not set `POPULAR_WEAPONS_ENABLED` on Vercel until you want the section live.** Without it, view tracking and the home section stay off even when Redis is configured — this avoids QA/dev traffic on a shared Upstash database from surfacing on production.

When you are ready to ship **Popular lately**, add `POPULAR_WEAPONS_ENABLED=true` for Production and redeploy. The section still stays hidden until Redis has enough real traffic (see threshold below).

## How it works

- Opening a weapon from search, a popular card, or `/weapon/[hash]` sends a fire-and-forget `POST /api/events/weapon-view`.
- Counts are stored in daily Redis sorted sets and aggregated over a rolling 7-day window.
- `GET /api/popular-weapons` returns the top four when the visibility threshold is met; responses are cached for one hour at the edge.

No user IDs or cookies are stored — only weapon hash counters.

## QA / seeding data

In preview or local with Redis configured, you can seed views by POSTing to the tracking endpoint (same origin):

```bash
curl -X POST https://localhost:4111/api/events/weapon-view \
  -H "Content-Type: application/json" \
  -H "Origin: https://localhost:4111" \
  -d '{"weaponHash":1,"source":"direct"}'
```

Use real weapon hashes from your generated index. Repeat across at least four weapons until total views ≥ 20, then reload the home page.

## Troubleshooting

| Symptom | Check |
|--------|--------|
| Section never appears | `POPULAR_WEAPONS_ENABLED=true` set? Redis env vars set? Enough distinct weapons viewed in the last 7 days? |
| Section appears on production too early | Unset `POPULAR_WEAPONS_ENABLED` on Vercel until launch; use a separate Upstash DB for dev QA |
| Views not counting locally | `.env` has `POPULAR_WEAPONS_ENABLED=true`, Upstash creds, and dev server was restarted |
| 503 on POST in Network tab | Redis not configured — expected locally without `.env` |
| Stale rankings | GET is cached ~1 hour; wait or hard-refresh after CDN TTL |
