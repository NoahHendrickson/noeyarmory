"use client";

import Link from "next/link";
import { FrostedToolbarButton } from "@repo/ui";

export function NewArmorButton() {
  return (
    <FrostedToolbarButton
      render={<Link href="/armor/new" />}
      aria-label="View new armor"
      data-palette-ignore-close
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      New armor
    </FrostedToolbarButton>
  );
}
