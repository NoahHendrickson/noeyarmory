import { cn } from "@repo/ui";

import type { OwnedArmorStat } from "../lib/armor-types";
import { ArmorStatIcon } from "./armor-stat-icon";

/** Primary → tertiary stats, plus the tuned stat bonus, as compact icon + value pairs. */
export function ArmorStatsSubtitle({
  stats,
  tunableStat,
  highlightedStatHashes,
  highlightTuning = false,
}: {
  stats: OwnedArmorStat[];
  tunableStat?: string;
  highlightedStatHashes?: ReadonlySet<number>;
  highlightTuning?: boolean;
}) {
  const visible = stats.filter((stat) => stat.value > 0).slice(0, 3);
  const tuned = tunableStat ? stats.find((stat) => stat.name === tunableStat) : undefined;
  if (visible.length === 0) return null;

  return (
    <span className="flex min-w-0 items-center gap-2 overflow-hidden">
      {visible.map((stat) => (
        <span
          key={stat.hash}
          className="inline-flex shrink-0 items-center gap-0.5"
          title={stat.name}
        >
          <ArmorStatIcon
            statHash={stat.hash}
            className={cn(highlightedStatHashes?.has(stat.hash) && "opacity-100")}
          />
          <span
            className={cn(
              "text-muted-foreground tabular-nums",
              highlightedStatHashes?.has(stat.hash) && "text-amber-300",
            )}
          >
            {stat.value}
          </span>
        </span>
      ))}
      {tuned ? (
        <span
          className="inline-flex shrink-0 items-center gap-0.5"
          title={`${tuned.name} tuning`}
        >
          <span
            className={cn(
              "text-foreground/60 tabular-nums",
              highlightTuning && "text-amber-300",
            )}
          >
            +5
          </span>
          <ArmorStatIcon
            statHash={tuned.hash}
            className={cn(highlightTuning && "opacity-100")}
          />
        </span>
      ) : null}
    </span>
  );
}
