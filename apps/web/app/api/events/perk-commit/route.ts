import { NextResponse } from "next/server";

import { isPopularityPublishingEnabled } from "../../../../lib/popularity/enabled";
import { isPopularityConfigured, recordPerkCommit } from "../../../../lib/popularity/redis";
import { createRateLimiter } from "../../../../lib/rate-limit";
import { isSameOriginRequest } from "../../../../lib/request-guards";
import { getCanonicalPerkName } from "../../../../lib/weapon-index-server";

export const dynamic = "force-dynamic";

const COMMIT_LIMIT = 120;
const COMMIT_WINDOW_MS = 60 * 60 * 1000;
const commitLimiter = createRateLimiter({
  limit: COMMIT_LIMIT,
  windowMs: COMMIT_WINDOW_MS,
});

interface PerkCommitRequestBody {
  perkName?: unknown;
  source?: unknown;
}

function clientKey(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

/** Record an anonymous perk commit (filter or build select) for popularity ranking. */
export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return new NextResponse(null, { status: 403 });
  }

  if (!commitLimiter.check(clientKey(request))) {
    return new NextResponse(null, { status: 429 });
  }

  let payload: PerkCommitRequestBody;
  try {
    payload = (await request.json()) as PerkCommitRequestBody;
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  if (typeof payload.perkName !== "string") {
    return new NextResponse(null, { status: 400 });
  }

  const perkName = getCanonicalPerkName(payload.perkName);
  if (perkName == null) {
    return new NextResponse(null, { status: 400 });
  }

  if (!isPopularityPublishingEnabled()) {
    return new NextResponse(null, { status: 204 });
  }

  if (!isPopularityConfigured()) {
    return new NextResponse(null, { status: 503 });
  }

  try {
    await recordPerkCommit(perkName);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    console.error("[perk-commit] failed to record commit:", e);
    return new NextResponse(null, { status: 500 });
  }
}
