"use client";

import { LinkSimple } from "@phosphor-icons/react";
import { useCallback, type MouseEvent } from "react";
import {
  Button,
  Tooltip,
  TooltipPortal,
  TooltipPopup,
  TooltipPositioner,
  TooltipTrigger,
} from "@repo/ui";

import { copyToClipboard } from "../lib/copy-to-clipboard";
import { useCursorCopiedFeedback } from "../lib/use-cursor-copied-feedback";

export function WeaponShareButton({ weaponHash }: { weaponHash: number }) {
  const { showCopiedAtCursor, pill } = useCursorCopiedFeedback();

  const handleClick = useCallback(
    async (event: MouseEvent) => {
      event.stopPropagation();
      const url = new URL(`/weapon/${weaponHash}`, window.location.origin).href;
      const ok = await copyToClipboard(url);
      if (ok) showCopiedAtCursor(event);
    },
    [showCopiedAtCursor, weaponHash],
  );

  return (
    <>
      {pill}
      <Tooltip>
        <TooltipTrigger
          delay={0}
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Copy link to weapon"
              onClick={handleClick}
            />
          }
        >
          <LinkSimple className="size-4" weight="duotone" />
        </TooltipTrigger>
        <TooltipPortal>
          <TooltipPositioner side="bottom" align="end">
            <TooltipPopup>Share</TooltipPopup>
          </TooltipPositioner>
        </TooltipPortal>
      </Tooltip>
    </>
  );
}
