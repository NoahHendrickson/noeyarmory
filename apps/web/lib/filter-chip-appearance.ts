import { createElement } from "react";
import type { FilterChipElement, FilterChipProps, FilterChipTone } from "@repo/ui";

import { ElementIcon, isElementName } from "../components/element-icon";

export function getFilterChipAppearance(
  categoryId: string,
  value: string,
  elementIcons?: ReadonlyMap<string, string | undefined>,
): Pick<FilterChipProps, "tone" | "element" | "valueIcon" | "hideLabel"> {
  if (categoryId === "trait1" || categoryId === "trait2" || categoryId === "customFilter") {
    return { tone: "trait" satisfies FilterChipTone };
  }

  if (categoryId === "ammo") {
    if (value === "Special") return { tone: "ammo-special" satisfies FilterChipTone };
    if (value === "Heavy") return { tone: "ammo-heavy" satisfies FilterChipTone };
    return { tone: "default" satisfies FilterChipTone };
  }

  if (categoryId === "craftable" && value === "Yes") {
    return {
      hideLabel: true,
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
      valueIcon: createElement(ElementIcon, {
        element: value,
        iconPath: elementIcons?.get(value),
      }),
    };
  }

  if (
    categoryId === "classType" ||
    categoryId === "setName" ||
    categoryId === "archetype" ||
    categoryId === "tertiaryStat" ||
    categoryId === "tunableStat"
  ) {
    return { tone: "trait" satisfies FilterChipTone };
  }

  return { tone: "default" satisfies FilterChipTone };
}
