import { afterEach, describe, expect, test } from "vitest";

import {
  buildGitHubNewIssueUrl,
  DEFAULT_GITHUB_REPO,
  getFeedbackRepo,
  isFeedbackConfigured,
} from "./github-issues";

describe("getFeedbackRepo", () => {
  afterEach(() => {
    delete process.env.GITHUB_REPO;
  });

  test("defaults when GITHUB_REPO is unset", () => {
    expect(getFeedbackRepo()).toBe(DEFAULT_GITHUB_REPO);
  });

  test("uses GITHUB_REPO when set", () => {
    process.env.GITHUB_REPO = "acme/feedback";
    expect(getFeedbackRepo()).toBe("acme/feedback");
  });
});

describe("isFeedbackConfigured", () => {
  afterEach(() => {
    delete process.env.GITHUB_TOKEN;
  });

  test("is false without GITHUB_TOKEN", () => {
    expect(isFeedbackConfigured()).toBe(false);
  });

  test("is true when GITHUB_TOKEN is set", () => {
    process.env.GITHUB_TOKEN = "github_pat_test";
    expect(isFeedbackConfigured()).toBe(true);
  });
});

describe("buildGitHubNewIssueUrl", () => {
  afterEach(() => {
    delete process.env.GITHUB_REPO;
    delete process.env.GITHUB_FEEDBACK_LABEL_BUG;
    delete process.env.GITHUB_FEEDBACK_LABEL_FEATURE;
  });

  test("builds a pre-filled new-issue URL", () => {
    const url = buildGitHubNewIssueUrl({
      type: "bug",
      title: "Broken search",
      body: "Search returns no results.",
      metadata: { pageUrl: "/weapons?q=test" },
    });

    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe(
      `https://github.com/${DEFAULT_GITHUB_REPO}/issues/new`,
    );
    expect(parsed.searchParams.get("title")).toBe("Broken search");
    expect(parsed.searchParams.get("labels")).toBe("bug");
    expect(parsed.searchParams.get("body")).toContain("Search returns no results.");
    expect(parsed.searchParams.get("body")).toContain("- **Page:** /weapons?q=test");
  });
});
