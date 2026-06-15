import { ArrowDown, CornerDownLeft, History, ListFilter, X } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { frostedSurface } from "../../lib/frosted-surface";
import { cn } from "../../lib/utils";
import { Kbd } from "../kbd";
import {
  isSelectableItem,
  itemKey,
  PANEL_TRANSITION_MS,
  splitPreviewTail,
} from "./palette-reducer";
import type {
  ListMode,
  PaletteCategory,
  PaletteItem,
  PaletteResultItem,
  PaletteValueOption,
} from "./types";

/** FrostedShell uses rounded-[20px]; list inset is px-1.5/py-1.5 (6px) → 20 − 6 = 14px. */
const PALETTE_NESTED_RADIUS = "rounded-[14px]" as const;

export interface PaletteListProps {
  open: boolean;
  renderMode: ListMode | null;
  renderItems: PaletteItem[];
  listId: string;
  optionId: (index: number) => string;
  displayIndex: number;
  activeIndex: number;
  keyboardFocus: boolean;
  results: PaletteResultItem[];
  resultsHeader?: React.ReactNode;
  panelHeader?: React.ReactNode;
  plainPanelHeader?: boolean;
  resultsEmpty?: React.ReactNode;
  resultsFooter?: React.ReactNode;
  panelFooter?: React.ReactNode;
  panelClosing: boolean;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  listScrollingRef: React.MutableRefObject<boolean>;
  renderResult?: (id: string) => React.ReactNode;
  activeCategory?: PaletteCategory | null;
  renderValueTrailing?: (categoryId: string, option: PaletteValueOption) => React.ReactNode;
  onScroll: () => void;
  onHoverIndex: (index: number) => void;
  onClearHover: () => void;
  onSetActive: (index: number) => void;
  onSelectItem: (item: PaletteItem) => void;
  /** Skip preview expand animation — Firefox perf. */
  instantPreviewExpand?: boolean;
}

export function PaletteList({
  open,
  renderMode,
  renderItems,
  listId,
  optionId,
  displayIndex,
  activeIndex,
  keyboardFocus,
  results,
  resultsHeader,
  panelHeader,
  plainPanelHeader = false,
  resultsEmpty,
  resultsFooter,
  panelFooter,
  panelClosing,
  scrollRef,
  listScrollingRef,
  renderResult,
  activeCategory,
  renderValueTrailing,
  onScroll,
  onHoverIndex,
  onClearHover,
  onSetActive,
  onSelectItem,
  instantPreviewExpand = false,
}: PaletteListProps) {
  const { baseItems, previewItems } = useMemo(() => splitPreviewTail(renderItems), [renderItems]);

  const nestFooterActionBottom = panelFooter == null && previewItems.length === 0;
  const lastFooterActionIndex = useMemo(() => {
    if (!nestFooterActionBottom || baseItems.length === 0) return -1;
    let index = baseItems.length - 1;
    while (index >= 0 && baseItems[index]?.kind === "action") index--;
    const tailStart = index + 1;
    return tailStart < baseItems.length ? baseItems.length - 1 : -1;
  }, [baseItems, nestFooterActionBottom]);

  const [stickyHeaderGlass, setStickyHeaderGlass] = useState(false);

  const syncStickyHeaderGlass = useCallback(() => {
    setStickyHeaderGlass((scrollRef.current?.scrollTop ?? 0) > 0);
  }, [scrollRef]);

  const handleScroll = useCallback(() => {
    onScroll();
    syncStickyHeaderGlass();
  }, [onScroll, syncStickyHeaderGlass]);

  useEffect(() => {
    if (!open || renderMode !== "results") setStickyHeaderGlass(false);
  }, [open, renderMode]);

  useLayoutEffect(() => {
    if (open && renderMode === "results" && resultsHeader != null) {
      syncStickyHeaderGlass();
    }
  }, [open, renderMode, resultsHeader, results.length, syncStickyHeaderGlass]);

  const stickyHeaderClass = cn(
    "sticky top-0 z-10 -mx-1.5 px-3 py-1.5 transition-[background-color,backdrop-filter,border-color] duration-150 ease-out motion-reduce:transition-none",
    stickyHeaderGlass
      ? frostedSurface("barBordered")
      : "border-b border-transparent bg-transparent",
  );

  function renderRow(item: PaletteItem, index: number, as: "li" | "div" = "li") {
    return (
      <PaletteListRow
        key={itemKey(item)}
        as={as}
        item={item}
        optionId={optionId(index)}
        selected={isSelectableItem(item) && displayIndex >= 0 && index === displayIndex}
        showEnterHint={isSelectableItem(item) && keyboardFocus && index === activeIndex}
        nestBottomCorners={nestFooterActionBottom && index === lastFooterActionIndex}
        listScrollingRef={listScrollingRef}
        onHover={() => {
          onHoverIndex(index);
          if (activeIndex !== index) onSetActive(index);
        }}
        onSelect={() => onSelectItem(item)}
        renderResult={renderResult}
        activeCategory={activeCategory}
        renderValueTrailing={renderValueTrailing}
      />
    );
  }

  return (
    <div
      className={cn(
        "grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none",
        open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
      )}
      inert={open ? undefined : true}
      aria-hidden={!open}
    >
      <div className="flex min-h-0 flex-col overflow-hidden">
        <div
          ref={scrollRef}
          className={cn(
            "max-h-[min(640px,calc(100dvh-9rem))] min-h-0 touch-pan-y overscroll-contain overflow-y-auto px-1.5 tracking-body [overflow-anchor:none] sm:max-h-[640px]",
            renderMode === "results" && resultsHeader != null ? "pb-1.5" : "py-1.5",
            panelFooter != null && "pb-0",
          )}
          onScroll={handleScroll}
        >
          {renderMode === "results" && resultsHeader != null && (
            <div className={stickyHeaderClass}>{resultsHeader}</div>
          )}
          {renderMode !== "results" && panelHeader != null && (
            <div
              className={
                plainPanelHeader
                  ? "px-3 pb-2"
                  : frostedSurface("barBordered", "sticky top-0 z-10 -mx-1.5 px-3 py-1.5")
              }
            >
              {panelHeader}
            </div>
          )}
          {open && renderMode === "results" && results.length === 0 ? (
            <div className="px-3 py-6 text-center text-base tracking-body text-muted-foreground">
              {resultsEmpty ?? "No matches"}
            </div>
          ) : open && renderItems.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs tracking-body text-muted-foreground">
              No matches
            </div>
          ) : renderItems.length > 0 ? (
            <ul
              role="listbox"
              id={listId}
              key={
                renderMode === "results"
                  ? results.map((result) => result.id).join("\u0000")
                  : renderMode
              }
              className="flex flex-col gap-0"
              onMouseLeave={onClearHover}
            >
              {baseItems.map((item, i) => renderRow(item, i))}
              <PreviewResultsExpand
                items={previewItems}
                baseIndex={baseItems.length}
                renderRow={renderRow}
                instantExpand={instantPreviewExpand}
              />
            </ul>
          ) : null}
          {renderMode === "results" && resultsFooter != null && (
            <div className="px-3 py-2 text-center text-base tracking-body text-muted-foreground">
              {resultsFooter}
            </div>
          )}
        </div>
        {panelFooter != null && (open || panelClosing) && (
          <div className={frostedSurface("barTop", "shrink-0")}>{panelFooter}</div>
        )}
      </div>
    </div>
  );
}

