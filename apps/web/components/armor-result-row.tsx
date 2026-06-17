import { memo } from "react";
import { Button, ResultRow } from "@repo/ui";

import type { OwnedArmorItem } from "../lib/armor-types";
import type { ArmorDuplicateDiff } from "../lib/armor-duplicate-diffs";
import { ArmorItemIcon } from "./armor-item-icon";
import { ArmorResultSubtitle } from "./armor-result-subtitle";

const CLASS_CHARACTERS = new Set(["Titan", "Hunter", "Warlock"]);

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
  if (armor.location !== "inventory" && armor.location !== "vault") {
    return "Item cannot be equipped from this location";
  }
  return undefined;
}

function canMoveToCharacter(armor: OwnedArmorItem): boolean {
  return armor.location === "vault" && canTargetClass(armor.classType);
}

function canEquip(armor: OwnedArmorItem): boolean {
  return (
    (armor.location === "inventory" || armor.location === "vault") &&
    canTargetClass(armor.classType)
  );
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

const armorActionButtonClassName =
  "bg-armor-action-border text-armor-action-foreground hover:bg-armor-action-hover hover:text-white";

/** A single armor row in the command-palette results list. */
export const ArmorResultRow = memo(function ArmorResultRow({
  armor,
  onSelect,
  onEquip,
  onMoveToCharacter,
  actionState,
  duplicateDiff,
}: {
  armor: OwnedArmorItem;
  onSelect?: () => void;
  onEquip?: () => void;
  onMoveToCharacter?: () => void;
  actionState?: ArmorActionState;
  duplicateDiff?: ArmorDuplicateDiff;
}) {
  const watermark = armor.watermark;

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
        <ArmorItemIcon
          icon={armor.icon}
          watermark={watermark}
          size={40}
          className="size-full ring-0"
        />
      }
      title={armor.name}
      subtitle={<ArmorResultSubtitle armor={armor} duplicateDiff={duplicateDiff} />}
      trailing={
        <div
          data-palette-ignore-close
          className="flex shrink-0 flex-col items-end gap-1"
          onPointerDown={isolatePalettePointer}
        >
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-1.5">
            <Button
              type="button"
              variant="ghost"
              className={`h-7 w-full rounded-[8px] border-0 px-2.5 py-0 text-xs sm:w-auto sm:px-3 ${armorActionButtonClassName}`}
              disabled={!equipEnabled}
              title={equipTooltip(armor) ?? `Equip on ${armor.classType} (must be in orbit)`}
              onClick={() => onEquip?.()}
            >
              {equipPending ? "Equipping…" : "Equip"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className={`h-7 w-full rounded-[8px] border-0 px-2.5 py-0 text-xs sm:w-auto sm:px-3 ${armorActionButtonClassName}`}
              disabled={!moveEnabled}
              title={
                moveTooltip(armor) ??
                `Move to ${armor.classType} (must be in orbit)`
              }
              onClick={() => onMoveToCharacter?.()}
            >
              {transferPending ? "Moving…" : (
                <>
                  <span className="sm:hidden">Move</span>
                  <span className="hidden sm:inline">Move</span>
                </>
              )}
            </Button>
          </div>
          {showError ? (
            <span className="text-destructive max-w-full truncate text-base sm:max-w-[14rem]">
              {actionState.error}
            </span>
          ) : null}
        </div>
      }
    />
  );
});
