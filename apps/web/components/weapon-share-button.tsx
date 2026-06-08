"use client";

import { Share2 } from "lucide-react";
import { useCallback, useEffect, useState, type MouseEvent } from "react";
import {
  Button,
  Tooltip,
  TooltipPortal,
  TooltipPopup,
  TooltipPositioner,
  TooltipTrigger,
} from "@repo/ui";

import { copyToClipboard } from "../lib/copy-to-clipboard";

const COPIED_FEEDBACK_MS = 2000;

export function WeaponShareButton({ weaponHash }: { weaponHash: number }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const handleClick = useCallback(
    async (event: MouseEvent) => {
      event.stopPropagation();
      const url = new URL(`/weapon/${weaponHash}`, window.location.origin).href;
      const ok = await copyToClipboard(url);
      if (ok) setCopied(true);
    },
    [weaponHash],
  );

  const label = copied ? "Link copied" : "Copy link to weapon";
  const tooltipText = copied ? "Copied!" : "Share";

  return (
    <Tooltip>
      <TooltipTrigger
        delay={0}
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={label}
            onClick={handleClick}
          />
        }
      >
        <Share2 className="size-4" />
      </TooltipTrigger>
      <TooltipPortal>
        <TooltipPositioner side="bottom" align="end">
          <TooltipPopup>{tooltipText}</TooltipPopup>
        </TooltipPositioner>
      </TooltipPortal>
    </Tooltip>
  );
}
