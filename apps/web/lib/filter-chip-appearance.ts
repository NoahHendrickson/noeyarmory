import { createElement } from "react";
import type { FilterChipElement, FilterChipProps, FilterChipTone } from "@repo/ui";

import { AmmoIcon } from "../components/ammo-icon";
import { ElementIcon, isElementName } from "../components/element-icon";
import { bungieIcon } from "./bungie";
import { PERK_COMBO_CATEGORY_ID } from "./palette/constants";

export interface FilterChipIconMaps {
  elementIcons?: ReadonlyMap<string, string | undefined>;
  weaponTypeIcons?: ReadonlyMap<string, string | undefined>;
  ammoIcons?: ReadonlyMap<string, string | undefined>;
}

export function getFilterChipAppearance(
  categoryId: string,
  value: string,
  iconMaps?: FilterChipIconMaps,
): Pick<FilterChipProps, "tone" | "element" | "valueIcon" | "hideLabel" | "iconOnly"> {
  if (
    categoryId === "trait1" ||
    categoryId === "trait2" ||
    categoryId === PERK_COMBO_CATEGORY_ID ||
    categoryId === "customFilter"
  ) {
    return { tone: "trait" satisfies FilterChipTone };
  }

  if (categoryId === "ammo") {
    const tone =
      value === "Special"
        ? ("ammo-special" satisfies FilterChipTone)
        : value === "Heavy"
          ? ("ammo-heavy" satisfies FilterChipTone)
          : ("ammo-primary" satisfies FilterChipTone);
    return {
      tone,
      hideLabel: true,
      iconOnly: true,
      valueIcon: createElement(AmmoIcon, {
        ammo: value,
        iconPath: iconMaps?.ammoIcons?.get(value),
        className: "size-6",
      }),
    };
  }

  if (categoryId === "craftable" && value === "Yes") {
    return {
      hideLabel: true,
      iconOnly: true,
      valueIcon: createElement("img", {
        src: "/craftable.png",
        alt: "",
        width: 14,
        height: 14,
        className: "size-3.5 shrink-0",
        "aria-hidden": true,
      }),
    };
  }

  if (categoryId === "element") {
    const element: FilterChipElement = isElementName(value) ? value : "Kinetic";
    return {
      tone: "element" satisfies FilterChipTone,
      element,
      hideLabel: true,
      iconOnly: true,
      valueIcon: createElement(ElementIcon, {
        element: value,
        iconPath: iconMaps?.elementIcons?.get(value),
      }),
    };
  }

  if (categoryId === "type") {
    const iconPath = iconMaps?.weaponTypeIcons?.get(value);
    const iconSrc = iconPath
      ? iconPath.startsWith("/weapon-types/")
        ? iconPath
        : bungieIcon(iconPath)
      : undefined;
    return {
      hideLabel: true,
      ...(iconSrc
        ? {
            valueIcon: createElement("img", {
              src: iconSrc,
              alt: "",
              width: 18,
              height: 18,
              className: "h-[18px] w-auto max-w-7 shrink-0 object-contain opacity-80",
              "aria-hidden": true,
            }),
          }
        : {}),
    };
  }

  if (
    categoryId === "classType" ||
    categoryId === "duplicate" ||
    categoryId === "setName" ||
    categoryId === "archetype" ||
    categoryId === "tertiaryStat" ||
    categoryId === "tunableStat"
  ) {
    return { tone: "trait" satisfies FilterChipTone };
  }

  return { tone: "default" satisfies FilterChipTone };
}
