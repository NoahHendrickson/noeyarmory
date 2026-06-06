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

export function StatBars({ stats }: { stats: WeaponStat[] }) {
  if (stats.length === 0) return null;
  return (
    <div className="max-w-md space-y-1.5">
      {stats.map((stat) => {
        const showBar = BAR_STATS.has(stat.name);
        return (
          <div key={stat.hash} className="flex items-center gap-3 text-sm">
            <div className="text-muted-foreground w-32 shrink-0 truncate">{stat.name}</div>
            <div className="bg-muted h-2 flex-1 overflow-hidden rounded">
              {showBar && (
                <div
                  className="bg-primary h-full rounded"
                  style={{ width: `${Math.max(0, Math.min(100, stat.value))}%` }}
                />
              )}
            </div>
            <div className="w-10 shrink-0 text-right tabular-nums">{stat.value}</div>
          </div>
        );
      })}
    </div>
  );
}