interface PreviewResultsExpandProps {
  items: PaletteItem[];
  baseIndex: number;
  renderRow: (item: PaletteItem, index: number, as?: "li" | "div") => React.ReactNode;
  instantExpand?: boolean;
}

/** Animates the preview-results tail so the palette grows taller, not pop-in. */
function PreviewResultsExpand({
  items,
  baseIndex,
  renderRow,
  instantExpand = false,
}: PreviewResultsExpandProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const instantExpandRef = useRef(false);
  const itemsKey = useMemo(() => items.map((item) => itemKey(item)).join("\u0000"), [items]);

  useLayoutEffect(() => {
    if (items.length === 0) {
      instantExpandRef.current = false;
      setHeight(0);
      setExpanded(false);
      return;
    }

    const node = contentRef.current;
    if (!node) return;

    const measure = () => node.scrollHeight;

    if (instantExpand) {
      instantExpandRef.current = true;
      setExpanded(true);
      setHeight(measure());
      return;
    }

    if (instantExpandRef.current) {
      instantExpandRef.current = false;
      setExpanded(true);
      setHeight(measure());
      const observer = new ResizeObserver(() => {
        setHeight(measure());
      });
      observer.observe(node);
      return () => observer.disconnect();
    }

    setExpanded(false);
    setHeight(measure());

    const observer = new ResizeObserver(() => {
      setHeight(measure());
    });
    observer.observe(node);

    let innerFrame = 0;
    let startTimer: ReturnType<typeof setTimeout> | undefined;
    const outerFrame = requestAnimationFrame(() => {
      innerFrame = requestAnimationFrame(() => {
        // One frame at max-height 0 so the transition has a painted start state.
        startTimer = setTimeout(() => setExpanded(true), 16);
      });
    });

    return () => {
      observer.disconnect();
      cancelAnimationFrame(outerFrame);
      cancelAnimationFrame(innerFrame);
      clearTimeout(startTimer);
    };
  }, [itemsKey, items.length, instantExpand]);

  if (items.length === 0) return null;

  return (
    <li role="presentation" className="list-none p-0">
      <div
        className={cn("overflow-hidden", !instantExpand && "motion-reduce:transition-none")}
        style={{
          maxHeight: expanded ? height : 0,
          transitionProperty: instantExpand ? "none" : "max-height",
          transitionDuration: instantExpand ? undefined : `${PANEL_TRANSITION_MS}ms`,
          transitionTimingFunction: instantExpand ? undefined : "ease-out",
        }}
      >
        <div ref={contentRef} className="flex flex-col gap-0.5 [&_*]:![content-visibility:visible]">
          {items.map((item, i) => renderRow(item, baseIndex + i, "div"))}
        </div>
      </div>
    </li>
  );
}

