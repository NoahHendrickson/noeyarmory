"use client";

import { X } from "lucide-react";
import {
  Button,
  cn,
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogPopup,
  DialogPortal,
  DialogTitle,
} from "@repo/ui";
import type { WeaponDoc } from "@repo/destiny";

import { WeaponDetailView } from "./weapon-detail";

/** Match CommandPalette shell — frosted card over the shader background. */
const glassPanel =
  "border-border bg-card/35 shadow-lg shadow-black/25 backdrop-blur-xl rounded-2xl";

/** Weapon detail in a modal — the primary in-app path from a search result. */
export function WeaponDetailModal({
  open,
  weapon,
  highlightedBuildPerks,
  onClose,
}: {
  open: boolean;
  weapon: WeaponDoc | null;
  highlightedBuildPerks?: readonly string[];
  onClose: () => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogPortal>
        <DialogBackdrop className="bg-black/10 backdrop-blur-none" />
        <DialogPopup className={cn("relative max-w-7xl p-4 sm:p-6", glassPanel)}>
          <DialogTitle className="sr-only">{weapon?.name ?? "Loading weapon"}</DialogTitle>
          <DialogClose
            render={
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close"
                className="absolute top-3 right-3"
              />
            }
          >
            <X className="size-4" />
          </DialogClose>
          {weapon ? (
            <WeaponDetailView
              weapon={weapon}
              linkPerks={false}
              highlightedBuildPerks={highlightedBuildPerks}
            />
          ) : (
            <div className="grid min-h-[22rem] place-items-center px-10 py-16">
              <p className="text-muted-foreground text-sm">Loading weapon…</p>
            </div>
          )}
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
}
