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
  weapon,
  onClose,
}: {
  weapon: WeaponDoc | null;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={weapon != null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogPortal>
        <DialogBackdrop className="bg-black/10 backdrop-blur-none" />
        <DialogPopup className={cn("relative max-w-3xl", glassPanel)}>
          {weapon && (
            <>
              <DialogTitle className="sr-only">{weapon.name}</DialogTitle>
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
              <WeaponDetailView weapon={weapon} linkPerks={false} />
            </>
          )}
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
}
