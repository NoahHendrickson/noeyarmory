import { ArrowDown, CornerDownLeft, History, ListFilter, X } from "lucide-react";

import { cn } from "../../lib/utils";
import { Kbd } from "../kbd";
import { isSelectableItem, itemKey } from "./palette-reducer";
import type { ListMode, PaletteItem, PaletteResultItem } from "./types";

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
  onScroll: () => void;
  onHoverIndex: (index: number) => void;
  onClearHover: () => void;
  onSetActive: (index: number) => void;
  onSelectItem: (item: PaletteItem) => void;
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
  onScroll,
  onHoverIndex,
  onClearHover,
  onSetActive,
  onSelectItem,
}: PaletteListProps) {
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
            "max-h-[min(560px,calc(100dvh-10rem))] min-h-0 touch-pan-y overscroll-contain overflow-y-auto px-1.5 tracking-body [overflow-anchor:none] sm:max-h-[560px]",
            renderMode === "results" && resultsHeader != null ? "pb-1.5" : "py-1.5",
            panelFooter != null && "pb-0",
          )}
          onScroll={onScroll}
        >
          {renderMode === "results" && resultsHeader != null && (
            <div className="bg-card/55 sticky top-0 z-10 -mx-1.5 border-b border-border/40 px-3 py-1.5 backdrop-blur-xl">
              {resultsHeader}
            </div>
          )}
          {renderMode !== "results" && panelHeader != null && (
            <div
              className={
                plainPanelHeader
                  ? "px-3 pb-2"
                  : "bg-card/55 sticky top-0 z-10 -mx-1.5 border-b border-border/40 px-3 py-1.5 backdrop-blur-xl"
              }
            >
              {panelHeader}
            </div>
          )}
          {open && renderMode === "results" && results.length === 0 ? (
            <div className="text-muted-foreground px-3 py-6 text-center text-base tracking-body">
              {resultsEmpty ?? "No matches"}
            </div>
          ) : open && renderItems.length === 0 ? (
            <div className="text-muted-foreground px-3 py-6 text-center text-xs tracking-body">
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
              className="flex flex-col gap-0.5"
              onMouseLeave={onClearHover}
            >
              {renderItems.map((item, i) => (
                <PaletteListRow
                  key={itemKey(item)}
                  item={item}
                  index={i}
                  optionId={optionId(i)}
                  selected={isSelectableItem(item) && displayIndex >= 0 && i === displayIndex}
                  showEnterHint={isSelectableItem(item) && keyboardFocus && i === activeIndex}
                  listScrollingRef={listScrollingRef}
                  onHover={() => {
                    onHoverIndex(i);
                    if (activeIndex !== i) onSetActive(i);
                  }}
                  onSelect={() => onSelectItem(item)}
                  renderResult={renderResult}
                />
              ))}
            </ul>
          ) : null}
          {renderMode === "results" && resultsFooter != null && (
            <div className="text-muted-foreground px-3 py-2 text-center text-base tracking-body">
              {resultsFooter}
            </div>
          )}
        </div>
        {panelFooter != null && (open || panelClosing) && (
          <div className="border-t border-border/40 bg-card/55 shrink-0 backdrop-blur-xl">
            {panelFooter}
          </div>
        )}
      </div>
    </div>
  );
}

interface PaletteListRowProps {
  item: PaletteItem;
  index: number;
  optionId: string;
  selected: boolean;
  showEnterHint: boolean;
  listScrollingRef: React.MutableRefObject<boolean>;
  onHover: () => void;
  onSelect: () => void;
  renderResult?: (id: string) => React.ReactNode;
}

function PaletteListRow({
  item,
  optionId,
  selected,
  showEnterHint,
  listScrollingRef,
  onHover,
  onSelect,
  renderResult,
}: PaletteListRowProps) {
  const sectionHasHeaderAction = item.kind === "section" && item.headerAction != null;

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events
    <li
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
          : "flex cursor-pointer items-center justify-between gap-3 rounded-[8px] px-3 py-1.5",
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
      <PaletteListRowContent item={item} showEnterHint={showEnterHint} renderResult={renderResult} />
    </li>
  );
}

function PaletteListRowContent({
  item,
  showEnterHint,
  renderResult,
}: {
  item: PaletteItem;
  showEnterHint: boolean;
  renderResult?: (id: string) => React.ReactNode;
}) {
  if (item.kind === "category") {
    return (
      <>
        <span className="flex min-w-0 items-center gap-2 text-xs font-normal">
          <ListFilter className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
          <span className="text-white">{item.category.label}:</span>
          {item.category.examples && (
            <span className="text-muted-foreground hidden truncate sm:inline">
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
          <div className="border-border/40 -mx-1.5 my-1.5 border-t" role="separator" aria-hidden />
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
                className="text-muted-foreground hover:text-white cursor-pointer transition-colors"
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
          <History className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
          <span className="truncate text-white">{item.recent.label}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {item.recent.hint != null && (
            <span className="text-muted-foreground text-xs">{item.recent.hint}</span>
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
          {item.option.hint != null && (
            <span className="text-muted-foreground text-xs">{item.option.hint}</span>
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
        <span
          className={cn("truncate text-xs font-normal", item.option.dimmed && "opacity-45")}
        >
          {item.option.label}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {item.option.hint != null && (
            <span className="text-muted-foreground text-xs">{item.option.hint}</span>
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
