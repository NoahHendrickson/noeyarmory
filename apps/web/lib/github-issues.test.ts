import { afterEach, describe, expect, test } from "vitest";

import { DEFAULT_GITHUB_REPO, getFeedbackRepo, isFeedbackConfigured } from "./github-issues";

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
