"use client";

import {
  Tooltip,
  TooltipPortal,
  TooltipPopup,
  TooltipPositioner,
  TooltipTrigger,
} from "@repo/ui";
import {
  formatWeaponDpsParts,
  WEAPON_DPS_SHEET_NAME,
  WEAPON_DPS_SHEET_URL,
  type WeaponDpsEntry,
} from "@repo/destiny";

function WeaponDpsAttribution() {
  return (
    <p className="text-muted-foreground mt-2 border-t border-white/10 pt-2 text-sm">
      Community research via{" "}
      <a
        href={WEAPON_DPS_SHEET_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sky-400/90 hover:underline"
      >
        TheAegisRelic&apos;s DPS sheet
      </a>
    </p>
  );
}

function WeaponDpsMetricTooltip({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        delay={0}
        render={<span className="inline-flex cursor-help underline decoration-dotted decoration-muted-foreground/50 underline-offset-2" />}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </TooltipTrigger>
      <TooltipPortal>
        <TooltipPositioner side="left" align="center">
          <TooltipPopup className="max-w-xs">
            <div className="space-y-1">
              <div className="font-semibold">{label}</div>
              <p className="text-muted-foreground text-xs leading-relaxed">{description}</p>
              <WeaponDpsAttribution />
            </div>
          </TooltipPopup>
        </TooltipPositioner>
      </TooltipPortal>
    </Tooltip>
  );
}

/** Total damage / sustained DPS pair with community-source tooltips. */
export function WeaponDpsLabel({ entry }: { entry: WeaponDpsEntry }) {
  const { total, dps } = formatWeaponDpsParts(entry);

  return (
    <span className="text-muted-foreground inline-flex items-center gap-1 text-sm tabular-nums tracking-body">
      <WeaponDpsMetricTooltip
        label="Total damage"
        description={`Total damage dealt during the ${WEAPON_DPS_SHEET_NAME} boss-DPS benchmark for this weapon's optimal community build.`}
      >
        {total}
      </WeaponDpsMetricTooltip>
      <span aria-hidden="true">/</span>
      <WeaponDpsMetricTooltip
        label="DPS"
        description={`Sustained damage per second from the ${WEAPON_DPS_SHEET_NAME} benchmark build.`}
      >
        {dps}
      </WeaponDpsMetricTooltip>
    </span>
  );
}
