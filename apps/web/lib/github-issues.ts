import "server-only";

/** Default target repo when GITHUB_REPO is unset (public; matches .env.example). */
export const DEFAULT_GITHUB_REPO = "noahhendrickson/noeyarmory";

export type FeedbackType = "bug" | "feature";

export interface FeedbackMetadata {
  pageUrl?: string;
  userAgent?: string;
}

export interface CreateFeedbackIssueInput {
  type: FeedbackType;
  title: string;
  body: string;
  metadata?: FeedbackMetadata;
}

export interface CreateFeedbackIssueResult {
  issueNumber: number;
  issueUrl: string;
}

export function getFeedbackRepo(): string {
  return process.env.GITHUB_REPO?.trim() || DEFAULT_GITHUB_REPO;
}

export function isFeedbackConfigured(): boolean {
  return Boolean(process.env.GITHUB_TOKEN?.trim());
}

function requireFeedbackToken(): string {
  const value = process.env.GITHUB_TOKEN?.trim();
  if (!value) {
    throw new Error("Missing GITHUB_TOKEN. See docs/feedback-setup.md.");
  }
  return value;
}

function parseFeedbackRepo(repo: string): { owner: string; name: string } {
  const [owner, name] = repo.split("/");
  if (!owner || !name) {
    throw new Error("GITHUB_REPO must be in owner/repo format.");
  }
  return { owner, name };
}

function labelForType(type: FeedbackType): string {
  if (type === "bug") {
    return process.env.GITHUB_FEEDBACK_LABEL_BUG?.trim() || "bug";
  }
  return process.env.GITHUB_FEEDBACK_LABEL_FEATURE?.trim() || "enhancement";
}

function buildIssueBody(body: string, metadata?: FeedbackMetadata): string {
  const lines = [body.trim(), "", "---", "_Submitted via noeyarmory feedback form_"];

  if (metadata?.pageUrl) {
    lines.push(`- **Page:** ${metadata.pageUrl}`);
  }
  if (metadata?.userAgent) {
    lines.push(`- **User agent:** ${metadata.userAgent}`);
  }
  lines.push(`- **Submitted at:** ${new Date().toISOString()}`);

  return lines.join("\n");
}

interface GitHubIssueResponse {
  number: number;
  html_url: string;
}

/** Pre-filled GitHub "new issue" URL when server-side API submission is unavailable. */
export function buildGitHubNewIssueUrl(input: CreateFeedbackIssueInput): string {
  const { owner, name } = parseFeedbackRepo(getFeedbackRepo());
  const params = new URLSearchParams({
    title: input.title.trim(),
    body: buildIssueBody(input.body, input.metadata),
    labels: labelForType(input.type),
  });
  return `https://github.com/${owner}/${name}/issues/new?${params.toString()}`;
}

export async function createFeedbackIssue(
  input: CreateFeedbackIssueInput,
): Promise<CreateFeedbackIssueResult> {
  const token = requireFeedbackToken();
  const { owner, name } = parseFeedbackRepo(getFeedbackRepo());

  const response = await fetch(`https://api.github.com/repos/${owner}/${name}/issues`, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({
      title: input.title.trim(),
      body: buildIssueBody(input.body, input.metadata),
      labels: [labelForType(input.type)],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("[feedback] GitHub issue creation failed:", response.status, text);
    if (response.status === 401 || response.status === 403) {
      throw new Error("GitHub rejected the request. Check GITHUB_TOKEN permissions.");
    }
    if (response.status === 404) {
      throw new Error("GitHub repository not found. Check GITHUB_REPO.");
    }
    throw new Error("Could not create GitHub issue. Please try again later.");
  }

  const issue = (await response.json()) as GitHubIssueResponse;
  return { issueNumber: issue.number, issueUrl: issue.html_url };
}
