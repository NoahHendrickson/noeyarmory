import { PinOff } from "lucide-react";
import { abbreviateWeaponType, type WeaponSummary } from "@repo/destiny";
import { cn, FrostedShell } from "@repo/ui";

import { bungieIcon } from "../lib/bungie";

interface PinnedWeaponsRailProps {
  weapons: WeaponSummary[];
  onSelectWeapon: (hash: number) => void;
  onUnpinWeapon: (hash: number) => void;
  className?: string;
}

export function PinnedWeaponsRail({
  weapons,
  onSelectWeapon,
  onUnpinWeapon,
  className,
}: PinnedWeaponsRailProps) {
  if (weapons.length === 0) return null;

  return (
    <section className={cn("w-full", className)} aria-label="Pinned weapons">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {weapons.map((weapon) => {
          const icon = bungieIcon(weapon.icon);
          const watermark = bungieIcon(weapon.watermark);

          return (
            <FrostedShell key={weapon.hash} className="group rounded-xl">
              <div className="flex min-w-0 items-center gap-2 p-2">
                <button
                  type="button"
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left"
                  onClick={() => onSelectWeapon(weapon.hash)}
                >
                  <span className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-[4px] bg-muted">
                    {icon ? (
                      <img
                        src={icon}
                        alt=""
                        width={40}
                        height={40}
                        className="size-full"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : null}
                    {watermark ? (
                      <img
                        src={watermark}
                        alt=""
                        width={40}
                        height={40}
                        className="absolute inset-0 size-full"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : null}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-medium tracking-body text-white">
                      {weapon.name}
                    </span>
                    <span className="block truncate text-[11px] tracking-body text-muted-foreground">
                      {weapon.frame ?? abbreviateWeaponType(weapon.type)}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={`Unpin ${weapon.name}`}
                  className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
                  onClick={() => onUnpinWeapon(weapon.hash)}
                >
                  <PinOff className="size-3.5" />
                </button>
              </div>
            </FrostedShell>
          );
        })}
      </div>
    </section>
  );
}
