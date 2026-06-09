import type { ComponentProps } from "react";
import { Switch as BaseSwitch } from "@base-ui/react/switch";

import { motion } from "../lib/motion";
import { cn } from "../lib/utils";

function SwitchRoot({ className, ...props }: ComponentProps<typeof BaseSwitch.Root>) {
  return (
    <BaseSwitch.Root
      className={cn(
        "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors outline-none",
        motion("snappySmooth"),
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "data-checked:bg-primary data-unchecked:bg-white/20",
        "data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

function SwitchThumb({ className, ...props }: ComponentProps<typeof BaseSwitch.Thumb>) {
  return (
    <BaseSwitch.Thumb
      className={cn(
        "pointer-events-none block size-4 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.4)] ring-0",
        motion("mediumSpring", "transition-transform"),
        "data-checked:translate-x-4 data-unchecked:translate-x-0",
        className,
      )}
      {...props}
    />
  );
}

export type SwitchProps = ComponentProps<typeof BaseSwitch.Root>;

function Switch(props: SwitchProps) {
  return (
    <SwitchRoot {...props}>
      <SwitchThumb />
    </SwitchRoot>
  );
}

export { Switch, SwitchRoot, SwitchThumb };
