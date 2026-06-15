import type { Armor30SetBonus } from "@repo/destiny";
import {
  Tooltip,
  TooltipPortal,
  TooltipPopup,
  TooltipPositioner,
  TooltipTrigger,
} from "@repo/ui";

/** 2-piece / 4-piece set bonus labels with hover tooltips. */
export function ArmorSetBonusChips({ bonuses }: { bonuses: Armor30SetBonus[] }) {
  if (bonuses.length === 0) return null;

  return (
    <span className="inline-flex shrink-0 items-center gap-1.5">
      {bonuses.map((bonus) => (
        <Tooltip key={bonus.requiredSetCount}>
          <TooltipTrigger
            delay={0}
            render={
              <span className="text-muted-foreground underline decoration-dotted decoration-muted-foreground/50 underline-offset-2" />
            }
            onClick={(event) => event.stopPropagation()}
          >
            {bonus.requiredSetCount}-piece
          </TooltipTrigger>
          <TooltipPortal>
            <TooltipPositioner side="top" align="center">
              <TooltipPopup className="max-w-xs">
                <div className="space-y-1">
                  <div className="font-semibold">{bonus.name}</div>
                  {bonus.description ? (
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      {bonus.description}
                    </p>
                  ) : null}
                </div>
              </TooltipPopup>
            </TooltipPositioner>
          </TooltipPortal>
        </Tooltip>
      ))}
    </span>
  );
}
