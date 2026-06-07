import { describe, expect, test } from "vitest";

import { isSameOriginRequest } from "./request-guards";

describe("isSameOriginRequest", () => {
  test("allows requests with matching origin", () => {
    const request = new Request("https://example.com/api/armor/equip", {
      method: "POST",
      headers: { Origin: "https://example.com" },
    });

    expect(isSameOriginRequest(request)).toBe(true);
  });

  test("rejects requests with cross-site fetch metadata", () => {
    const request = new Request("https://example.com/api/armor/equip", {
      method: "POST",
      headers: { "Sec-Fetch-Site": "cross-site" },
    });

    expect(isSameOriginRequest(request)).toBe(false);
  });

  test("rejects mismatched origin", () => {
    const request = new Request("https://example.com/api/armor/equip", {
      method: "POST",
      headers: { Origin: "https://evil.example" },
    });

    expect(isSameOriginRequest(request)).toBe(false);
  });
});
