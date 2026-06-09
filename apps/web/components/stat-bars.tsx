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
  "Ammo Generation",
]);

/** Bar stats pinned just above Magazine/RPM at the bottom. */
const PRE_BOTTOM_STATS = ["Airborne Effectiveness", "Recoil Direction", "Zoom"] as const;

/** Plain label+value rows pinned to the very bottom of the stat list. */
const BOTTOM_STATS = new Set(["Magazine", "Rounds Per Minute"]);

const PRE_BOTTOM_STAT_SET = new Set<string>(PRE_BOTTOM_STATS);

function orderStatsForDisplay(stats: WeaponStat[]): WeaponStat[] {
  const main: WeaponStat[] = [];
  const preBottomByName = new Map<string, WeaponStat>();
  const bottom: WeaponStat[] = [];
  for (const stat of stats) {
    if (BOTTOM_STATS.has(stat.name)) {
      bottom.push(stat);
    } else if (PRE_BOTTOM_STAT_SET.has(stat.name)) {
      preBottomByName.set(stat.name, stat);
    } else {
      main.push(stat);
    }
  }
  const preBottom = PRE_BOTTOM_STATS.flatMap((name) => {
    const stat = preBottomByName.get(name);
    return stat ? [stat] : [];
  });
  return [...main, ...preBottom, ...bottom];
}

function clampBarPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function StatValueDisplay({
  value,
  delta,
  deltaClassName,
}: {
  value: number;
  delta: number;
  deltaClassName: string;
}) {
  return (
    <span className="flex shrink-0 items-center gap-0.5 tabular-nums">
      <span>{value}</span>
      {delta !== 0 && (
        <span
          className={
            delta > 0
              ? `font-medium text-emerald-400 ${deltaClassName}`
              : `font-medium text-red-400/90 ${deltaClassName}`
          }
        >
          {delta > 0 ? `+${delta}` : delta}
        </span>
      )}
    </span>
  );
}

function StatBarTrack({
  showBar,
  value,
  baseValue,
  delta,
  heightClass,
}: {
  showBar: boolean;
  value: number;
  baseValue: number | undefined;
  delta: number;
  heightClass: string;
}) {
  return (
    <div className={`overflow-hidden rounded bg-muted ${heightClass}`}>
      {showBar && (
        <div className="flex h-full">
          {baseValue != null && delta > 0 ? (
            <>
              <div
                className="h-full shrink-0 bg-primary transition-[width] duration-[var(--motion-duration-medium)] ease-spring-smooth motion-reduce:transition-none"
                style={{ width: `${clampBarPercent(baseValue)}%` }}
              />
              <div
                className="h-full shrink-0 bg-primary/45 transition-[width] duration-[var(--motion-duration-medium)] ease-spring-smooth motion-reduce:transition-none"
                style={{ width: `${clampBarPercent(delta)}%` }}
              />
            </>
          ) : (
            <div
              className="h-full rounded bg-primary transition-[width] duration-[var(--motion-duration-medium)] ease-spring-smooth motion-reduce:transition-none"
              style={{ width: `${clampBarPercent(value)}%` }}
            />
          )}
        </div>
      )}
    </div>
  );
}

export function StatBars({
  stats,
  baseStats,
  compact = false,
}: {
  stats: WeaponStat[];
  /** When provided, show +/- delta badges vs these base values. */
  baseStats?: WeaponStat[];
  /** Tighter single-column layout for the weapon detail sidebar. */
  compact?: boolean;
}) {
  const visibleStats = orderStatsForDisplay(stats.filter((stat) => stat.value > 0));
  if (visibleStats.length === 0) return null;

  const baseByHash = baseStats
    ? new Map(baseStats.map((stat) => [stat.hash, stat.value]))
    : undefined;

  if (compact) {
    return (
      <div className="w-full space-y-2.5 pb-0.5">
        {visibleStats.map((stat) => {
          const showBar = BAR_STATS.has(stat.name);
          const baseValue = baseByHash?.get(stat.hash);
          const delta = baseValue != null ? stat.value - baseValue : 0;
          const displayValue = baseValue != null && delta !== 0 ? baseValue : stat.value;
          return (
            <div key={stat.hash} className="min-w-0">
              <div className="flex items-baseline justify-between gap-1 text-xs">
                <span className="truncate text-muted-foreground" title={stat.name}>
                  {stat.name}
                </span>
                <StatValueDisplay value={displayValue} delta={delta} deltaClassName="text-[10px]" />
              </div>
              {showBar && (
                <StatBarTrack
                  showBar
                  value={stat.value}
                  baseValue={baseValue}
                  delta={delta}
                  heightClass="mt-1 h-1.5"
                />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="w-full max-w-none space-y-1.5">
      {visibleStats.map((stat) => {
        const showBar = BAR_STATS.has(stat.name);
        const baseValue = baseByHash?.get(stat.hash);
        const delta = baseValue != null ? stat.value - baseValue : 0;
        const displayValue = baseValue != null && delta !== 0 ? baseValue : stat.value;
        return (
          <div key={stat.hash} className="flex items-center gap-3 text-base">
            <div className="w-24 shrink-0 truncate text-muted-foreground sm:w-32">{stat.name}</div>
            {showBar ? (
              <>
                <StatBarTrack
                  showBar
                  value={stat.value}
                  baseValue={baseValue}
                  delta={delta}
                  heightClass="h-2 flex-1"
                />
                <div className="w-16 shrink-0">
                  <StatValueDisplay value={displayValue} delta={delta} deltaClassName="text-xs" />
                </div>
              </>
            ) : (
              <div className="ml-auto shrink-0">
                <StatValueDisplay value={displayValue} delta={delta} deltaClassName="text-xs" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
