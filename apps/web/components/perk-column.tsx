import Image from "next/image";
import Link from "next/link";
import { cn } from "@repo/ui";
import type { PerkColumn } from "@repo/destiny";

import { bungieIcon } from "../lib/bungie";

export function PerkColumnView({ column }: { column: PerkColumn }) {
  return (
    <div className="space-y-2">
      <div className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        {column.kind}
      </div>
      <ul className="space-y-0.5">
        {column.perks.map((perk) => {
          const icon = bungieIcon(perk.icon);
          return (
            <li key={perk.hash}>
              <Link
                href={`/perk/${perk.hash}`}
                title={`See every weapon that can roll ${perk.name}`}
                className={cn(
                  "hover:bg-accent flex items-center gap-2 rounded-md px-2 py-1 text-sm transition-colors",
                  !perk.currentlyCanRoll && "opacity-45",
                )}
              >
                {icon ? (
                  <Image
                    src={icon}
                    alt=""
                    width={20}
                    height={20}
                    className="size-5 shrink-0"
                    unoptimized
                  />
                ) : (
                  <span className="bg-muted size-5 shrink-0 rounded-full" />
                )}
                <span className="truncate">{perk.name}</span>
                {!perk.currentlyCanRoll && (
                  <span className="text-muted-foreground ml-auto text-[10px] uppercase">retired</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
