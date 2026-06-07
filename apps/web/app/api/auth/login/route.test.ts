import { NextRequest } from "next/server";
import { describe, expect, test, vi } from "vitest";

import { GET } from "./route";

vi.mock("../../../../lib/bungie-auth", () => ({
  getAuthorizeUrl: vi.fn((state: string) => `https://bungie.test/authorize?state=${state}`),
  newOAuthState: vi.fn(() => "test-state"),
}));

vi.mock("../../../../lib/session", () => ({
  getSession: vi.fn(),
}));

import { getSession } from "../../../../lib/session";

const mockedGetSession = vi.mocked(getSession);

describe("GET /api/auth/login", () => {
  test("stores oauth state and redirects to Bungie", async () => {
    const save = vi.fn();
    mockedGetSession.mockResolvedValue({ save } as unknown as Awaited<
      ReturnType<typeof getSession>
    >);

    const request = new NextRequest(
      "https://localhost:4111/api/auth/login?returnTo=%2F%3Fmode%3Darmor",
    );
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("Location")).toBe("https://bungie.test/authorize?state=test-state");
    expect(save).toHaveBeenCalled();
  });
});