interface PaletteListRowProps {
  item: PaletteItem;
  as?: "li" | "div";
  optionId: string;
  selected: boolean;
  showEnterHint: boolean;
  nestBottomCorners?: boolean;
  listScrollingRef: React.MutableRefObject<boolean>;
  onHover: () => void;
  onSelect: () => void;
  renderResult?: (id: string) => React.ReactNode;
  activeCategory?: PaletteCategory | null;
  renderValueTrailing?: (categoryId: string, option: PaletteValueOption) => React.ReactNode;
}

function PaletteListRow({
  item,
  as = "li",
  optionId,
  selected,
  showEnterHint,
  nestBottomCorners = false,
  listScrollingRef,
  onHover,
  onSelect,
  renderResult,
  activeCategory,
  renderValueTrailing,
}: PaletteListRowProps) {
  const sectionHasHeaderAction = item.kind === "section" && item.headerAction != null;
  const RowTag = as;

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events
    <RowTag
      id={optionId}
      role={item.kind === "section" ? "presentation" : "option"}
      aria-selected={item.kind === "section" ? undefined : selected}
      onMouseDown={item.kind === "section" ? undefined : (e) => e.preventDefault()}
      onMouseEnter={
        item.kind === "section"
          ? undefined
          : () => {
              if (listScrollingRef.current) return;
              onHover();
            }
      }
      onClick={item.kind === "section" ? undefined : onSelect}
      aria-disabled={item.kind === "action" && item.action.disabled ? true : undefined}
      className={cn(
        item.kind === "section"
          ? cn(
              "list-none py-0",
              sectionHasHeaderAction ? "pointer-events-auto" : "pointer-events-none",
            )
          : cn(
              "flex cursor-pointer items-center justify-between gap-3 px-3 py-1.5",
              nestBottomCorners ? PALETTE_NESTED_RADIUS : "rounded-[8px]",
            ),
        selected && (item.kind === "result" ? "bg-white/[0.033]" : "bg-white/[0.05]"),
        item.kind === "action" && "mt-1 justify-center py-2",
        item.kind === "action" &&
          (item.action.variant === "primary"
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "bg-white/[0.04] hover:bg-white/[0.05]"),
        item.kind === "action" &&
          selected &&
          item.action.variant === "primary" &&
          "bg-primary/90 ring-1 ring-primary-foreground/20",
        item.kind === "action" && item.action.disabled && "cursor-not-allowed opacity-45",
        item.kind === "action" &&
          item.action.disabled &&
          item.action.variant === "primary" &&
          "hover:bg-primary",
        item.kind === "action" &&
          item.action.disabled &&
          item.action.variant !== "primary" &&
          "hover:bg-white/[0.04]",
        item.kind === "result" &&
          "p-0 [contain-intrinsic-size:auto_3.5rem] [content-visibility:auto] [&_*]:hover:bg-transparent [&_*]:focus-visible:bg-transparent",
      )}
    >
      <PaletteListRowContent
        item={item}
        showEnterHint={showEnterHint}
        renderResult={renderResult}
        activeCategory={activeCategory}
        renderValueTrailing={renderValueTrailing}
      />
    </RowTag>
  );
}

