/** Clarity Database line styling tokens (see database-clarity.github.io). */
export type ClarityLineClass =
  | "bold"
  | "spacer"
  | "enhancedArrow"
  | "yellow"
  | "green"
  | "blue"
  | "purple"
  | "pve"
  | "pvp"
  | "arc"
  | "solar"
  | "void"
  | "stasis"
  | "strand"
  | "kinetic"
  | "primary"
  | "special"
  | "heavy"
  | "barrier"
  | "overload"
  | "unstoppable"
  | "hunter"
  | "titan"
  | "warlock";

export interface ClarityLinesContent {
  text?: string;
  classNames?: ClarityLineClass[];
  link?: string;
}

export interface ClarityLine {
  linesContent?: ClarityLinesContent[];
  classNames?: ClarityLineClass[];
}

/** One Clarity perk entry from dim.json. */
export interface ClarityPerk {
  hash: number;
  name: string;
  descriptions: {
    en?: ClarityLine[];
  };
}

export type ClarityDescriptionMap = Record<string, ClarityPerk>;
