import { cn } from "@repo/ui";

export function WeaponNavigationStatus({ className }: { className?: string }) {
  return (
    <p role="status" className={cn("text-sm text-muted-foreground", className)}>
      Opening weapon...
    </p>
  );
}