function PaletteListRowContent({
  item,
  showEnterHint,
  renderResult,
  activeCategory,
  renderValueTrailing,
}: {
  item: PaletteItem;
  showEnterHint: boolean;
  renderResult?: (id: string) => React.ReactNode;
  activeCategory?: PaletteCategory | null;
  renderValueTrailing?: (categoryId: string, option: PaletteValueOption) => React.ReactNode;
}) {
  if (item.kind === "category") {
    return (
      <>
        <span className="flex min-w-0 items-center gap-2 text-xs font-normal">
          <ListFilter className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <span className="text-white">{item.category.label}:</span>
          {item.category.examples && (
            <span className="hidden truncate text-muted-foreground sm:inline">
              {item.category.examples}
            </span>
          )}
        </span>
        {showEnterHint ? (
          <Kbd className="hidden sm:inline-flex">
            Enter
            <CornerDownLeft className="size-3" />
          </Kbd>
        ) : (
          <Kbd variant="keycap" className="hidden sm:inline-flex">
            <ArrowDown className="size-3" />
          </Kbd>
        )}
      </>
    );
  }

  if (item.kind === "action") {
    return (
      <span className="flex items-center gap-2 text-xs font-medium">
        {item.action.icon}
        <span className={item.action.variant === "primary" ? undefined : "text-white"}>
          {item.action.label}
        </span>
        {item.action.hint != null && (
          <span
            className={
              item.action.variant === "primary"
                ? "text-primary-foreground/70"
                : "text-muted-foreground"
            }
          >
            {item.action.hint}
          </span>
        )}
        {!item.action.disabled &&
          !item.action.hideKeyboardHint &&
          (showEnterHint ? (
            <Kbd className="hidden sm:inline-flex">
              Enter
              <CornerDownLeft className="size-3" />
            </Kbd>
          ) : (
            <Kbd variant="keycap" className="hidden sm:inline-flex">
              <ArrowDown className="size-3" />
            </Kbd>
          ))}
      </span>
    );
  }

  if (item.kind === "section") {
    return (
      <>
        {item.divider && (
          <div className="-mx-1.5 my-1.5 border-t border-white/12" role="separator" aria-hidden />
        )}
        {item.label && (
          <div
            className={cn(
              "px-3 pt-2 pb-0.5 text-[11px] font-normal tracking-wide",
              item.headerAction != null
                ? "flex items-center justify-between gap-2"
                : "text-muted-foreground",
            )}
          >
            <span className="text-muted-foreground">{item.label}</span>
            {item.headerAction != null && (
              <button
                type="button"
                aria-label={item.headerAction.ariaLabel}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  item.headerAction!.onClick();
                }}
                className="cursor-pointer text-muted-foreground transition-colors hover:text-white"
              >
                {item.headerAction.label}
              </button>
            )}
          </div>
        )}
      </>
    );
  }

  if (item.kind === "recent") {
    return (
      <>
        <span className="flex min-w-0 items-center gap-2 text-xs font-normal">
          <History className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <span className="truncate text-white">{item.recent.label}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {item.recent.hint != null && (
            <span className="text-xs text-muted-foreground">{item.recent.hint}</span>
          )}
          {item.onRemove != null && (
            <button
              type="button"
              aria-label={`Remove recent search: ${item.recent.label}`}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                item.onRemove!();
              }}
              className="flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="size-3" />
            </button>
          )}
          {showEnterHint ? (
            <Kbd className="hidden sm:inline-flex">
              Enter
              <CornerDownLeft className="size-3" />
            </Kbd>
          ) : (
            <Kbd variant="keycap" className="hidden sm:inline-flex">
              <ArrowDown className="size-3" />
            </Kbd>
          )}
        </span>
      </>
    );
  }

  if (item.kind === "chipSuggestion") {
    return (
      <>
        <span className="flex min-w-0 items-baseline gap-2 text-xs font-normal">
          <span className="text-white">{item.category.label}:</span>
          <span
            className={cn(
              "truncate",
              item.option.dimmed ? "text-muted-foreground/45" : "text-muted-foreground",
            )}
          >
            {item.option.label}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {renderValueTrailing?.(item.category.id, item.option)}
          {item.option.hint != null && (
            <span className="text-xs text-muted-foreground">{item.option.hint}</span>
          )}
          {showEnterHint ? (
            <Kbd className="hidden sm:inline-flex">
              Enter
              <CornerDownLeft className="size-3" />
            </Kbd>
          ) : (
            <Kbd variant="keycap" className="hidden sm:inline-flex">
              <ArrowDown className="size-3" />
            </Kbd>
          )}
        </span>
      </>
    );
  }

  if (item.kind === "value") {
    return (
      <>
        <span className={cn("truncate text-xs font-normal", item.option.dimmed && "opacity-45")}>
          {item.option.label}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {activeCategory != null && renderValueTrailing?.(activeCategory.id, item.option)}
          {item.option.hint != null && (
            <span className="text-xs text-muted-foreground">{item.option.hint}</span>
          )}
          {showEnterHint ? (
            <Kbd className="hidden sm:inline-flex">
              Enter
              <CornerDownLeft className="size-3" />
            </Kbd>
          ) : (
            <Kbd variant="keycap" className="hidden sm:inline-flex">
              <ArrowDown className="size-3" />
            </Kbd>
          )}
        </span>
      </>
    );
  }

  return (
    <div className="w-full tracking-body">
      {renderResult?.(item.result.id) ?? item.result.content}
    </div>
  );
}
