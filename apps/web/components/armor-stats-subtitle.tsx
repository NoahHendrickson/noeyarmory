import type { OwnedArmorStat } from "../lib/armor-types";
import { ArmorStatIcon } from "./armor-stat-icon";

/** Primary → tertiary stats, then the remaining rolled stats, as icon + value pairs. */
export function ArmorStatsSubtitle({
  stats,
  tunableStat,
}: {
  stats: OwnedArmorStat[];
  tunableStat?: string;
}) {
  const visible = stats.filter((stat) => stat.value > 0);
  if (visible.length === 0) return null;

  return (
    <span className="flex min-w-0 items-center gap-2 overflow-hidden">
      {visible.map((stat) => (
        <span
          key={stat.hash}
          className="inline-flex shrink-0 items-center gap-0.5"
          title={stat.name}
        >
          <ArmorStatIcon statHash={stat.hash} />
          <span className="text-muted-foreground tabular-nums">
            {stat.value}
            {tunableStat === stat.name ? (
              <span className="text-foreground/60">+5</span>
            ) : null}
          </span>
        </span>
      ))}
    </span>
  );
}
