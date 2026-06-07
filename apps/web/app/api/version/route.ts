import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Build metadata for verifying deploy ↔ git sync (Vercel sets VERCEL_GIT_* at build time). */
export function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ env: process.env.VERCEL_ENV ?? "production" });
  }

  const sha = process.env.VERCEL_GIT_COMMIT_SHA ?? null;

  return NextResponse.json({
    sha,
    ref: process.env.VERCEL_GIT_COMMIT_REF ?? null,
    env: process.env.VERCEL_ENV ?? "development",
  });
}
