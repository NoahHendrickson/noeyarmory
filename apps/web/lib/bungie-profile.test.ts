import { describe, expect, test } from "vitest";

import { resolveCharacterForArmor, type CharacterRef } from "./bungie-profile";

describe("resolveCharacterForArmor", () => {
  const characters: CharacterRef[] = [
    { characterId: "1", classType: "Titan" },
    { characterId: "2", classType: "Hunter" },
  ];

  test("matches class-specific armor to character id", () => {
    expect(resolveCharacterForArmor("Hunter", characters)).toBe("2");
  });

  test("returns undefined when class is missing", () => {
    expect(resolveCharacterForArmor("Warlock", characters)).toBeUndefined();
  });
});
