"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "noeyarmory.customWeaponFilters.v1";
const MAX_FILTERS = 50;
const MAX_NAME_LENGTH = 48;
const MAX_PERKS_PER_FILTER = 40;

export interface CustomWeaponFilter {
  id: string;
  name: string;
  perkNames: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CustomWeaponFilterInput {
  name: string;
  perkNames: string[];
}

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ").slice(0, MAX_NAME_LENGTH);
}

function normalizePerkNames(perkNames: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const perkName of perkNames) {
    const name = perkName.trim().replace(/\s+/g, " ");
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    normalized.push(name);
    if (normalized.length >= MAX_PERKS_PER_FILTER) break;
  }
  return normalized;
}

function isCustomWeaponFilter(value: unknown): value is CustomWeaponFilter {
  if (value == null || typeof value !== "object") return false;
  const candidate = value as Partial<CustomWeaponFilter>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    Array.isArray(candidate.perkNames) &&
    candidate.perkNames.every((perkName) => typeof perkName === "string") &&
    typeof candidate.createdAt === "string" &&
    typeof candidate.updatedAt === "string"
  );
}

function readStoredFilters(): CustomWeaponFilter[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isCustomWeaponFilter)
      .map((filter) => ({
        ...filter,
        name: normalizeName(filter.name),
        perkNames: normalizePerkNames(filter.perkNames),
      }))
      .filter((filter) => filter.name && filter.perkNames.length > 0)
      .slice(0, MAX_FILTERS);
  } catch {
    return [];
  }
}

function writeStoredFilters(filters: CustomWeaponFilter[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  } catch {
    // Ignore storage write failures; the in-memory state still updates.
  }
}

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function prepareInput(input: CustomWeaponFilterInput): CustomWeaponFilterInput {
  return {
    name: normalizeName(input.name),
    perkNames: normalizePerkNames(input.perkNames),
  };
}

export function useCustomWeaponFilters() {
  const [filters, setFilters] = useState<CustomWeaponFilter[]>([]);

  useEffect(() => {
    setFilters(readStoredFilters());
  }, []);

  const persist = useCallback((next: CustomWeaponFilter[]) => {
    setFilters(next);
    writeStoredFilters(next);
  }, []);

  const createFilter = useCallback(
    (input: CustomWeaponFilterInput): CustomWeaponFilter | null => {
      const prepared = prepareInput(input);
      if (!prepared.name || prepared.perkNames.length === 0) return null;

      const now = new Date().toISOString();
      const filter: CustomWeaponFilter = {
        id: createId(),
        name: prepared.name,
        perkNames: prepared.perkNames,
        createdAt: now,
        updatedAt: now,
      };
      persist([...filters, filter].slice(-MAX_FILTERS));
      return filter;
    },
    [filters, persist],
  );

  const updateFilter = useCallback(
    (id: string, input: CustomWeaponFilterInput): CustomWeaponFilter | null => {
      const prepared = prepareInput(input);
      if (!prepared.name || prepared.perkNames.length === 0) return null;

      let updated: CustomWeaponFilter | null = null;
      const next = filters.map((filter) => {
        if (filter.id !== id) return filter;
        updated = {
          ...filter,
          name: prepared.name,
          perkNames: prepared.perkNames,
          updatedAt: new Date().toISOString(),
        };
        return updated;
      });
      if (!updated) return null;
      persist(next);
      return updated;
    },
    [filters, persist],
  );

  const deleteFilter = useCallback(
    (id: string) => {
      persist(filters.filter((filter) => filter.id !== id));
    },
    [filters, persist],
  );

  return { filters, createFilter, updateFilter, deleteFilter };
}
