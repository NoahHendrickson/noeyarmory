import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { POST } from "./route";

vi.mock("../../../../lib/weapon-index-server", () => ({
  getCanonicalPerkName: vi.fn(),
}));

vi.mock("../../../../lib/popularity/enabled", () => ({
  isPopularityPublishingEnabled: vi.fn(),
}));

vi.mock("../../../../lib/popularity/redis", () => ({
  isPopularityConfigured: vi.fn(),
  recordPerkCommit: vi.fn(),
}));

import { isPopularityPublishingEnabled } from "../../../../lib/popularity/enabled";
import { isPopularityConfigured, recordPerkCommit } from "../../../../lib/popularity/redis";
import { getCanonicalPerkName } from "../../../../lib/weapon-index-server";

const mockedGetCanonicalPerkName = vi.mocked(getCanonicalPerkName);
const mockedIsPopularityPublishingEnabled = vi.mocked(isPopularityPublishingEnabled);
const mockedIsPopularityConfigured = vi.mocked(isPopularityConfigured);
const mockedRecordPerkCommit = vi.mocked(recordPerkCommit);

function post(body: unknown, origin = "https://localhost:4111") {
  return POST(
    new Request("https://localhost:4111/api/events/perk-commit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: origin,
      },
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/events/perk-commit", () => {
  beforeEach(() => {
    mockedGetCanonicalPerkName.mockReturnValue("frenzy");
    mockedIsPopularityPublishingEnabled.mockReturnValue(true);
    mockedIsPopularityConfigured.mockReturnValue(true);
    mockedRecordPerkCommit.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("returns 400 for a non-string perk name", async () => {
    const response = await post({ perkName: 123 });
    expect(response.status).toBe(400);
    expect(mockedRecordPerkCommit).not.toHaveBeenCalled();
  });

  test("returns 400 when the perk is not in the index", async () => {
    mockedGetCanonicalPerkName.mockReturnValue(undefined);
    const response = await post({ perkName: "not-a-real-perk" });
    expect(response.status).toBe(400);
    expect(mockedRecordPerkCommit).not.toHaveBeenCalled();
  });

  test("returns 204 when publishing is disabled", async () => {
    mockedIsPopularityPublishingEnabled.mockReturnValue(false);
    const response = await post({ perkName: "Frenzy" });
    expect(response.status).toBe(204);
    expect(mockedRecordPerkCommit).not.toHaveBeenCalled();
  });

  test("returns 503 when popularity is not configured", async () => {
    mockedIsPopularityConfigured.mockReturnValue(false);
    const response = await post({ perkName: "Frenzy" });
    expect(response.status).toBe(503);
    expect(mockedRecordPerkCommit).not.toHaveBeenCalled();
  });

  test("records a valid perk commit by its canonical name", async () => {
    const response = await post({ perkName: "Frenzy", source: "filter" });
    expect(response.status).toBe(204);
    expect(mockedRecordPerkCommit).toHaveBeenCalledWith("frenzy");
  });

  test("returns 403 for cross-site requests", async () => {
    const response = await post({ perkName: "Frenzy" }, "https://evil.example");
    expect(response.status).toBe(403);
    expect(mockedRecordPerkCommit).not.toHaveBeenCalled();
  });
});
