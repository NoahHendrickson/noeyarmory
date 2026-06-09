import { expandWeaponQueryAliases } from "./aliases";
import type { WeaponFilters } from "./search";

/** Result of parsing a raw search box string into structured filters + leftover free text. */
export interface ParsedWeaponQuery {
  filters: WeaponFilters;
  /** Non-keyword terms, rejoined — feed this to name/fuzzy search. */
  text: string;
}

/** WeaponFilters fields that are plain OR-within string arrays. */
type ArrayFacetKey = "element" | "type" | "ammo" | "slot" | "rarity" | "frame" | "craftable" | "name";

/** `key:` tokens that map straight onto an OR-within facet array. */
const FACET_KEYS: Readonly<Record<string, "element" | "type" | "ammo" | "slot" | "rarity" | "frame">> = {
  element: "element",
  damage: "element",
  type: "type",
  weapon: "type",
  ammo: "ammo",
  slot: "slot",
  rarity: "rarity",
  tier: "rarity",
  frame: "frame",
  archetype: "frame",
};

const RARITY_WORDS: ReadonlySet<string> = new Set([
  "common",
  "uncommon",
  "rare",
  "legendary",
  "exotic",
]);

/**
 * Split a search string into tokens, treating double-quoted runs as a single
 * token (quotes removed) so multi-word values like `perk:"kill clip"` survive.
 */
function tokenize(input: string): string[] {
  const tokens: string[] = [];
  const n = input.length;
  let i = 0;
  while (i < n) {
    while (i < n && /\s/.test(input[i]!)) i++;
    if (i >= n) break;
    let token = "";
    while (i < n && !/\s/.test(input[i]!)) {
      const ch = input[i]!;
      if (ch === '"') {
        i++;
        while (i < n && input[i] !== '"') {
          token += input[i];
          i++;
        }
        if (i < n) i++; // closing quote
      } else {
        token += ch;
        i++;
      }
    }
    if (token) tokens.push(token);
  }
  return tokens;
}

function pushUnique(target: string[], value: string): void {
  if (value && !target.some((v) => v.toLowerCase() === value.toLowerCase())) target.push(value);
}

function craftableValue(raw: string): string | null {
  const v = raw.toLowerCase();
  if (v === "yes" || v === "true" || v === "y") return "Yes";
  if (v === "no" || v === "false" || v === "n") return "No";
  return null;
}

/**
 * Parse a raw search string into structured {@link WeaponFilters} plus residual
 * free text. Supports `key:value` filters (`perk:`, `trait1:`, `trait2:`,
 * `origin:`, `element:`, `type:`, `ammo:`, `slot:`, `rarity:`, `frame:`,
 * `name:`, `craftable:`) and `is:` flags (`is:adept`, `is:craftable`,
 * `is:exotic`, …). Community shorthands (`hc`, `smg`) are alias-expanded for
 * `type:` values. Unknown tokens fall through to `text`.
 */
export function parseWeaponQuery(input: string): ParsedWeaponQuery {
  const filters: WeaponFilters = {};
  const freeText: string[] = [];

  const addFacet = (key: ArrayFacetKey, value: string) => {
    const list = (filters[key] ??= []);
    pushUnique(list, value);
  };

  for (const token of tokenize(input)) {
    const colon = token.indexOf(":");
    if (colon <= 0 || colon === token.length - 1) {
      freeText.push(token);
      continue;
    }

    const key = token.slice(0, colon).toLowerCase();
    const rawValue = token.slice(colon + 1);

    if (key === "is" || key === "not") {
      const flag = rawValue.toLowerCase();
      const on = key === "is";
      if (flag === "adept") {
        filters.adept = on;
      } else if (flag === "craftable" || flag === "craftble") {
        addFacet("craftable", on ? "Yes" : "No");
      } else if (RARITY_WORDS.has(flag) && on) {
        addFacet("rarity", flag);
      } else {
        freeText.push(token);
      }
      continue;
    }

    if (key === "perk") {
      pushUnique((filters.perks ??= []), rawValue);
      continue;
    }
    if (key === "trait1" || key === "trait") {
      pushUnique((filters.trait1 ??= []), rawValue);
      continue;
    }
    if (key === "trait2") {
      pushUnique((filters.trait2 ??= []), rawValue);
      continue;
    }
    if (key === "origin" || key === "origintrait") {
      pushUnique((filters.originTrait ??= []), rawValue);
      continue;
    }
    if (key === "name") {
      addFacet("name", rawValue);
      continue;
    }
    if (key === "craftable") {
      const value = craftableValue(rawValue);
      if (value) addFacet("craftable", value);
      else freeText.push(token);
      continue;
    }

    const facet = FACET_KEYS[key];
    if (facet) {
      addFacet(facet, facet === "type" ? expandWeaponQueryAliases(rawValue) : rawValue);
      continue;
    }

    // Unknown key — keep the whole token as free text.
    freeText.push(token);
  }

  return { filters, text: freeText.join(" ") };
}
