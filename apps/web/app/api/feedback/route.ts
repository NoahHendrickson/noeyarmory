import { NextResponse } from "next/server";

import {
  createFeedbackIssue,
  isFeedbackConfigured,
  type FeedbackType,
} from "../../../lib/github-issues";
import { getSession, isSignedIn } from "../../../lib/session";

export const dynamic = "force-dynamic";

const TITLE_MAX = 100;
const BODY_MAX = 4000;

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

/** Accept in-app feedback and create a GitHub issue. */
export async function POST(request: Request) {
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

  if (!isFeedbackConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Feedback is not configured on this deployment." },
      { status: 503 },
    );
  }

  const session = await getSession();
  const bungieName = isSignedIn(session) ? session.bungieName : undefined;

  try {
    const issue = await createFeedbackIssue({
      type: payload.type,
      title,
      body,
      metadata: {
        pageUrl: asOptionalString(payload.pageUrl, 2048),
        userAgent: asOptionalString(payload.userAgent, 512),
        bungieName,
      },
    });
    return NextResponse.json({ ok: true, issueUrl: issue.issueUrl });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to submit feedback.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
