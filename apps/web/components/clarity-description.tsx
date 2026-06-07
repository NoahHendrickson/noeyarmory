import type { ReactNode } from "react";
import { cn } from "@repo/ui";

import type { ClarityLine, ClarityLineClass, ClarityLinesContent } from "../lib/clarity-types";

const LINE_CLASS: Partial<Record<ClarityLineClass, string>> = {
  bold: "font-semibold",
  spacer: "mt-1.5",
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

/** Render text with bold base numbers and gold `(↑ enhanced)` parentheticals. */
function formatSegment(text: string): ReactNode[] {
  const parts = text.split(ENHANCED_PAREN);
  const nodes: ReactNode[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;

    if (part.startsWith("(↑")) {
      nodes.push(
        <span key={`enh-${i}`} className="font-semibold text-[#eade8b]">
          {part}
        </span>,
      );
      continue;
    }

    nodes.push(...formatPlainText(part).map((node, j) => (
      <span key={`${i}-${j}`}>{node}</span>
    )));
  }

  return nodes;
}

function renderContent(content: ClarityLinesContent, key: string): ReactNode {
  if (content.classNames?.includes("enhancedArrow")) return null;
  if (content.link && content.text) {
    return (
      <a
        key={key}
        href={content.link}
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
      {formatSegment(content.text)}
    </span>
  );
}

function ClarityLineView({ line, index }: { line: ClarityLine; index: number }) {
  const lineClass = cn(line.classNames?.map((c) => LINE_CLASS[c]));
  const parts =
    line.linesContent
      ?.map((content, i) => renderContent(content, `${index}-${i}`))
      .filter(Boolean) ?? [];

  if (parts.length === 0) return null;

  return <p className={cn("leading-relaxed", lineClass)}>{parts}</p>;
}

export function ClarityDescription({ lines }: { lines: ClarityLine[] }) {
  return (
    <div className="space-y-0.5">
      {lines.map((line, index) => (
        <ClarityLineView key={index} line={line} index={index} />
      ))}
    </div>
  );
}

export function ClarityAttribution() {
  return (
    <p className="text-muted-foreground mt-2 border-t border-white/10 pt-2 text-sm">
      Community research via{" "}
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
