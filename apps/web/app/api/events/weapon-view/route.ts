import { NextResponse } from "next/server";

import { isPopularWeaponsMockEnabled } from "../../../../lib/popularity/mock";
import { isPopularityConfigured, recordWeaponView } from "../../../../lib/popularity/redis";
import { createRateLimiter } from "../../../../lib/rate-limit";
import { isSameOriginRequest } from "../../../../lib/request-guards";
import { getWeaponSummary } from "../../../../lib/weapon-index-server";

export const dynamic = "force-dynamic";

const VIEW_LIMIT = 60;
const VIEW_WINDOW_MS = 60 * 60 * 1000;
const viewLimiter = createRateLimiter({
  limit: VIEW_LIMIT,
  windowMs: VIEW_WINDOW_MS,
});

interface WeaponViewRequestBody {
  weaponHash?: unknown;
  source?: unknown;
}

function clientKey(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

function parseWeaponHash(value: unknown): number | undefined {
  const hash = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(hash) || hash <= 0 || !Number.isInteger(hash)) return undefined;
  return hash;
}

/** Record an anonymous weapon detail view for popularity ranking. */
export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return new NextResponse(null, { status: 403 });
  }

  if (!viewLimiter.check(clientKey(request))) {
    return new NextResponse(null, { status: 429 });
  }

  let payload: WeaponViewRequestBody;
  try {
    payload = (await request.json()) as WeaponViewRequestBody;
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  const weaponHash = parseWeaponHash(payload.weaponHash);
  if (weaponHash == null) {
    return new NextResponse(null, { status: 400 });
  }

  if (!getWeaponSummary(weaponHash)) {
    return new NextResponse(null, { status: 400 });
  }

  if (isPopularWeaponsMockEnabled()) {
    return new NextResponse(null, { status: 204 });
  }

  if (!isPopularityConfigured()) {
    return new NextResponse(null, { status: 503 });
  }

  try {
    await recordWeaponView(weaponHash);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    console.error("[weapon-view] failed to record view:", e);
    return new NextResponse(null, { status: 500 });
  }
}
