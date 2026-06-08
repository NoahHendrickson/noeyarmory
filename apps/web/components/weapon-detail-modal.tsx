"use client";

import { ArrowLeft } from "lucide-react";
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
import type { WeaponDoc, WeaponDpsEntry } from "@repo/destiny";

import { WeaponDetailView } from "./weapon-detail";

/** Match CommandPalette shell — frosted card over the app background. */
const glassPanel =
  "border border-border bg-card/35 shadow-lg shadow-black/25 backdrop-blur-xl rounded-2xl";

/** Weapon detail in a modal — the primary in-app path from a search result. */
export function WeaponDetailModal({
  weapon,
  loading,
  dps,
  highlightedBuildPerks,
  onClose,
}: {
  weapon: WeaponDoc | null;
  loading: boolean;
  dps?: WeaponDpsEntry;
  highlightedBuildPerks?: readonly string[];
  onClose: () => void;
}) {
  return (
    <Dialog
      open={weapon != null || loading}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogPortal>
        <DialogBackdrop className="bg-black/10 backdrop-blur-none" />
        <DialogPopup
          className={cn(
            "relative flex max-h-[85vh] w-full max-w-5xl flex-col gap-2 overflow-hidden border-0 bg-transparent p-0 shadow-none backdrop-blur-none",
          )}
        >
          <DialogTitle className="sr-only">{weapon?.name ?? "Loading weapon"}</DialogTitle>
          <DialogClose
            render={
              <Button
                variant="ghost"
                size="sm"
                aria-label="Back"
                className="text-muted-foreground hover:text-foreground self-start"
              />
            }
          >
            <ArrowLeft className="size-4" />
            Back
          </DialogClose>
          <div className={cn("min-h-0 flex-1 overflow-y-auto p-4 sm:p-6", glassPanel)}>
            {weapon ? (
              <WeaponDetailView
                weapon={weapon}
                linkPerks={false}
                dps={dps}
                highlightedBuildPerks={highlightedBuildPerks}
              />
            ) : loading ? (
              <div className="grid min-h-[22rem] place-items-center px-10 py-16">
                <p className="text-muted-foreground text-sm">Loading weapon…</p>
              </div>
            ) : (
              <div className="grid min-h-[22rem] place-items-center px-10 py-16">
                <p className="text-muted-foreground text-sm">Weapon not found.</p>
              </div>
            )}
          </div>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
}
