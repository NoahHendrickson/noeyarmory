import "server-only";

import { readFileSync } from "node:fs";

import type { NewArmorIndex } from "@repo/destiny";

import { generatedDataFilePath } from "./generated-data-server";

export function loadNewArmorIndex(): NewArmorIndex {
  return JSON.parse(readFileSync(generatedDataFilePath("newArmor"), "utf8")) as NewArmorIndex;
}

export function tryLoadNewArmorIndex(): NewArmorIndex | undefined {
  try {
    return loadNewArmorIndex();
  } catch {
    return undefined;
  }
}
