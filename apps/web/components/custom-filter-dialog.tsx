"use client";

import { ChevronDown, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import {
  Button,
  cn,
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogDescription,
  DialogPopup,
  DialogPortal,
  DialogTitle,
  Input,
} from "@repo/ui";
import {
  Popover,
  PopoverPortal,
  PopoverPositioner,
  PopoverPopup,
  PopoverTrigger,
} from "@repo/ui/components/popover";
import type { PerkOption } from "@repo/destiny";

import type {
  CustomWeaponFilter,
  CustomWeaponFilterInput,
} from "../lib/use-custom-weapon-filters";

const glassPanel =
  "border-border bg-card/35 shadow-lg shadow-black/25 backdrop-blur-xl rounded-2xl";
const secondaryButtonClass =
  "h-8 rounded-[8px] border border-white/16 bg-white/[0.04] px-3 text-xs font-medium text-white hover:bg-white/10 hover:text-white";

export interface CustomFilterDialogProps {
  open: boolean;
  filters: CustomWeaponFilter[];
  perkOptions: PerkOption[];
  editingFilterId: string | null;
  onOpenChange: (open: boolean) => void;
  onCreate: (input: CustomWeaponFilterInput) => CustomWeaponFilter | null;
  onUpdate: (id: string, input: CustomWeaponFilterInput) => CustomWeaponFilter | null;
  onDelete: (id: string) => void;
}

function selectedKey(perkName: string): string {
  return perkName.toLowerCase();
}

export function CustomFilterDialog({
  open,
  filters,
  perkOptions,
  editingFilterId,
  onOpenChange,
  onCreate,
  onUpdate,
  onDelete,
}: CustomFilterDialogProps) {
  const [activeFilterId, setActiveFilterId] = useState<string | null>(editingFilterId);
  const editingFilter = filters.find((filter) => filter.id === activeFilterId) ?? null;
  const nameId = useId();
  const perkSearchId = useId();
  const [name, setName] = useState("");
  const [perkQuery, setPerkQuery] = useState("");
  const [perkMenuOpen, setPerkMenuOpen] = useState(false);
  const [selectedPerks, setSelectedPerks] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setActiveFilterId(editingFilterId);
    setPerkQuery("");
    setPerkMenuOpen(false);
  }, [open, editingFilterId]);

  useEffect(() => {
    if (!open) return;
    setName(editingFilter?.name ?? "");
    setSelectedPerks(editingFilter?.perkNames ?? []);
  }, [open, editingFilter]);

  const selectedSet = useMemo(
    () => new Set(selectedPerks.map((perkName) => selectedKey(perkName))),
    [selectedPerks],
  );

  const visiblePerks = useMemo(() => {
    const q = perkQuery.trim().toLowerCase();
    return perkOptions
      .filter((perk) => !q || perk.name.toLowerCase().includes(q))
      .slice(0, 60);
  }, [perkOptions, perkQuery]);

  const canSave = name.trim().length > 0 && selectedPerks.length > 0;

  function togglePerk(perkName: string) {
    const key = selectedKey(perkName);
    setSelectedPerks((prev) =>
      prev.some((selected) => selectedKey(selected) === key)
        ? prev.filter((selected) => selectedKey(selected) !== key)
        : [...prev, perkName],
    );
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) return;

    const input = { name, perkNames: selectedPerks };
    const saved = editingFilter ? onUpdate(editingFilter.id, input) : onCreate(input);
    if (saved) onOpenChange(false);
  }

  function handleDelete() {
    if (!editingFilter) return;
    onDelete(editingFilter.id);
    setActiveFilterId(null);
  }

  function startNewFilter() {
    setActiveFilterId(null);
    setName("");
    setSelectedPerks([]);
    setPerkQuery("");
    setPerkMenuOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogBackdrop className="bg-black/10 backdrop-blur-none" />
        <DialogPopup className={cn("relative max-w-2xl p-0", glassPanel)}>
          <form onSubmit={handleSubmit}>
            <div className="border-b border-white/16 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <DialogTitle className="text-base font-normal">Custom filters</DialogTitle>
                  <DialogDescription className="text-muted-foreground text-xs leading-snug">
                    Group perks under one filter. Weapons match when they can roll any selected
                    perk.
                  </DialogDescription>
                </div>
                <DialogClose
                  render={
                    <Button
                      type="button"
                      variant="ghost"
                      size="iconRound"
                      className="border border-white/16 bg-white/[0.04] text-foreground hover:bg-white/10"
                      aria-label="Close"
                    />
                  }
                >
                  <X className="size-4" />
                </DialogClose>
              </div>
            </div>

            <div className="grid gap-4 p-4">
              {filters.length > 0 && (
                <div className="grid gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-medium">Saved filters</span>
                    <Button type="button" className={secondaryButtonClass} onClick={startNewFilter}>
                      <Plus className="size-4" />
                      New
                    </Button>
                  </div>
                  <div className="grid max-h-28 gap-1 overflow-y-auto rounded-[10px] border border-white/10 bg-white/[0.03] p-1">
                    {filters.map((filter) => (
                      <button
                        key={filter.id}
                        type="button"
                        className={cn(
                          "flex items-center justify-between gap-3 rounded-lg px-3 py-1.5 text-left text-xs transition-colors",
                          editingFilter?.id === filter.id
                            ? "bg-white/[0.12] text-white"
                            : "hover:bg-white/[0.08]",
                        )}
                        onClick={() => setActiveFilterId(filter.id)}
                      >
                        <span className="truncate">{filter.name}</span>
                        <span className="text-muted-foreground shrink-0">
                          {filter.perkNames.length}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid gap-1.5">
                <label htmlFor={nameId} className="text-xs font-medium">
                  Filter name
                </label>
                <Input
                  id={nameId}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Reload perks"
                  className="h-8 rounded-[8px] text-xs"
                />
              </div>

              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-medium">Selected perks</span>
                  <span className="text-muted-foreground text-xs">{selectedPerks.length}</span>
                </div>
                {selectedPerks.length > 0 ? (
                  <div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto rounded-[10px] border border-white/10 bg-white/[0.03] p-2">
                    {selectedPerks.map((perkName) => (
                      <button
                        key={perkName}
                        type="button"
                        className="bg-filter-chip-trait text-filter-chip-trait-foreground inline-flex h-6 items-center gap-1 rounded-full pl-2.5 pr-1 text-xs font-medium"
                        onClick={() => togglePerk(perkName)}
                      >
                        {perkName}
                        <X className="size-3 opacity-70" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground rounded-[10px] border border-white/10 bg-white/[0.03] p-2 text-xs">
                    Select at least one perk for this filter.
                  </p>
                )}
              </div>

              <div className="grid gap-1.5">
                <span className="text-xs font-medium">Find perks</span>
                <Popover open={perkMenuOpen} onOpenChange={setPerkMenuOpen} modal={false}>
                  <PopoverTrigger
                    render={
                      <button
                        type="button"
                        id={perkSearchId}
                        className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-8 w-full items-center gap-2 rounded-[8px] border px-3 text-left text-xs outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                      />
                    }
                  >
                    <Search className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
                    <span className={cn("min-w-0 flex-1 truncate", !perkQuery && "text-muted-foreground")}>
                      {perkQuery || "Search trait perks"}
                    </span>
                    <ChevronDown className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
                  </PopoverTrigger>
                  <PopoverPortal>
                    <PopoverPositioner side="bottom" align="start" sideOffset={4} className="z-[100]">
                      <PopoverPopup
                        className={cn(
                          "border-border bg-card/35 w-[var(--anchor-width)] rounded-[10px] border p-1 shadow-lg shadow-black/25 backdrop-blur-xl",
                        )}
                      >
                        <Input
                          value={perkQuery}
                          onChange={(event) => setPerkQuery(event.target.value)}
                          placeholder="Search trait perks"
                          className="mb-1 h-8 rounded-[8px] border-white/10 bg-white/[0.03] text-xs"
                          autoFocus
                        />
                        <div className="max-h-72 overflow-y-auto p-0.5">
                          {visiblePerks.length > 0 ? (
                            <div className="grid gap-0.5">
                              {visiblePerks.map((perk) => {
                                const selected = selectedSet.has(selectedKey(perk.name));
                                return (
                                  <button
                                    key={perk.name}
                                    type="button"
                                    className={cn(
                                      "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-1.5 text-left text-xs transition-colors",
                                      selected ? "bg-white/[0.12] text-white" : "hover:bg-white/[0.08]",
                                    )}
                                    onClick={() => togglePerk(perk.name)}
                                  >
                                    <span className="truncate">{perk.name}</span>
                                    <span className="text-muted-foreground shrink-0">{perk.count}</span>
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-muted-foreground px-3 py-6 text-center text-xs">
                              No perks match.
                            </p>
                          )}
                        </div>
                      </PopoverPopup>
                    </PopoverPositioner>
                  </PopoverPortal>
                </Popover>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-white/16 p-4">
              {editingFilter ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-8 rounded-[8px] px-3 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={handleDelete}
                >
                  <Trash2 className="size-4" />
                  Delete
                </Button>
              ) : (
                <Button type="button" className={secondaryButtonClass} onClick={startNewFilter}>
                  <Plus className="size-4" />
                  New
                </Button>
              )}
              <div className="flex items-center gap-2">
                <DialogClose render={<Button type="button" className={secondaryButtonClass} />}>
                  Cancel
                </DialogClose>
                <Button type="submit" size="sm" className="rounded-[8px]" disabled={!canSave}>
                  <Pencil className="size-4" />
                  {editingFilter ? "Save" : "Create"}
                </Button>
              </div>
            </div>
          </form>
        </DialogPopup>
      </DialogPortal>
    </Dialog>
  );
}
