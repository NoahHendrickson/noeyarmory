"use client";

import { Button, cn } from "@repo/ui";
import {
  Popover,
  PopoverClose,
  PopoverDescription,
  PopoverPopup,
  PopoverPortal,
  PopoverPositioner,
  PopoverTitle,
  PopoverTrigger,
} from "@repo/ui/components/popover";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

import {
  hasUnseenChangelog,
  markChangelogSeen,
  useChangelog,
  type ChangelogRelease,
} from "../lib/use-changelog";

const sectionClass = "border-b border-white/16 p-4";
const headerTitleClass = "text-base font-normal";
const headerDescriptionClass = "text-xs leading-snug text-white/60";
const secondaryButtonClass =
  "h-7 rounded-[8px] border border-white/16 bg-white/[0.04] px-2 text-xs font-medium text-white hover:bg-white/10 hover:text-white";

const popupClassName =
  "max-h-[min(85vh,var(--available-height))] w-[min(400px,var(--available-width))] overflow-hidden rounded-[16px] p-0 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]";

function formatReleaseDate(date: string | null): string | null {
  if (!date) return null;
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function ReleaseBlock({ release, isLatest }: { release: ChangelogRelease; isLatest: boolean }) {
  const formattedDate = formatReleaseDate(release.date);

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-medium text-foreground">v{release.version}</h3>
        {formattedDate && <span className="text-muted-foreground text-xs">{formattedDate}</span>}
        {isLatest && (
          <span className="rounded-pill bg-primary/20 text-primary inline-flex h-5 items-center px-2.5 text-[10px] font-medium leading-none">
            Current
          </span>
        )}
      </div>
      {release.sections.map((section) => (
        <div key={section.title} className="space-y-1">
          <h4 className="text-muted-foreground text-xs font-medium">{section.title}</h4>
          <ul className="text-foreground list-disc space-y-1 pl-4 text-xs leading-relaxed">
            {section.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

export function ChangelogDialog() {
  const { data, loading, error } = useChangelog();
  const [open, setOpen] = useState(false);
  const [showBadge, setShowBadge] = useState(false);

  useEffect(() => {
    setShowBadge(hasUnseenChangelog(data));
  }, [data]);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen && data) {
      markChangelogSeen(data.version);
      setShowBadge(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange} modal={false}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            aria-label="What's new"
            data-palette-ignore-close
            className={cn(secondaryButtonClass, "relative px-3 backdrop-blur-sm")}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          />
        }
      >
        What&apos;s new
        {showBadge && (
          <span
            className="bg-primary absolute -top-0.5 -right-0.5 size-2 rounded-full"
            aria-hidden="true"
          />
        )}
      </PopoverTrigger>
      <PopoverPortal>
        <PopoverPositioner side="bottom" align="end" sideOffset={8}>
          <PopoverPopup className={popupClassName}>
            <div className={cn(sectionClass, "space-y-0.5")}>
              <div className="flex items-center justify-between gap-3">
                <PopoverTitle className={headerTitleClass}>
                  What&apos;s new
                  {data && (
                    <span className="text-muted-foreground ml-1.5 font-normal">
                      v{data.version}
                    </span>
                  )}
                </PopoverTitle>
                <PopoverClose
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      size="iconRound"
                      className="border border-white/16 bg-white/[0.04] text-foreground hover:bg-white/10"
                      aria-label="Close"
                    />
                  }
                >
                  <X className="size-4" />
                </PopoverClose>
              </div>
              <PopoverDescription className={headerDescriptionClass}>
                Release notes for user-facing features and fixes. Internal changes are not listed here.
              </PopoverDescription>
            </div>

            <div className="max-h-[min(60vh,420px)] overflow-y-auto px-4 py-3">
              {loading && (
                <p className="text-muted-foreground text-xs">Loading release notes…</p>
              )}
              {error && (
                <p className="text-muted-foreground text-xs">Release notes aren&apos;t available.</p>
              )}
              {data && data.releases.length === 0 && (
                <p className="text-muted-foreground text-xs">No releases yet.</p>
              )}
              {data && data.releases.length > 0 && (
                <div className="flex flex-col gap-5">
                  {data.releases.map((release, index) => (
                    <ReleaseBlock
                      key={release.version}
                      release={release}
                      isLatest={index === 0}
                    />
                  ))}
                </div>
              )}
            </div>
          </PopoverPopup>
        </PopoverPositioner>
      </PopoverPortal>
    </Popover>
  );
}
