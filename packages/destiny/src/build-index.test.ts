import type { DestinyInventoryItemDefinition } from "bungie-api-ts/destiny2";
import { describe, expect, it } from "vitest";

import { buildColumnPerks, buildDamageTypeCatalog, buildWeaponTypeCatalog } from "./build-index";
import type { ManifestDefs } from "./manifest";
function traitPlug(
  hash: number,
  name: string,
  description: string,
  tierType: 2 | 3,
): DestinyInventoryItemDefinition {
  return {
    hash,
    displayProperties: { name, description, icon: "" },
    inventory: { tierType },
    plug: { plugCategoryIdentifier: "frames" },
  } as DestinyInventoryItemDefinition;
}

describe("buildDamageTypeCatalog", () => {
  it("collects display names and icons from DestinyDamageTypeDefinition", () => {
    const defs = {
      DestinyDamageTypeDefinition: {
        1: {
          hash: 1,
          displayProperties: {
            name: "Arc",
            icon: "/common/destiny2_content/icons/arc.png",
          },
        },
        2: {
          hash: 2,
          redacted: true,
          displayProperties: { name: "Hidden", icon: "/hidden.png" },
        },
        3: {
          hash: 3,
          displayProperties: { name: "Solar", icon: "/common/destiny2_content/icons/solar.png" },
        },
      },
    } as unknown as ManifestDefs;

    expect(buildDamageTypeCatalog(defs)).toEqual([
      { hash: 1, name: "Arc", icon: "/common/destiny2_content/icons/arc.png" },
      { hash: 3, name: "Solar", icon: "/common/destiny2_content/icons/solar.png" },
    ]);
  });
});

describe("buildWeaponTypeCatalog", () => {
  it("maps present weapon types to generic Bungie silhouette icons", () => {
    const defs = {
      DestinyInventoryItemDefinition: {
        100: {
          hash: 100,
          itemType: 3,
          itemTypeDisplayName: "Hand Cannon",
          displayProperties: { name: "Better Gun", icon: "/specific-gun.jpg" },
        },
        200: {
          hash: 200,
          itemType: 3,
          itemTypeDisplayName: "Fusion Rifle",
          displayProperties: { name: "Zeta Fusion", icon: "/another-gun.jpg" },
        },
        300: {
          hash: 300,
          itemType: 2,
          itemTypeDisplayName: "Helmet",
          displayProperties: { name: "Helm", icon: "/helm.jpg" },
        },
      },
    } as unknown as ManifestDefs;

    expect(buildWeaponTypeCatalog(defs)).toEqual([
      { name: "Fusion Rifle", icon: "/weapon-types/fusion_rifle.svg" },
      { name: "Hand Cannon", icon: "/weapon-types/hand_cannon.svg" },
    ]);
  });
});

describe("buildColumnPerks", () => {
  it("captures base and enhanced descriptions without conflating them", () => {
    const items: Record<number, DestinyInventoryItemDefinition> = {
      1: traitPlug(1, "Rampage", "Kills grant increased damage.", 2),
      2: traitPlug(2, "Rampage", "Kills grant increased damage. Stacks last longer.", 3),
      3: traitPlug(3, "Outlaw", "Precision kills increase reload speed.", 2),
    };

    const { perks } = buildColumnPerks(
      [
        { hash: 1, canRoll: true },
        { hash: 2, canRoll: true },
        { hash: 3, canRoll: true },
      ],
      items,
    );

    expect(perks).toHaveLength(2);

    const rampage = perks.find((perk) => perk.name === "Rampage");
    expect(rampage).toMatchObject({
      hash: 1,
      description: "Kills grant increased damage.",
      enhancedDescription: "Kills grant increased damage. Stacks last longer.",
      alternateHashes: [2],
    });

    const outlaw = perks.find((perk) => perk.name === "Outlaw");
    expect(outlaw).toMatchObject({
      hash: 3,
      description: "Precision kills increase reload speed.",
      enhancedDescription: undefined,
      alternateHashes: undefined,
    });
  });

  it("preserves enhanced metadata when the enhanced plug appears before the base plug", () => {
    const items: Record<number, DestinyInventoryItemDefinition> = {
      10: traitPlug(10, "Frenzy", "While active, this weapon gains bonus damage.", 3),
      11: traitPlug(
        11,
        "Frenzy",
        "While active, this weapon gains bonus damage. Duration increased.",
        2,
      ),
    };

    const { perks } = buildColumnPerks(
      [{ hash: 10, canRoll: true }, { hash: 11, canRoll: true }],
      items,
    );

    expect(perks).toEqual([
      {
        hash: 11,
        name: "Frenzy",
        icon: undefined,
        currentlyCanRoll: true,
        description: "While active, this weapon gains bonus damage. Duration increased.",
        enhancedDescription: "While active, this weapon gains bonus damage.",
        alternateHashes: [10],
      },
    ]);
  });
});
