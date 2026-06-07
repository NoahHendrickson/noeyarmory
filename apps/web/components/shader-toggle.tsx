"use client";

import {
  Switch,
  Tooltip,
  TooltipPopup,
  TooltipPortal,
  TooltipPositioner,
  TooltipTrigger,
} from "@repo/ui";

import { useShaderPreference } from "../lib/shader-preference";

export function ShaderToggle() {
  const { enabled, setEnabled } = useShaderPreference();

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span className="bg-background/80 inline-flex rounded-md p-1.5 backdrop-blur-sm" />
        }
      >
        <Switch
          checked={enabled}
          onCheckedChange={setEnabled}
          aria-label="Background animation"
        />
      </TooltipTrigger>
      <TooltipPortal>
        <TooltipPositioner>
          <TooltipPopup>
            {enabled ? "Background animation on" : "Background animation off"}
          </TooltipPopup>
        </TooltipPositioner>
      </TooltipPortal>
    </Tooltip>
  );
}
