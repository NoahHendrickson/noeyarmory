"use client";

import Image from "next/image";
import type { MasterworkOption } from "@repo/destiny";
import { cn } from "@repo/ui";

import { bungieIcon } from "../lib/bungie";

export function WeaponMasterworkSelector({
  options,
  selectedStatHash,
  onSelect,
  disabled = false,
}: {
  options: MasterworkOption[];
  selectedStatHash: number | null;
  onSelect: (statHash: number | null) => void;
  disabled?: boolean;
}) {
  if (options.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const selected = selectedStatHash === option.statHash;
          const icon = bungieIcon(option.icon);

          return (
            <button
              key={option.statHash}
              type="button"
              disabled={disabled}
              aria-label={`${option.statName} masterwork`}
              aria-pressed={selected}
              title={`${option.statName} masterwork`}
              onClick={() => onSelect(selected ? null : option.statHash)}
              className={cn(
                "relative shrink-0 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70",
                disabled && "cursor-default opacity-60",
                selected ? "opacity-100" : "opacity-75 hover:opacity-100",
              )}
            >
              {icon ? (
                <Image
                  src={icon}
                  alt=""
                  width={36}
                  height={36}
                  className="size-9 object-contain"
                  unoptimized
                />
              ) : (
                <span className="size-9 bg-muted" />
              )}
            </button>
          );
        })}
    </div>
  );
}
