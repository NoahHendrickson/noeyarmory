"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "noeyarmory.pinnedItems.v1";
const MAX_PINNED = 20;

export interface PinnedWeaponItem {
  kind: "weapon";
  hash: number;
  name: string;
  icon?: string;
  watermark?: string;
  pinnedAt: string;
}

export interface PinnedArmorItem {
  kind: "armor";
  instanceId: string;
  hash: number;
  name: string;
  icon?: string;
  watermark?: string;
  pinnedAt: string;
}

export type PinnedItem = PinnedWeaponItem | PinnedArmorItem;

function pinnedItemId(item: Pick<PinnedItem, "kind"> & { hash?: number; instanceId?: string }): string {
  return item.kind === "weapon" ? `weapon:${item.hash}` : `armor:${item.instanceId}`;
}

function isPinnedWeaponItem(value: unknown): value is PinnedWeaponItem {
  if (value == null || typeof value !== "object") return false;
  const candidate = value as Partial<PinnedWeaponItem>;
  return (
    candidate.kind === "weapon" &&
    typeof candidate.hash === "number" &&
    typeof candidate.name === "string" &&
    typeof candidate.pinnedAt === "string"
  );
}

function isPinnedArmorItem(value: unknown): value is PinnedArmorItem {
  if (value == null || typeof value !== "object") return false;
  const candidate = value as Partial<PinnedArmorItem>;
  return (
    candidate.kind === "armor" &&
    typeof candidate.instanceId === "string" &&
    typeof candidate.hash === "number" &&
    typeof candidate.name === "string" &&
    typeof candidate.pinnedAt === "string"
  );
}

function isPinnedItem(value: unknown): value is PinnedItem {
  return isPinnedWeaponItem(value) || isPinnedArmorItem(value);
}

function readStoredItems(): PinnedItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isPinnedItem).slice(0, MAX_PINNED);
  } catch {
    return [];
  }
}

function writeStoredItems(items: PinnedItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage write failures; the in-memory state still updates.
  }
}

export function pinWeaponItem(
  prev: PinnedItem[],
  weapon: Pick<PinnedWeaponItem, "hash" | "name" | "icon" | "watermark">,
): PinnedItem[] {
  const id = pinnedItemId({ kind: "weapon", hash: weapon.hash });
  const without = prev.filter((item) => pinnedItemId(item) !== id);
  const entry: PinnedWeaponItem = {
    kind: "weapon",
    hash: weapon.hash,
    name: weapon.name,
    icon: weapon.icon,
    watermark: weapon.watermark,
    pinnedAt: new Date().toISOString(),
  };
  return [entry, ...without].slice(0, MAX_PINNED);
}

export function pinArmorItem(
  prev: PinnedItem[],
  armor: Pick<PinnedArmorItem, "instanceId" | "hash" | "name" | "icon" | "watermark">,
): PinnedItem[] {
  const id = pinnedItemId({ kind: "armor", instanceId: armor.instanceId });
  const without = prev.filter((item) => pinnedItemId(item) !== id);
  const entry: PinnedArmorItem = {
    kind: "armor",
    instanceId: armor.instanceId,
    hash: armor.hash,
    name: armor.name,
    icon: armor.icon,
    watermark: armor.watermark,
    pinnedAt: new Date().toISOString(),
  };
  return [entry, ...without].slice(0, MAX_PINNED);
}

export function unpinItem(prev: PinnedItem[], id: string): PinnedItem[] {
  return prev.filter((item) => pinnedItemId(item) !== id);
}

export function isItemPinned(items: PinnedItem[], item: PinnedItem): boolean {
  return items.some((candidate) => pinnedItemId(candidate) === pinnedItemId(item));
}

export function usePinnedItems() {
  const [items, setItems] = useState<PinnedItem[]>([]);

  useEffect(() => {
    setItems(readStoredItems());
  }, []);

  const getPinnedForMode = useCallback(
    (mode: "weapon" | "armor") =>
      items.filter((item) => (mode === "weapon" ? item.kind === "weapon" : item.kind === "armor")),
    [items],
  );

  const isWeaponPinned = useCallback(
    (hash: number) => items.some((item) => item.kind === "weapon" && item.hash === hash),
    [items],
  );

  const isArmorPinned = useCallback(
    (instanceId: string) =>
      items.some((item) => item.kind === "armor" && item.instanceId === instanceId),
    [items],
  );

  const pinWeapon = useCallback(
    (weapon: Pick<PinnedWeaponItem, "hash" | "name" | "icon" | "watermark">) => {
      setItems((prev) => {
        const updated = pinWeaponItem(prev, weapon);
        writeStoredItems(updated);
        return updated;
      });
    },
    [],
  );

  const pinArmor = useCallback(
    (armor: Pick<PinnedArmorItem, "instanceId" | "hash" | "name" | "icon" | "watermark">) => {
      setItems((prev) => {
        const updated = pinArmorItem(prev, armor);
        writeStoredItems(updated);
        return updated;
      });
    },
    [],
  );

  const unpin = useCallback((id: string) => {
    setItems((prev) => {
      const updated = unpinItem(prev, id);
      writeStoredItems(updated);
      return updated;
    });
  }, []);

  const toggleWeaponPin = useCallback(
    (weapon: Pick<PinnedWeaponItem, "hash" | "name" | "icon" | "watermark">) => {
      const id = pinnedItemId({ kind: "weapon", hash: weapon.hash });
      if (isWeaponPinned(weapon.hash)) {
        unpin(id);
      } else {
        pinWeapon(weapon);
      }
    },
    [isWeaponPinned, unpin, pinWeapon],
  );

  const toggleArmorPin = useCallback(
    (armor: Pick<PinnedArmorItem, "instanceId" | "hash" | "name" | "icon" | "watermark">) => {
      const id = pinnedItemId({ kind: "armor", instanceId: armor.instanceId });
      if (isArmorPinned(armor.instanceId)) {
        unpin(id);
      } else {
        pinArmor(armor);
      }
    },
    [isArmorPinned, unpin, pinArmor],
  );

  return {
    getPinnedForMode,
    isWeaponPinned,
    isArmorPinned,
    pinWeapon,
    pinArmor,
    unpin,
    toggleWeaponPin,
    toggleArmorPin,
  };
}

export { pinnedItemId };
