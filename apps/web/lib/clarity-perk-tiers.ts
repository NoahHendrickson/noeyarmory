import type { ClarityDescriptionMap, ClarityLine, ClarityPerk } from "./clarity-types";

/** Minimal perk identity for Clarity lookup (matches {@link PerkRef} fields). */
export interface ClarityPerkLookup {
  hash: number;
  alternateHashes?: number[];
}

export interface ClarityPerkTiers {
  base?: ClarityPerk;
  enhanced?: ClarityPerk;
}

const NUMERIC = /(\d+(?:\.\d+)?%?)/g;

const REDUNDANT_ENHANCED_LINE =
  /increased by a further|Buff Duration is increased|USED TO BE extended/i;

export function getClarityPerkTiers(
  descriptions: ClarityDescriptionMap | null | undefined,
  perk: ClarityPerkLookup,
): ClarityPerkTiers {
  if (!descriptions) return {};

  const base = descriptions[String(perk.hash)];
  const enhancedHash = perk.alternateHashes?.[0];
  const enhanced =
    enhancedHash != null ? descriptions[String(enhancedHash)] : undefined;

  return { base, enhanced };
}

export function hasClarityOrBungieTooltip(
  perk: ClarityPerkLookup & {
    description?: string;
    enhancedDescription?: string;
  },
  tiers: ClarityPerkTiers,
): boolean {
  return Boolean(
    getClarityDisplayLines(tiers)?.length ||
      perk.description ||
      perk.enhancedDescription,
  );
}

function linePlainText(line: ClarityLine): string {
  return line.linesContent?.map((part) => part.text ?? "").join("") ?? "";
}

function isSpacerLine(line: ClarityLine | undefined): boolean {
  return line?.classNames?.includes("spacer") ?? false;
}

/** Merge paired numeric values: `40%` → `40% (↑ 47%)` when enhanced differs. */
export function mergeLinePair(baseText: string, enhancedText: string): string {
  const enhancedClean = enhancedText.replace(/🠚/g, "→").trim();
  if (!enhancedClean || baseText === enhancedClean) return baseText;

  const baseMatches = [...baseText.matchAll(NUMERIC)];
  const enhancedMatches = [...enhancedClean.matchAll(NUMERIC)];

  if (baseMatches.length === 0 || baseMatches.length !== enhancedMatches.length) {
    return baseText;
  }

  let result = baseText;
  for (let i = baseMatches.length - 1; i >= 0; i--) {
    const baseMatch = baseMatches[i];
    const enhancedMatch = enhancedMatches[i];
    if (!baseMatch || !enhancedMatch || baseMatch[0] === enhancedMatch[0]) continue;
    if (baseMatch.index === undefined) continue;

    const replacement = `${baseMatch[0]} (↑ ${enhancedMatch[0]})`;
    result =
      result.slice(0, baseMatch.index) +
      replacement +
      result.slice(baseMatch.index + baseMatch[0].length);
  }

  return result;
}

function toTextLine(text: string, source: ClarityLine): ClarityLine {
  const firstPart = source.linesContent?.[0];
  return {
    classNames: source.classNames,
    linesContent: [{ text, classNames: firstPart?.classNames }],
  };
}

function stripArrowMarkers(lines: ClarityLine[]): ClarityLine[] {
  return lines
    .map((line) => {
      if (isSpacerLine(line)) return line;
      const parts =
        line.linesContent
          ?.map((part) => ({
            ...part,
            text: part.classNames?.includes("enhancedArrow")
              ? part.text
              : part.text?.replace(/^[\s▲↑]+/, ""),
          }))
          .filter(
            (part) => part.classNames?.includes("enhancedArrow") || part.text,
          ) ?? [];
      if (!parts.length) return null;
      return { ...line, linesContent: parts };
    })
    .filter((line): line is ClarityLine => line != null);
}

/** Merge base + enhanced Clarity lines into one flow with inline `(↑ …)` enhanced values. */
export function mergeClarityTierLines(
  baseLines: ClarityLine[],
  enhancedLines: ClarityLine[],
): ClarityLine[] {
  const filteredEnhanced = enhancedLines.filter(
    (line) => !REDUNDANT_ENHANCED_LINE.test(linePlainText(line)),
  );

  const result: ClarityLine[] = [];
  let bi = 0;
  let ei = 0;

  while (bi < baseLines.length || ei < filteredEnhanced.length) {
    const baseLine = baseLines[bi];
    const enhancedLine = filteredEnhanced[ei];

    if (baseLine && isSpacerLine(baseLine)) {
      result.push(baseLine);
      bi++;
      if (isSpacerLine(enhancedLine)) ei++;
      continue;
    }

    if (!baseLine && enhancedLine) {
      result.push(...stripArrowMarkers([enhancedLine]));
      ei++;
      continue;
    }

    if (baseLine && !enhancedLine) {
      result.push(baseLine);
      bi++;
      continue;
    }

    if (baseLine && enhancedLine) {
      const merged = mergeLinePair(linePlainText(baseLine), linePlainText(enhancedLine));
      result.push(toTextLine(merged, baseLine));
      bi++;
      ei++;
    }
  }

  return result;
}

/** Pick the best single-block Clarity lines to render for a perk tooltip. */
export function getClarityDisplayLines(tiers: ClarityPerkTiers): ClarityLine[] | undefined {
  const base = tiers.base?.descriptions.en;
  const enhanced = tiers.enhanced?.descriptions.en;

  if (base?.length && enhanced?.length) {
    return mergeClarityTierLines(base, enhanced);
  }

  const single = base ?? enhanced;
  if (single?.length) {
    return stripArrowMarkers(single);
  }

  return undefined;
}
