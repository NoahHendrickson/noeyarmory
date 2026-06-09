import type { OwnedArmorItem, OwnedArmorStat } from "../lib/armor-types";
import { ArmorSetBonusChips } from "./armor-set-bonus-chips";
import { ArmorStatsSubtitle } from "./armor-stats-subtitle";

function armorCaption(armor: OwnedArmorItem): string {
  if (armor.isArmor30 && armor.archetype) return armor.archetype;
  return `${armor.slot} · ${armor.classType}`;
}

function hasVisibleStats(stats: OwnedArmorStat[] | undefined): stats is OwnedArmorStat[] {
  return stats != null && stats.some((stat) => stat.value > 0);
}

function CaptionSeparator() {
  return <span className="text-muted-foreground/60 shrink-0">·</span>;
}

/** Caption, rolled stats, and set bonus chips below an armor result title. */
export function ArmorResultSubtitle({ armor }: { armor: OwnedArmorItem }) {
  const caption = armorCaption(armor);
  const stats = armor.stats;
  const showStats = hasVisibleStats(stats);
  const setBonuses = armor.setBonuses;
  const showSetBonuses = (setBonuses?.length ?? 0) > 0;

  if (!caption && !showStats && !showSetBonuses) return null;

  return (
    <span className="flex min-w-0 items-center gap-2 overflow-hidden">
      {caption ? (
        <span className="text-muted-foreground shrink-0">{caption}</span>
      ) : null}
      {caption && (showStats || showSetBonuses) ? <CaptionSeparator /> : null}
      {showStats ? (
        <ArmorStatsSubtitle stats={stats} tunableStat={armor.tunableStat} />
      ) : null}
      {showStats && showSetBonuses ? <CaptionSeparator /> : null}
      {showSetBonuses && setBonuses ? <ArmorSetBonusChips bonuses={setBonuses} /> : null}
    </span>
  );
}
