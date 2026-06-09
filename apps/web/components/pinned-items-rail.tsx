"use client";

import Image from "next/image";
import { PinOff } from "lucide-react";
import {
  cn,
  FrostedShell,
  Tooltip,
  TooltipPortal,
  TooltipPopup,
  TooltipPositioner,
  TooltipTrigger,
} from "@repo/ui";

import { bungieIcon } from "../lib/bungie";
import { pinnedItemId, type PinnedItem } from "../lib/use-pinned-items";

function PinnedItemButton({
  item,
  selected,
  onSelect,
  onUnpin,
}: {
  item: PinnedItem;
  selected?: boolean;
  onSelect: () => void;
  onUnpin: () => void;
}) {
  const icon = bungieIcon(item.icon);
  const watermark = bungieIcon(item.watermark);

  return (
    <div className="group relative">
      <Tooltip>
        <TooltipTrigger
          delay={0}
          render={
            <button
              type="button"
              data-palette-ignore-close
              aria-label={item.name}
              aria-pressed={selected}
              className={cn(
                "flex size-11 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-[10px] transition-[box-shadow,transform] hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
                selected && "ring-2 ring-white/40",
              )}
              onClick={onSelect}
              onPointerDown={(event) => event.stopPropagation()}
            />
          }
        >
          <FrostedShell className="size-full rounded-[10px]">
            <span className="bg-muted relative flex size-full items-center justify-center overflow-hidden rounded-[10px]">
              {icon ? (
                <Image src={icon} alt="" width={44} height={44} className="size-full" unoptimized />
              ) : null}
              {watermark ? (
                <Image
                  src={watermark}
                  alt=""
                  width={44}
                  height={44}
                  className="absolute inset-0 size-full"
                  unoptimized
                />
              ) : null}
            </span>
          </FrostedShell>
        </TooltipTrigger>
        <TooltipPortal>
          <TooltipPositioner side="right">
            <TooltipPopup>{item.name}</TooltipPopup>
          </TooltipPositioner>
        </TooltipPortal>
      </Tooltip>
      <button
        type="button"
        aria-label={`Unpin ${item.name}`}
        className="absolute -right-1 -top-1 z-10 flex size-5 cursor-pointer items-center justify-center rounded-full bg-black/70 text-white/80 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
        onClick={(event) => {
          event.stopPropagation();
          onUnpin();
        }}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <PinOff className="size-3" aria-hidden />
      </button>
    </div>
  );
}

export function PinnedItemsRail({
  items,
  onSelect,
  onUnpin,
  selectedId,
  className,
}: {
  items: PinnedItem[];
  onSelect: (item: PinnedItem) => void;
  onUnpin: (id: string) => void;
  selectedId?: string;
  className?: string;
}) {
  if (items.length === 0) return null;

  return (
    <div
      className={cn("flex shrink-0 flex-col gap-1.5 pt-1", className)}
      data-palette-ignore-close
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {items.map((item) => {
        const id = pinnedItemId(item);
        return (
          <PinnedItemButton
            key={id}
            item={item}
            selected={selectedId === id}
            onSelect={() => onSelect(item)}
            onUnpin={() => onUnpin(id)}
          />
        );
      })}
    </div>
  );
}
