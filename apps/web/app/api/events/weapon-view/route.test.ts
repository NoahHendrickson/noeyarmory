import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { POST } from "./route";

vi.mock("../../../../lib/weapon-index-server", () => ({
  getWeaponSummary: vi.fn(),
}));

vi.mock("../../../../lib/popularity/enabled", () => ({
  isPopularityPublishingEnabled: vi.fn(),
}));

vi.mock("../../../../lib/popularity/redis", () => ({
  isPopularityConfigured: vi.fn(),
  recordWeaponView: vi.fn(),
}));

import { isPopularityPublishingEnabled } from "../../../../lib/popularity/enabled";
import { isPopularityConfigured, recordWeaponView } from "../../../../lib/popularity/redis";
import { getWeaponSummary } from "../../../../lib/weapon-index-server";

const mockedGetWeaponSummary = vi.mocked(getWeaponSummary);
const mockedIsPopularityPublishingEnabled = vi.mocked(isPopularityPublishingEnabled);
const mockedIsPopularityConfigured = vi.mocked(isPopularityConfigured);
const mockedRecordWeaponView = vi.mocked(recordWeaponView);

function post(body: unknown, origin = "https://localhost:4111") {
  return POST(
    new Request("https://localhost:4111/api/events/weapon-view", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: origin,
      },
      body: JSON.stringify(body),
    }),
  );
}

describe("POST /api/events/weapon-view", () => {
  beforeEach(() => {
    mockedGetWeaponSummary.mockReturnValue({ hash: 1, name: "Fatebringer" } as never);
    mockedIsPopularityPublishingEnabled.mockReturnValue(true);
    mockedIsPopularityConfigured.mockReturnValue(true);
    mockedRecordWeaponView.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("returns 400 for invalid weapon hash", async () => {
    const response = await post({ weaponHash: "not-a-number" });
    expect(response.status).toBe(400);
    expect(mockedRecordWeaponView).not.toHaveBeenCalled();
  });

  test("returns 400 when weapon is not in the index", async () => {
    mockedGetWeaponSummary.mockReturnValue(undefined);
    const response = await post({ weaponHash: 999 });
    expect(response.status).toBe(400);
    expect(mockedRecordWeaponView).not.toHaveBeenCalled();
  });

  test("returns 204 when publishing is disabled", async () => {
    mockedIsPopularityPublishingEnabled.mockReturnValue(false);
    const response = await post({ weaponHash: 1 });
    expect(response.status).toBe(204);
    expect(mockedRecordWeaponView).not.toHaveBeenCalled();
  });

  test("returns 503 when popularity is not configured", async () => {
    mockedIsPopularityConfigured.mockReturnValue(false);
    const response = await post({ weaponHash: 1 });
    expect(response.status).toBe(503);
    expect(mockedRecordWeaponView).not.toHaveBeenCalled();
  });

  test("records a valid weapon view", async () => {
    const response = await post({ weaponHash: 1, source: "search" });
    expect(response.status).toBe(204);
    expect(mockedRecordWeaponView).toHaveBeenCalledWith(1);
  });

  test("returns 403 for cross-site requests", async () => {
    const response = await post({ weaponHash: 1 }, "https://evil.example");
    expect(response.status).toBe(403);
    expect(mockedRecordWeaponView).not.toHaveBeenCalled();
  });
});
