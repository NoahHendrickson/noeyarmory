import Image from "next/image";
import { Button, ResultRow } from "@repo/ui";

import { bungieIcon } from "../lib/bungie";
import type { OwnedArmorItem } from "../lib/armor-types";
import { ArmorStatsSubtitle } from "./armor-stats-subtitle";

const CLASS_CHARACTERS = new Set(["Titan", "Hunter", "Warlock"]);

function legacyArmorSubtitle(armor: OwnedArmorItem): string {
  return `${armor.slot} · ${armor.classType}`;
}

function canTargetClass(classType: string): boolean {
  return CLASS_CHARACTERS.has(classType);
}

function moveTooltip(armor: OwnedArmorItem): string | undefined {
  if (!canTargetClass(armor.classType)) return "Class-specific armor required";
  if (armor.location === "equipped") return "Already equipped";
  if (armor.location === "inventory") return "Already on a character";
  if (armor.location !== "vault") return "Item is not in the vault";
  return undefined;
}

function equipTooltip(armor: OwnedArmorItem): string | undefined {
  if (!canTargetClass(armor.classType)) return "Class-specific armor required";
  if (armor.location === "equipped") return "Already equipped";
  if (armor.location === "vault") return "Move to character first";
  if (armor.location !== "inventory") return "Item is not on a character";
  return undefined;
}

function canMoveToCharacter(armor: OwnedArmorItem): boolean {
  return armor.location === "vault" && canTargetClass(armor.classType);
}

function canEquip(armor: OwnedArmorItem): boolean {
  return armor.location === "inventory" && canTargetClass(armor.classType);
}

function isolatePalettePointer(event: React.PointerEvent) {
  event.stopPropagation();
}

export type ArmorActionState = {
  pendingInstanceId?: string;
  pendingAction?: "equip" | "transfer";
  error?: string;
  errorInstanceId?: string;
};

/** A single armor row in the command-palette results list. */
export function ArmorResultRow({
  armor,
  onSelect,
  onEquip,
  onMoveToCharacter,
  actionState,
}: {
  armor: OwnedArmorItem;
  onSelect?: () => void;
  onEquip?: () => void;
  onMoveToCharacter?: () => void;
  actionState?: ArmorActionState;
}) {
  const icon = bungieIcon(armor.icon);
  const watermark = bungieIcon(armor.watermark);

  const subtitle =
    armor.isArmor30 && armor.stats && armor.stats.length > 0 ? (
      <ArmorStatsSubtitle stats={armor.stats} tunableStat={armor.tunableStat} />
    ) : (
      legacyArmorSubtitle(armor)
    );

  const isPending = actionState?.pendingInstanceId === armor.instanceId;
  const equipPending = isPending && actionState?.pendingAction === "equip";
  const transferPending = isPending && actionState?.pendingAction === "transfer";
  const showError =
    actionState?.errorInstanceId === armor.instanceId && actionState.error != null;

  const moveEnabled = canMoveToCharacter(armor) && !isPending;
  const equipEnabled = canEquip(armor) && !isPending;

  return (
    <ResultRow
      render={onSelect ? undefined : <div />}
      onClick={onSelect}
      icon={
        <>
          {icon && (
            <Image src={icon} alt="" width={40} height={40} className="size-full" unoptimized />
          )}
          {watermark && (
            <Image
              src={watermark}
              alt=""
              width={40}
              height={40}
              className="absolute inset-0 size-full"
              unoptimized
            />
          )}
        </>
      }
      title={armor.name}
      subtitle={subtitle}
      trailing={
        <div
          data-palette-ignore-close
          className="flex shrink-0 flex-col items-end gap-1"
          onPointerDown={isolatePalettePointer}
        >
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!equipEnabled}
              title={equipTooltip(armor) ?? "Equip on matching class character (must be in orbit)"}
              onClick={() => onEquip?.()}
            >
              {equipPending ? "Equipping…" : "Equip"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!moveEnabled}
              title={
                moveTooltip(armor) ??
                `Move to ${armor.classType} (must be in orbit)`
              }
              onClick={() => onMoveToCharacter?.()}
            >
              {transferPending ? "Moving…" : "Move to character"}
            </Button>
          </div>
          {showError ? (
            <span className="text-destructive max-w-[14rem] truncate text-base">
              {actionState.error}
            </span>
          ) : null}
        </div>
      }
    />
  );
}
