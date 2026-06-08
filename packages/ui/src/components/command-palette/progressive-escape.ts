import type { PanelKind } from "./types";

export type EscapeStep = "clear" | "back" | "close";

/** Whether Esc should clear the active input before stepping back or closing. */
export function hasClearableInput(
  panel: PanelKind,
  valueQuery: string,
  query: string,
): boolean {
  // Values panel: any typed characters, including whitespace-only.
  if (panel === "values") return valueQuery !== "";
  // Main search: ignore whitespace-only query.
  return query.trim() !== "";
}

export function resolveEscapeStep(
  panel: PanelKind,
  valueQuery: string,
  query: string,
): EscapeStep {
  if (hasClearableInput(panel, valueQuery, query)) return "clear";
  if (panel === "values") return "back";
  return "close";
}
