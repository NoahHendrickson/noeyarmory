import { describe, expect, it } from "vitest";

import { hasClearableInput, resolveEscapeStep } from "./progressive-escape";

describe("hasClearableInput", () => {
  it("clears values panel input including whitespace-only", () => {
    expect(hasClearableInput("values", "fire", "")).toBe(true);
    expect(hasClearableInput("values", "   ", "")).toBe(true);
    expect(hasClearableInput("values", "", "")).toBe(false);
  });

  it("ignores whitespace-only main query", () => {
    expect(hasClearableInput("categories", "", "slot")).toBe(true);
    expect(hasClearableInput("categories", "", "   ")).toBe(false);
    expect(hasClearableInput("categories", "", "")).toBe(false);
  });
});

describe("resolveEscapeStep", () => {
  it("prefers clear, then back, then close", () => {
    expect(resolveEscapeStep("categories", "", "slot")).toBe("clear");
    expect(resolveEscapeStep("values", "fire", "")).toBe("clear");
    expect(resolveEscapeStep("values", "", "")).toBe("back");
    expect(resolveEscapeStep("categories", "", "")).toBe("close");
  });
});
