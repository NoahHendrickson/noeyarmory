import { cn } from "@repo/ui";
import type { FacetOption } from "@repo/destiny";

export function FacetFilter({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: FacetOption[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  if (options.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <div className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        {label}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const active = selected.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(option.value)}
              className={cn(
                "rounded-md border px-2 py-1 text-xs transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:bg-accent",
              )}
            >
              {option.value} <span className="opacity-60">{option.count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
