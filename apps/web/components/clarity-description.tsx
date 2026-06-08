import type { ReactNode } from "react";
import { cn } from "@repo/ui";

import type { ClarityLine, ClarityLineClass, ClarityLinesContent } from "../lib/clarity-types";
import { safeHttpsUrl } from "../lib/safe-url";

/** Matches weapon-detail "Enhanced Trait" gold (DIM $enhancedYellow). */
const ENHANCED_GOLD = "font-semibold text-[#eade8b]";

const LINE_CLASS: Partial<Record<ClarityLineClass, string>> = {
  bold: "font-semibold",
  spacer: "mt-1.5",
  yellow: ENHANCED_GOLD,
  green: "text-green-400",
  blue: "text-cyan-400",
  purple: "text-purple-300",
  pve: "text-blue-300",
  pvp: "text-red-300",
  arc: "text-sky-400",
  solar: "text-orange-400",
  void: "text-violet-400",
  stasis: "text-cyan-300",
  strand: "text-green-400",
  kinetic: "text-stone-300",
  primary: "text-stone-300",
  special: "text-green-500",
  heavy: "text-purple-400",
  barrier: "text-rose-400",
  overload: "text-blue-400",
  unstoppable: "text-orange-500",
};

const BOLD_NUMBER = /(?:^|\b)[+-]?(?:\d*\.)?\d+(?:[xs]|ms|HP)?(?:[%°+]|\b|$)/g;
const ENHANCED_PAREN = /(\(↑\s*[\d.]+%?\))/g;
/** Clarity inline enhanced transition glyph (e.g. `50🠚55`). */
const ENHANCED_GLYPH = /🠚/g;

function EnhancedArrow({ id }: { id: string }) {
  return (
    <span key={id} aria-hidden className={cn("mr-0.5 inline-block", ENHANCED_GOLD)}>
      ↑
    </span>
  );
}

function formatPlainText(text: string): ReactNode[] {
  const segments: ReactNode[] = [];
  const matches = [...text.matchAll(BOLD_NUMBER)];
  let start = 0;
  for (const match of matches) {
    if (match.index === undefined) continue;
    if (match.index > start) segments.push(text.slice(start, match.index));
    segments.push(
      <span key={`${match.index}-${match[0]}`} className="font-semibold text-foreground">
        {match[0]}
      </span>,
    );
    start = match.index + match[0].length;
  }
  if (start < text.length) segments.push(text.slice(start));
  return segments;
}

function formatParenEnhanced(text: string, keyPrefix: string): ReactNode[] {
  const parts = text.split(ENHANCED_PAREN);
  const nodes: ReactNode[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;

    if (part.startsWith("(↑")) {
      nodes.push(
        <span key={`${keyPrefix}-enh-${i}`} className={ENHANCED_GOLD}>
          {part}
        </span>,
      );
      continue;
    }

    nodes.push(
      ...formatPlainText(part).map((node, j) => (
        <span key={`${keyPrefix}-${i}-${j}`}>{node}</span>
      )),
    );
  }

  return nodes;
}

/** Render text with bold base numbers and gold `(↑ enhanced)` / `🠚` enhanced markers. */
function formatSegment(text: string, keyPrefix = "seg"): ReactNode[] {
  if (text.includes("🠚")) {
    const chunks = text.split(ENHANCED_GLYPH);
    const nodes: ReactNode[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      if (chunk) nodes.push(...formatParenEnhanced(chunk, `${keyPrefix}-g${i}`));
      if (i < chunks.length - 1) nodes.push(<EnhancedArrow id={`${keyPrefix}-arr-${i}`} />);
    }
    return nodes;
  }

  return formatParenEnhanced(text, keyPrefix);
}

function renderContent(content: ClarityLinesContent, key: string): ReactNode {
  if (content.classNames?.includes("enhancedArrow")) {
    return <EnhancedArrow id={key} />;
  }
  if (content.link && content.text) {
    const href = safeHttpsUrl(content.link);
    if (!href) {
      return <span key={key}>{formatSegment(content.text, key)}</span>;
    }

    return (
      <a
        key={key}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sky-400 underline-offset-2 hover:underline"
      >
        {content.text}
      </a>
    );
  }
  if (!content.text) return null;

  const className = cn(content.classNames?.map((c) => LINE_CLASS[c]));
  return (
    <span key={key} className={className}>
      {formatSegment(content.text, key)}
    </span>
  );
}

function isSpacerLine(line: ClarityLine): boolean {
  return line.classNames?.includes("spacer") ?? false;
}

function lineRawText(line: ClarityLine): string {
  return line.linesContent?.map((part) => part.text ?? "").join("") ?? "";
}

function isBulletLine(line: ClarityLine): boolean {
  return lineRawText(line).trimStart().startsWith("•");
}

function stripBulletFromLine(line: ClarityLine): ClarityLine {
  const parts = line.linesContent?.map((part, i) => {
    if (!part.text || i !== 0) return part;
    return { ...part, text: part.text.replace(/^\s*•\s*/, "") };
  });
  return parts ? { ...line, linesContent: parts } : line;
}

/** Short trailing-colon labels such as "Exceptions:". */
function isSectionLabel(line: ClarityLine): boolean {
  const text = lineRawText(line).trim();
  return /^[A-Z][A-Za-z\s]{0,24}:$/.test(text);
}

function ClarityLineView({
  line,
  index,
  className,
}: {
  line: ClarityLine;
  index: number;
  className?: string;
}) {
  const lineClass = cn(
    line.classNames?.filter((c) => c !== "spacer").map((c) => LINE_CLASS[c]),
  );
  const parts =
    line.linesContent
      ?.map((content, i) => renderContent(content, `${index}-${i}`))
      .filter(Boolean) ?? [];

  if (parts.length === 0) return null;

  return <p className={cn("leading-relaxed", lineClass, className)}>{parts}</p>;
}

export function ClarityDescription({ lines }: { lines: ClarityLine[] }) {
  return (
    <div>
      {lines.map((line, index) => {
        if (isSpacerLine(line)) {
          return <div key={index} className="h-2.5" aria-hidden />;
        }

        const bullet = isBulletLine(line);
        const label = isSectionLabel(line);
        const displayLine = bullet ? stripBulletFromLine(line) : line;

        return (
          <ClarityLineView
            key={index}
            line={displayLine}
            index={index}
            className={cn(
              bullet && "mt-2.5",
              label && "mt-2.5 text-[11px] font-semibold text-muted-foreground/85",
            )}
          />
        );
      })}
    </div>
  );
}

export function ClarityAttribution() {
  return (
    <p className="text-muted-foreground/70 mt-2 border-t border-border/30 pt-1.5 text-[10px]">
      via{" "}
      <a
        href="https://d2clarity.com/discord"
        target="_blank"
        rel="noopener noreferrer"
        className="text-sky-400/90 hover:underline"
      >
        Clarity
      </a>
    </p>
  );
}
