"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useRef, useState, type KeyboardEvent } from "react";

import { Panel } from "@/components/ui/Panel";
import { StateBlock } from "@/components/ui/StateBlock";
import { cx } from "@/components/ui/class-names";
import { elevationClassName, pressClassName, transitionClassName } from "@/components/ui/hover";
import { controlLabelClassName } from "@/components/ui/type-scale";
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

/**
 * The tab's skin. A tab is chrome — furniture around the content — so it sits
 * on the 3px chrome elevation, and its press collapses exactly that 3px.
 *
 * The selected tab gets neither: it already carries no shadow (its selected
 * state IS the inverted fill), so there would be nothing to collapse, and
 * translating a flat object against a flat page reads as a glitch rather than
 * as a press. It is also the one tab a press cannot change anything about.
 * Selection is never carried by the fill alone — `aria-selected` says it, and
 * the tab's own label is the window's name.
 */
const TAB_BASE = cx(
  "inline-flex min-h-11 min-w-11 items-center justify-center rounded-none border-2 border-foreground px-4 md:border-4",
  controlLabelClassName(),
  transitionClassName("control"),
);

const TAB_SELECTED = "bg-foreground text-surface shadow-none";

const TAB_IDLE = cx(
  "bg-surface text-foreground hover:bg-muted",
  elevationClassName("chrome"),
  pressClassName("flatten", { elevation: "chrome" }),
);

/**
 * The panel swap, and the one place on this site where the before and the
 * after are visually interchangeable: six cards in the same grid, in a
 * `role="tabpanel"` that never moves. The tab's own selected style flips, but
 * on a phone that is most of a screen above the grid, so a reader can press a
 * tab and not register that anything answered.
 *
 * So the grid arrives as ONE BLOCK — never per card. A stagger here would put
 * motion on the data the reader came to read and delay exactly the content the
 * page exists to deliver; the audit rejects that separately and explicitly.
 * Opacity and a 4px lift, 200ms, the same `ease-out` as everything else.
 *
 * `@starting-style` is the whole mechanism: keying the `<ul>` on the window
 * remounts it, and a freshly inserted element transitions from its starting
 * style. Where `@starting-style` is unsupported the grid simply appears, which
 * is today's behaviour; under `prefers-reduced-motion` the document-wide rule
 * in `globals.css` collapses the duration and it appears too.
 */
const PANEL_MOTION =
  // No channel in `transitionClassName` names opacity AND translate together —
  // `reveal` is opacity, `move` is translate. Written out here rather than
  // widened in the shared table for one call site; the invariant that matters
  // (no `outline-*` property is ever transitioned) holds.
  "translate-y-0 transition-[opacity,translate] duration-200 ease-out starting:translate-y-1 starting:opacity-0";

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

  // `@starting-style` applies to an element the first time it is rendered,
  // and that includes the panel parsed out of the exported HTML — so keying
  // the list alone would fade the hub's trending grid in on every page load,
  // i.e. put an entrance animation on the content the page exists to deliver.
  // The audit rejects exactly that, separately, for this same grid.
  //
  // So the swap is armed by the gesture rather than by time: it animates only
  // once the reader has actually pressed a tab. A press is a click on a real
  // `<Link>` (Enter on a focused tab is one too), so this is a plain event
  // handler — no effect, no post-mount flip, and nothing at all happens on a
  // page that is merely read.
  const [pressedATab, setPressedATab] = useState(false);

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
              onClick={() => setPressedATab(true)}
              href={queryHref(basePath, { ...query, window: panel.window })}
              className={cx(TAB_BASE, selected ? TAB_SELECTED : TAB_IDLE)}
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
          <ul
            // Keyed on the window so a tab press REPLACES the list rather than
            // updating it in place — which is what lets `@starting-style` see a
            // freshly inserted element. See `PANEL_MOTION`.
            key={current.window}
            className={cx(
              "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3",
              pressedATab ? PANEL_MOTION : undefined,
            )}
          >
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

