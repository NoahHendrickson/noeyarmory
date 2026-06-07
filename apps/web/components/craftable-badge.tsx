import { cn } from "@repo/ui";

const CRAFTABLE_ICON = "/craftable.png";

/** Craftable affordance — Destiny shaping icon. */
export function CraftableBadge({ className }: { className?: string }) {
  return (
    <span title="Can be crafted at the engram table" className="inline-flex">
      <img
        src={CRAFTABLE_ICON}
        alt=""
        width={16}
        height={16}
        className={cn("size-4 shrink-0", className)}
        aria-hidden
      />
      <span className="sr-only">Craftable</span>
    </span>
  );
}
