import { useRender } from "@base-ui/react/use-render";
import { mergeProps } from "@base-ui/react/merge-props";
import type { ReactNode } from "react";

import { frostedSurface } from "../lib/frosted-surface";
import { cn } from "../lib/utils";

export interface ResultRowProps extends Omit<useRender.ComponentProps<"button">, "title"> {
  /** Leading visual (e.g. a square icon), shown in a fixed icon box. */
  icon?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Trailing content (e.g. a badge or count). */
  trailing?: ReactNode;
}

/**
 * A data-agnostic result list row: square icon box + title/subtitle + optional
 * trailing. Defaults to a `<button>`; pass `render={<a/>}`/`render={<Link/>}`
 * to render as a link (Base UI `useRender`, like {@link Button}).
 */
function ResultRow({ render, icon, title, subtitle, trailing, className, ...props }: ResultRowProps) {
  return useRender({
    defaultTagName: "button",
    render,
    props: mergeProps<"button">(
      {
        className: cn(
          "hover:bg-white/[0.033] focus-visible:bg-white/[0.033] flex w-full cursor-pointer flex-row items-center gap-2 rounded-lg px-2 py-1.5 text-left tracking-body outline-none disabled:cursor-not-allowed",
          className,
        ),
        children: (
          <>
            {icon != null && (
              <span
                className={cn(
                  "relative flex size-10 shrink-0 items-center justify-center overflow-hidden",
                  frostedSurface("rim"),
                )}
              >
                {icon}
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-base font-medium tracking-body">{title}</span>
              {subtitle != null && (
                <span className="text-muted-foreground block min-w-0 text-sm tracking-body">
                  {subtitle}
                </span>
              )}
            </span>
            {trailing != null && <span className="shrink-0">{trailing}</span>}
          </>
        ),
      },
      props,
    ),
  });
}

export { ResultRow };
