"use client";

import { useCallback, useState } from "react";

import type { ArmorActionState } from "../components/armor-result-row";

export function useArmorActions(refetchArmor: () => Promise<void>) {
  const [armorAction, setArmorAction] = useState<ArmorActionState>({});

  const runArmorAction = useCallback(
    async (
      instanceId: string,
      action: "equip" | "transfer",
      path: "/api/armor/equip" | "/api/armor/transfer",
    ) => {
      setArmorAction({
        pendingInstanceId: instanceId,
        pendingAction: action,
        error: undefined,
        errorInstanceId: undefined,
      });

      try {
        const res = await fetch(path, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ instanceId }),
        });
        const json = (await res.json()) as { error?: string };
        if (!res.ok) {
          throw new Error(json.error ?? `HTTP ${res.status}`);
        }
        setArmorAction({});
        await refetchArmor();
      } catch (e: unknown) {
        setArmorAction({
          error: e instanceof Error ? e.message : "Action failed",
          errorInstanceId: instanceId,
        });
      }
    },
    [refetchArmor],
  );

  const clearArmorAction = useCallback(() => setArmorAction({}), []);

  return { armorAction, runArmorAction, clearArmorAction };
}
