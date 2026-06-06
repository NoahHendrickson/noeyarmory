"use client";

import { X } from "lucide-react";
import {
  Button,
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogPopup,
  DialogPortal,
  DialogTitle,
} from "@repo/ui";
import type { WeaponDoc } from "@repo/destiny";

import { WeaponDetailView } from "./weapon-detail";

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
        <DialogBackdrop />
        <DialogPopup className="relative">
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
