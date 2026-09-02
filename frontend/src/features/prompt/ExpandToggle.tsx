"use client";

import { useState, type ReactNode } from "react";

export interface ExpandToggleProps {
  /** Id of the element being expanded — usually the `<pre>` this wraps. */
  contentId: string;
  children: ReactNode;
  expandLabel?: string;
  collapseLabel?: string;
}

/**
 * Client leaf that clamps its server-rendered children.
 *
 * The children are passed through untouched, so the full prompt text is always
 * in the HTML — copy, text selection, find-in-page and search engines all see
 * it whether or not the block is expanded. Only a CSS `max-height` changes.
 */
export function ExpandToggle({
  contentId,
  children,
  expandLabel = "展开全文",
  collapseLabel = "收起",
}: ExpandToggleProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <div
        data-expanded={expanded ? "true" : "false"}
        className="data-[expanded=false]:max-h-40 data-[expanded=false]:overflow-hidden"
      >
        {children}
      </div>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={contentId}
        onClick={() => setExpanded((value) => !value)}
        className="mt-2 inline-flex min-h-11 items-center text-xs font-bold tracking-wider uppercase underline"
      >
        {expanded ? collapseLabel : expandLabel}
      </button>
    </div>
  );
}
