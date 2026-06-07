import type { ComponentProps } from "react";
import { Dialog as BaseDialog } from "@base-ui/react/dialog";

import { cn } from "../lib/utils";

/**
 * Pre-styled wrapper over Base UI's Dialog. Base UI handles focus trapping,
 * scroll locking, and focus restoration. Compose as:
 *
 *   <Dialog open={open} onOpenChange={setOpen}>
 *     <DialogPortal>
 *       <DialogBackdrop />
 *       <DialogPopup>…</DialogPopup>
 *     </DialogPortal>
 *   </Dialog>
 */
const Dialog = BaseDialog.Root;
const DialogTrigger = BaseDialog.Trigger;
const DialogPortal = BaseDialog.Portal;
const DialogClose = BaseDialog.Close;
const DialogTitle = BaseDialog.Title;
const DialogDescription = BaseDialog.Description;

function DialogBackdrop({ className, ...props }: ComponentProps<typeof BaseDialog.Backdrop>) {
  return (
    <BaseDialog.Backdrop
      className={cn(
        "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-150",
        "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
        className,
      )}
      {...props}
    />
  );
}

function DialogPopup({ className, ...props }: ComponentProps<typeof BaseDialog.Popup>) {
  return (
    // Flex centering avoids transform conflicts between translate and enter/exit scale.
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
      <BaseDialog.Popup
        className={cn(
          "bg-popover text-popover-foreground pointer-events-auto max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl border p-4 shadow-2xl outline-none sm:p-6",
          "transition-opacity duration-150 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
          className,
        )}
        {...props}
      />
    </div>
  );
}

export {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogClose,
  DialogTitle,
  DialogDescription,
  DialogBackdrop,
  DialogPopup,
};
