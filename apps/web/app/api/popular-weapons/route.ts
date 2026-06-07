import { NextResponse } from "next/server";

import { isPopularWeaponsMockEnabled } from "../../../lib/popularity/mock";
import { getPopularWeapons } from "../../../lib/popularity/redis";

export const dynamic = "force-dynamic";

const CACHE_CONTROL = "public, s-maxage=3600, stale-while-revalidate=600";

/** Return the rolling 7-day top popular weapons when traffic crosses the visibility threshold. */
export async function GET() {
  try {
    const mock = isPopularWeaponsMockEnabled();
    const { weapons } = await getPopularWeapons();
    return NextResponse.json(
      { weapons, mock },
      {
        headers: {
          "Cache-Control": CACHE_CONTROL,
        },
      },
    );
  } catch (e) {
    console.error("[popular-weapons] failed to load rankings:", e);
    return NextResponse.json(
      { weapons: [], mock: false },
      {
        headers: {
          "Cache-Control": CACHE_CONTROL,
        },
      },
    );
  }
}
