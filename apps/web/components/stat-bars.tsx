import type { WeaponStat } from "@repo/destiny";

/** Stats that read as 0–100 bars; others (RPM, charge time, magazine…) show value only. */
const BAR_STATS = new Set([
  "Impact",
  "Range",
  "Stability",
  "Handling",
  "Reload Speed",
  "Aim Assistance",
  "Zoom",
  "Airborne Effectiveness",
  "Recoil Direction",
  "Blast Radius",
  "Velocity",
  "Shield Duration",
]);

export function StatBars({
  stats,
  baseStats,
}: {
  stats: WeaponStat[];
  /** When provided, show +/- delta badges vs these base values. */
  baseStats?: WeaponStat[];
}) {
  if (stats.length === 0) return null;

  const baseByHash = baseStats
    ? new Map(baseStats.map((stat) => [stat.hash, stat.value]))
    : undefined;

  return (
    <div className="w-full max-w-none space-y-1.5">
      {stats.map((stat) => {
        const showBar = BAR_STATS.has(stat.name);
        const baseValue = baseByHash?.get(stat.hash);
        const delta = baseValue != null ? stat.value - baseValue : 0;
        return (
          <div key={stat.hash} className="flex items-center gap-3 text-base">
            <div className="text-muted-foreground w-24 shrink-0 truncate sm:w-32">{stat.name}</div>
            <div className="bg-muted h-2 flex-1 overflow-hidden rounded">
              {showBar && (
                <div
                  className="bg-primary h-full rounded transition-[width] duration-200"
                  style={{ width: `${Math.max(0, Math.min(100, stat.value))}%` }}
                />
              )}
            </div>
            <div className="flex w-16 shrink-0 items-center justify-end gap-1 tabular-nums">
              <span>{stat.value}</span>
              {delta !== 0 && (
                <span
                  className={
                    delta > 0
                      ? "text-emerald-400 text-xs font-medium"
                      : "text-red-400/90 text-xs font-medium"
                  }
                >
                  {delta > 0 ? `+${delta}` : delta}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
