import { NextResponse } from "next/server";

import {
  buildGitHubNewIssueUrl,
  createFeedbackIssue,
  isFeedbackConfigured,
  type FeedbackType,
} from "../../../lib/github-issues";
import { createRateLimiter } from "../../../lib/rate-limit";
import { isSameOriginRequest } from "../../../lib/request-guards";

export const dynamic = "force-dynamic";

const TITLE_MAX = 100;
const BODY_MAX = 4000;
const FEEDBACK_LIMIT = 5;
const FEEDBACK_WINDOW_MS = 60 * 60 * 1000;
// In-memory limiter is per serverless instance; treat as a soft cap, not a global quota.
const feedbackLimiter = createRateLimiter({
  limit: FEEDBACK_LIMIT,
  windowMs: FEEDBACK_WINDOW_MS,
});

interface FeedbackRequestBody {
  type?: unknown;
  title?: unknown;
  body?: unknown;
  pageUrl?: unknown;
  userAgent?: unknown;
  website?: unknown;
}

function isFeedbackType(value: unknown): value is FeedbackType {
  return value === "bug" || value === "feature";
}

function asOptionalString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, maxLength);
}

function clientKey(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

function safePagePath(value: unknown): string | undefined {
  const pageUrl = asOptionalString(value, 2048);
  if (!pageUrl) return undefined;

  try {
    const parsed = new URL(pageUrl);
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return pageUrl.startsWith("/") && !pageUrl.startsWith("//") ? pageUrl : undefined;
  }
}

/** Accept in-app feedback and create a GitHub issue. */
export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  if (!feedbackLimiter.check(clientKey(request))) {
    return NextResponse.json(
      { ok: false, error: "Too many feedback submissions. Please try again later." },
      { status: 429 },
    );
  }

  let payload: FeedbackRequestBody;
  try {
    payload = (await request.json()) as FeedbackRequestBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof payload.website === "string" && payload.website.trim()) {
    return NextResponse.json({ ok: true, issueUrl: null });
  }

  if (!isFeedbackType(payload.type)) {
    return NextResponse.json({ ok: false, error: "Invalid feedback type." }, { status: 400 });
  }

  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const body = typeof payload.body === "string" ? payload.body.trim() : "";

  if (!title) {
    return NextResponse.json({ ok: false, error: "Title is required." }, { status: 400 });
  }
  if (title.length > TITLE_MAX) {
    return NextResponse.json(
      { ok: false, error: `Title must be ${TITLE_MAX} characters or fewer.` },
      { status: 400 },
    );
  }
  if (!body) {
    return NextResponse.json({ ok: false, error: "Details are required." }, { status: 400 });
  }
  if (body.length > BODY_MAX) {
    return NextResponse.json(
      { ok: false, error: `Details must be ${BODY_MAX} characters or fewer.` },
      { status: 400 },
    );
  }

  const metadata = {
    pageUrl: safePagePath(payload.pageUrl),
    userAgent: asOptionalString(payload.userAgent, 512),
  };

  if (!isFeedbackConfigured()) {
    return NextResponse.json({
      ok: true,
      manual: true,
      issueUrl: buildGitHubNewIssueUrl({ type: payload.type, title, body, metadata }),
    });
  }

  try {
    const issue = await createFeedbackIssue({
      type: payload.type,
      title,
      body,
      metadata,
    });
    return NextResponse.json({ ok: true, issueUrl: issue.issueUrl });
  } catch (e) {
    console.error("[feedback] submission failed:", e);
    return NextResponse.json(
      { ok: false, error: "Failed to submit feedback. Please try again later." },
      { status: 500 },
    );
  }
}
