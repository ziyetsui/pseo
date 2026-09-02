"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useRef, type KeyboardEvent } from "react";

import { Panel } from "@/components/ui/Panel";
import { StateBlock } from "@/components/ui/StateBlock";
import { cx } from "@/components/ui/class-names";
import { parsePromptQuery } from "@/lib/content/query";
import type { Locale, PromptQuery, PromptSummary, TrendingWindow } from "@/lib/content/types";
import { PromptCard, type PromptCardVariant } from "@/features/prompt/PromptCard";
import { queryHref } from "@/features/search/query-links";

/**
 * Trending, split by time window.
 *
 * The selected window is URL state (`?window=7d|30d`), so each tab is a real
 * `<Link>` and the selection survives a refresh, a share and the back button.
 * Reading the URL needs a Suspense boundary under static export; the fallback
 * renders the default window, which is what ends up in the exported HTML — so
 * the all-time panel is always present without JavaScript.
 *
 * Keyboard follows the WAI-ARIA tabs pattern with MANUAL activation: arrow keys
 * (plus Home/End) move focus across the tablist, and Enter follows the focused
 * tab's link. Automatic activation would mean navigating on every arrow press.
 */

export interface TrendingWindowPanel {
  window: TrendingWindow;
  label: string;
  items: readonly PromptSummary[];
  /** Repository explanation, e.g. that the window was topped up. */
  note: string | null;
  /** Inclusive start of the window, derived from the snapshot date. */
  windowStart: string | null;
}

export interface TrendingTabsProps {
  locale: Locale;
  basePath: string;
  windows: readonly TrendingWindowPanel[];
  /** Window used when the URL says nothing. */
  defaultWindow?: TrendingWindow;
  /** Snapshot date every metric and window boundary is relative to. */
  observedAt: string;
  /** Card anatomy for the panel grid. Defaults to L1's `hub` card. */
  cardVariant?: PromptCardVariant;
  label?: string;
  idPrefix?: string;
  emptyMessage?: string;
  className?: string;
}

const MOVE_KEYS = ["ArrowRight", "ArrowLeft", "Home", "End"];

export function TrendingTabs(props: TrendingTabsProps) {
  return (
    <Suspense
      fallback={
        <TrendingTabsView {...props} active={props.defaultWindow ?? "all"} query={{}} />
      }
    >
      <TrendingTabsFromUrl {...props} />
    </Suspense>
  );
}

function TrendingTabsFromUrl(props: TrendingTabsProps) {
  const searchParams = useSearchParams();
  const { query } = parsePromptQuery(searchParams.toString());
  const active = query.window ?? props.defaultWindow ?? "all";

  return <TrendingTabsView {...props} active={active} query={query} />;
}

interface TrendingTabsViewProps extends TrendingTabsProps {
  active: TrendingWindow;
  /** Rest of the URL state, preserved when switching windows. */
  query: PromptQuery;
}

function TrendingTabsView({
  locale,
  basePath,
  windows,
  observedAt,
  cardVariant,
  label = "时间范围",
  idPrefix = "trending",
  emptyMessage = "该时段暂无收录的提示词。",
  className,
  active,
  query,
}: TrendingTabsViewProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const panelId = `${idPrefix}-panel`;
  const current = windows.find((panel) => panel.window === active) ?? windows[0];

  if (current === undefined) {
    return <StateBlock variant="empty" message={emptyMessage} className={className} />;
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!MOVE_KEYS.includes(event.key)) return;
    const tabs = [...(listRef.current?.querySelectorAll<HTMLElement>('[role="tab"]') ?? [])];
    if (tabs.length === 0) return;
    const index = tabs.indexOf(document.activeElement as HTMLElement);
    if (index === -1) return;

    event.preventDefault();
    const next =
      event.key === "ArrowRight"
        ? (index + 1) % tabs.length
        : event.key === "ArrowLeft"
          ? (index - 1 + tabs.length) % tabs.length
          : event.key === "Home"
            ? 0
            : tabs.length - 1;
    tabs[next]?.focus();
  }

  return (
    <div className={className ?? "flex flex-col gap-6"}>
      <div
        ref={listRef}
        role="tablist"
        aria-label={label}
        onKeyDown={onKeyDown}
        className="flex flex-wrap gap-2"
      >
        {windows.map((panel) => {
          const selected = panel.window === current.window;
          return (
            <Link
              key={panel.window}
              id={`${idPrefix}-tab-${panel.window}`}
              role="tab"
              aria-selected={selected}
              aria-controls={panelId}
              tabIndex={selected ? 0 : -1}
              scroll={false}
              href={queryHref(basePath, { ...query, window: panel.window })}
              className={cx(
                "inline-flex min-h-11 min-w-11 items-center justify-center rounded-none border-2 border-foreground px-4 text-sm font-bold tracking-wider uppercase transition duration-200 ease-out md:border-4",
                selected
                  ? "bg-foreground text-surface shadow-none"
                  : "bg-surface text-foreground shadow-hard-sm hover:bg-muted",
              )}
            >
              {panel.label}
            </Link>
          );
        })}
      </div>

      {/*
        The prototype carries no standing window description — only the
        top-up note, and only when a top-up actually happened. The snapshot
        date still has to be stated somewhere (global constraint 4), so it
        stays in the accessibility tree rather than as visible clutter.
      */}
      <p className="sr-only">互动数据观测于 {observedAt}。</p>

      {current.note === null ? null : <Panel tone="note">{current.note}</Panel>}

      <div id={panelId} role="tabpanel" aria-labelledby={`${idPrefix}-tab-${current.window}`}>
        {current.items.length === 0 ? (
          <StateBlock variant="empty" message={emptyMessage} />
        ) : (
          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {current.items.map((prompt) => (
              <li key={prompt.id} className="flex min-w-0">
                <PromptCard
                  prompt={prompt}
                  locale={locale}
                  variant={cardVariant}
                  idPrefix={idPrefix}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

