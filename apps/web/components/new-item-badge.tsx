import { Badge } from "@repo/ui";

export function NewItemBadge({ className }: { className?: string }) {
  return (
    <Badge variant="default" className={className} aria-label="New item">
      NEW
    </Badge>
  );
}
