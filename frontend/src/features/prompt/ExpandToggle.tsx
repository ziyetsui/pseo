"use client";

import { useState, type ReactNode } from "react";

export interface ExpandToggleProps {
  /** Id of the element being expanded — usually the `<pre>` this wraps. */
  contentId: string;
  children: ReactNode;
  /** Prototype labels. Both cards say `展开` ⇄ `收起`. */
  expandLabel?: string;
  collapseLabel?: string;
  /**
   * Rendered between the clamped content and the toggle row — the card's meta
   * line, which the prototype places after the `<pre>` and before the action
   * row the toggle lives in.
   */
  belowContent?: ReactNode;
  /** Rendered before / after the toggle button inside the action row. */
  actionsBefore?: ReactNode;
  actionsAfter?: ReactNode;
  /** Applied to the action row; lets a card style its own `.cardact`. */
  rowClassName?: string;
  toggleClassName?: string;
}

/**
 * Client leaf that clamps its server-rendered children.
 *
 * The children are passed through untouched, so the full prompt text is always
 * in the HTML — copy, text selection, find-in-page and search engines all see
 * it whether or not the block is expanded. Only a CSS `max-height` changes.
 *
 * The toggle is rendered exactly once, in the same row as the card's other
 * actions (the prototype's `复制 / 展开 / 原帖` row). `belowContent`,
 * `actionsBefore` and `actionsAfter` exist so a server component can hand that
 * whole arrangement down without this component knowing anything about cards.
 */
export function ExpandToggle({
  contentId,
  children,
  expandLabel = "展开",
  collapseLabel = "收起",
  belowContent,
  actionsBefore,
  actionsAfter,
  rowClassName,
  toggleClassName,
}: ExpandToggleProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    // `min-w-0`: as a flex item this wrapper would otherwise take its
    // automatic minimum size from the prompt's min-content width, which a long
    // unbroken token can push far past the card — that is what made L3 scroll
    // sideways at 320/375. The `<pre>` inside scrolls instead.
    <div className="flex min-w-0 flex-col gap-3">
      <div
        data-expanded={expanded ? "true" : "false"}
        className="data-[expanded=false]:max-h-40 data-[expanded=false]:overflow-hidden"
      >
        {children}
      </div>

      {belowContent}

      <div className={rowClassName ?? "flex flex-wrap items-center gap-3"}>
        {actionsBefore}
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={contentId}
          onClick={() => setExpanded((value) => !value)}
          className={
            toggleClassName ??
            "inline-flex min-h-11 min-w-11 items-center justify-center px-1 text-xs font-bold tracking-wider uppercase underline"
          }
        >
          {expanded ? collapseLabel : expandLabel}
        </button>
        {actionsAfter}
      </div>
    </div>
  );
}
