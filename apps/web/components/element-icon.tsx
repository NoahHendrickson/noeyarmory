import { memo } from "react";
import Image from "next/image";

import { cn } from "@repo/ui";

import { bungieIcon, ELEMENT_COLOR } from "../lib/bungie";

const ELEMENTS = ["Solar", "Arc", "Void", "Stasis", "Strand", "Kinetic"] as const;
export type ElementName = (typeof ELEMENTS)[number];

function isElementName(value: string): value is ElementName {
  return (ELEMENTS as readonly string[]).includes(value);
}

const MASK_STYLE = (src: string) =>
  ({
    maskImage: `url("${src}")`,
    WebkitMaskImage: `url("${src}")`,
    maskSize: "contain",
    WebkitMaskSize: "contain",
    maskRepeat: "no-repeat",
    WebkitMaskRepeat: "no-repeat",
    maskPosition: "center",
    WebkitMaskPosition: "center",
    backgroundColor: "currentColor",
  }) as const;

/** Destiny damage-type icon — Bungie manifest image when available, inline SVG fallback. */
export const ElementIcon = memo(function ElementIcon({
  element,
  iconPath,
  className,
  /** When true, tints the icon to match the element (e.g. Solar orange). Default white for chips. */
  colored = false,
}: {
  element: string;
  /** Bungie manifest icon path from DestinyDamageTypeDefinition. */
  iconPath?: string;
  className?: string;
  colored?: boolean;
}) {
  const name = isElementName(element) ? element : "Kinetic";
  const colorClass = ELEMENT_COLOR[name] ?? "";
  const src = bungieIcon(iconPath);

  if (src && colored) {
    return (
      <span
        aria-hidden
        className={cn("size-3.5 shrink-0 inline-block", colorClass, className)}
        style={MASK_STYLE(src)}
      />
    );
  }

  if (src) {
    return (
      <Image
        src={src}
        alt=""
        width={14}
        height={14}
        className={cn("size-3.5 shrink-0 brightness-0 invert", className)}
        unoptimized
      />
    );
  }

  return (
    <svg
      viewBox="0 0 16 16"
      className={cn("size-3.5 shrink-0", colored ? colorClass : "text-white", className)}
      aria-hidden
      fill="currentColor"
    >
      {name === "Solar" && (
        <path d="M8 2.5c.3 1.8 1.5 3.2 3.2 3.5-1.8.3-3.2 1.5-3.5 3.2-.3-1.8-1.5-3.2-3.2-3.5 1.8-.3 3.2-1.5 3.5-3.2zm0 2.8a2.7 2.7 0 1 0 0 5.4 2.7 2.7 0 0 0 0-5.4z" />
      )}
      {name === "Arc" && (
        <path d="M9.2 2 5.8 8.2H8L6.8 14l3.4-6.2H8.2L9.2 2z" />
      )}
      {name === "Void" && (
        <path d="M8 3c2.8 0 5 2.2 5 5s-2.2 5-5 5-5-2.2-5-5 2.2-5 5-5zm0 1.8a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4z" />
      )}
      {name === "Stasis" && (
        <path d="M8 2.2 9.8 6h3.4l-2.8 2 1 3.4L8 10.8 4.6 11.8l1-3.4-2.8-2h3.4L8 2.2zm0 3.4-1 1.8H5.4l1.6 1.2-.6 2L8 9.4l1.6 1.2-.6-2 1.6-1.2H9l-1-1.8z" />
      )}
      {name === "Strand" && (
        <>
          <path
            d="M3.5 8c1.8-2 3.8-1.6 4.8-.4 1 1.2 1.2 3-.2 4.4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <path
            d="M12.5 8c-1.8-2-3.8-1.6-4.8-.4-1 1.2-1.2 3 .2 4.4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </>
      )}
      {name === "Kinetic" && (
        <path d="M8 3a5 5 0 1 0 0 10A5 5 0 0 0 8 3zm0 1.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7z" />
      )}
    </svg>
  );
});

export { isElementName };
