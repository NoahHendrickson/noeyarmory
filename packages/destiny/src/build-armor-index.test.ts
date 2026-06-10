import { describe, expect, test } from "vitest";

import { PLUG_CATEGORY_ARMOR3_MASTERWORKS } from "./armor30-constants";
import { buildArmorIndex } from "./build-armor-index";
import type { ManifestDefs } from "./manifest";

describe("buildArmorIndex", () => {
  test("captures Armor 3.0 set bonus descriptions", () => {
    const index = buildArmorIndex(
      {
        DestinyInventoryItemDefinition: {
          100: {
            hash: 100,
            itemType: 2,
            index: 1,
            displayProperties: { name: "Root Hood", icon: "" },
            sockets: {
              socketCategories: [],
              socketEntries: [{ reusablePlugSetHash: 500 }],
            },
            inventory: { bucketTypeHash: 3448274439, tierTypeName: "Legendary" },
            classType: 2,
            itemTypeDisplayName: "Helmet",
            equippingBlock: { equipableItemSetHash: 700 },
          },
          200: {
            hash: 200,
            plug: { plugCategoryHash: PLUG_CATEGORY_ARMOR3_MASTERWORKS },
            displayProperties: { name: "Armor 3.0 Masterwork", icon: "" },
          },
        },
        DestinyPlugSetDefinition: {
          500: { reusablePlugItems: [{ plugItemHash: 200 }] },
        },
        DestinyStatDefinition: {},
        DestinyCollectibleDefinition: {},
        DestinyPresentationNodeDefinition: {},
        DestinyEquipableItemSetDefinition: {
          700: {
            hash: 700,
            displayProperties: { name: "Nezarec's Nightmare" },
            setPerks: [
              { sandboxPerkHash: 800, requiredSetCount: 2 },
              { sandboxPerkHash: 801, requiredSetCount: 4 },
            ],
          },
        },
        DestinySandboxPerkDefinition: {
          800: {
            hash: 800,
            displayProperties: {
              name: "Bad Dreams",
              description: "Damaging Tormentors grants bonus ability energy.",
            },
          },
          801: {
            hash: 801,
            displayProperties: {
              name: "Dream-Devourer",
              description: "Final blows against Nightmares grant armor charge.",
            },
          },
        },
      } as unknown as ManifestDefs,
      "test",
    );

    expect(index.armor30Sets).toEqual([
      {
        hash: 700,
        name: "Nezarec's Nightmare",
        perkNames: ["Bad Dreams", "Dream-Devourer"],
        perks: [
          {
            name: "Bad Dreams",
            description: "Damaging Tormentors grants bonus ability energy.",
            requiredSetCount: 2,
          },
          {
            name: "Dream-Devourer",
            description: "Final blows against Nightmares grant armor charge.",
            requiredSetCount: 4,
          },
        ],
      },
    ]);
  });
});
