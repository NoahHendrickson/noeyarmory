import { describe, expect, it } from "vitest";

import { PLUG_CATEGORY_ARMOR3_MASTERWORKS } from "./armor30-constants";
import { buildArmorIndex } from "./build-armor-index";
import type { ManifestDefs } from "./manifest";

const HELMET_BUCKET = 3448274439;
const ARMOR_HASH = 1001;
const SET_HASH = 9001;
const MASTERWORK_PLUG = 50;
const PERK_2_HASH = 5001;
const PERK_4_HASH = 5002;

function minimalArmor30Defs(): ManifestDefs {
  return {
    DestinyInventoryItemDefinition: {
      [ARMOR_HASH]: {
        hash: ARMOR_HASH,
        itemType: 2,
        index: 1,
        redacted: false,
        displayProperties: { name: "Test Virtuous Helm" },
        inventory: { bucketTypeHash: HELMET_BUCKET, tierTypeName: "Legendary" },
        classType: 1,
        itemTypeDisplayName: "Helmet",
        sockets: {
          socketEntries: [{ reusablePlugSetHash: 1 }],
          socketCategories: [],
        },
        equippingBlock: { equipableItemSetHash: SET_HASH },
        stats: { stats: {} },
      },
    },
    DestinyPlugSetDefinition: {
      1: {
        reusablePlugItems: [{ plugItemHash: MASTERWORK_PLUG, currentlyCanRoll: true }],
      },
    },
    DestinyStatDefinition: {},
    DestinyStatGroupDefinition: {},
    DestinyDamageTypeDefinition: {},
    DestinySeasonDefinition: {},
    DestinyCollectibleDefinition: {},
    DestinyPresentationNodeDefinition: {},
    DestinyEquipableItemSetDefinition: {
      [SET_HASH]: {
        hash: SET_HASH,
        displayProperties: { name: "Virtuous" },
        setPerks: [
          { requiredSetCount: 4, sandboxPerkHash: PERK_4_HASH },
          { requiredSetCount: 2, sandboxPerkHash: PERK_2_HASH },
        ],
      },
    },
    DestinySandboxPerkDefinition: {
      [PERK_2_HASH]: {
        hash: PERK_2_HASH,
        displayProperties: {
          name: "Virtuous Synergy",
          description: "Rapidly defeating targets increases weapon damage.",
        },
      },
      [PERK_4_HASH]: {
        hash: PERK_4_HASH,
        displayProperties: {
          name: "Virtuous Purpose",
          description: "Defeating targets extends Virtuous Synergy.",
        },
      },
    },
  } as unknown as ManifestDefs;
}

describe("buildArmorIndex", () => {
  it("extracts structured set bonuses with requiredSetCount, name, and description", () => {
    const defs = minimalArmor30Defs();
    defs.DestinyInventoryItemDefinition[MASTERWORK_PLUG] = {
      hash: MASTERWORK_PLUG,
      plug: { plugCategoryHash: PLUG_CATEGORY_ARMOR3_MASTERWORKS },
    } as (typeof defs.DestinyInventoryItemDefinition)[number];

    const index = buildArmorIndex(defs, "test");

    expect(index.armor30Sets).toEqual([
      {
        hash: SET_HASH,
        name: "Virtuous",
        bonuses: [
          {
            requiredSetCount: 2,
            name: "Virtuous Synergy",
            description: "Rapidly defeating targets increases weapon damage.",
          },
          {
            requiredSetCount: 4,
            name: "Virtuous Purpose",
            description: "Defeating targets extends Virtuous Synergy.",
          },
        ],
      },
    ]);

    const piece = index.armor.find((a) => a.hash === ARMOR_HASH);
    expect(piece?.setHash).toBe(SET_HASH);
    expect(piece?.setName).toBe("Virtuous");
    expect(piece?.isArmor30).toBe(true);
  });
});
