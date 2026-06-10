import { Badge, cn } from "@repo/ui";

export function NewItemBadge({ className }: { className?: string }) {
  return (
    <Badge
      variant="default"
      className={cn("rounded-full px-1 py-0 text-[9px] leading-none", className)}
      aria-label="New item"
    >
      NEW
    </Badge>
  );
}
