"use client";

import { Children, useRef, useSyncExternalStore, type KeyboardEvent, type ReactNode } from "react";

import { cx } from "./class-names";
import { elevationClassName, pressClassName, transitionClassName } from "./hover";

const noopSubscribe = () => () => {};

/**
 * `true` only once the component has hydrated on the client. Implemented with
 * `useSyncExternalStore` (server snapshot `false`, client snapshot `true`)
 * rather than a `useEffect` + `setState` pair, so there is no synchronous
 * setState-in-effect render cascade to lint against.
 */
function useHasMounted(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

export interface RailProps {
  /** Accessible name of the scrollable region. Required — an unlabelled
   *  scroll region is unusable with a screen reader. */
  label: string;
  children: ReactNode;
  className?: string;
  listClassName?: string;
  itemClassName?: string;
}

/** `false` once we know the visitor asked for reduced motion. */
function prefersSmoothScroll(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return true;
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Chrome, not content: 3px at rest with no hover shadow step at all. It used to
 * go 3px → 4px on hover, one pixel of offset on a 44px control — below the
 * perceptual threshold, and it cost a repaint to deliver it. The hover reply is
 * the fill; the press is the full collapse, travelling exactly the 3px lost.
 */
const ARROW = cx(
  "flex size-11 items-center justify-center border-2 border-foreground bg-surface text-lg font-black hover:bg-muted",
  transitionClassName("control"),
  elevationClassName("chrome"),
  pressClassName("flatten", { elevation: "chrome" }),
);

/**
 * Horizontal scroller with keyboard control.
 *
 * With JavaScript disabled it degrades to a plain `overflow-x` list: the items
 * are server-rendered, the container scrolls with the trackpad. The two
 * prev/next buttons only render after mount (see `enhanced` below) because
 * they do nothing without JavaScript — showing them pre-hydration would be a
 * dead control. With JavaScript, ArrowLeft/ArrowRight move one item and the
 * buttons move a full container width; both respect
 * `prefers-reduced-motion` by scrolling instantly instead of animating.
 */
export function Rail({ label, children, className, listClassName, itemClassName }: RailProps) {
  const scrollerRef = useRef<HTMLUListElement>(null);
  const items = Children.toArray(children);
  const enhanced = useHasMounted();

  function scrollBy(amount: number): void {
    const scroller = scrollerRef.current;
    if (scroller === null || amount === 0) return;
    const behavior = prefersSmoothScroll() ? "smooth" : "auto";
    if (typeof scroller.scrollBy === "function") {
      scroller.scrollBy({ left: amount, behavior });
      return;
    }
    scroller.scrollLeft += amount;
  }

  /** One item's width, so a key press lands on the next snap point. */
  function itemStep(): number {
    const scroller = scrollerRef.current;
    if (scroller === null) return 0;
    const first = scroller.firstElementChild;
    const width = first instanceof HTMLElement ? first.offsetWidth : 0;
    return width > 0 ? width : scroller.clientWidth;
  }

  function pageStep(): number {
    return scrollerRef.current?.clientWidth ?? 0;
  }

  function onKeyDown(event: KeyboardEvent<HTMLUListElement>): void {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      scrollBy(itemStep());
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      scrollBy(-itemStep());
    }
  }

  return (
    <div role="region" aria-label={label} className={cx("relative", className)}>
      {enhanced ? (
        <div className="mb-3 flex justify-end gap-2">
          <button
            type="button"
            aria-label="向左滚动"
            onClick={() => scrollBy(-pageStep())}
            className={ARROW}
          >
            <span aria-hidden="true">←</span>
          </button>
          <button
            type="button"
            aria-label="向右滚动"
            onClick={() => scrollBy(pageStep())}
            className={ARROW}
          >
            <span aria-hidden="true">→</span>
          </button>
        </div>
      ) : null}

      <ul
        ref={scrollerRef}
        tabIndex={0}
        onKeyDown={onKeyDown}
        className={cx(
          "flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth",
          // `overflow-x-auto` does not leave the other axis alone: a computed
          // `overflow-x` of `auto` forces `overflow-y` to `auto` as well, so
          // this scroller clips on ALL FOUR sides and no keyword can undo it.
          // With only `pb-2` it was cutting the focus ring off every card
          // inside it, the hover shadow's extra 2px, the 4/8px a pressed card
          // travels, and the last card's shadow at the end of the scroll.
          //
          // So the room is padding, and the leading edge gives it back with a
          // matching negative margin — the rail still starts flush with the
          // page's own gutter, which is 16px at every breakpoint, so 4px of
          // bleed can never reach the viewport edge. The trailing padding is
          // deliberately NOT cancelled: it is scrollable width, which is what
          // lets the last card's shadow arrive fully at the end of the travel.
          // A vertical scrollbar never appears because the padding is what the
          // overflowing decoration is drawn INTO.
          "-ml-1 pt-1 pl-1 pr-4 pb-4",
          listClassName,
        )}
      >
        {items.map((item, index) => (
          // `flex` on the item, not just on the list: the `<ul>` stretches every
          // item to the tallest card, and this passes that height through to the
          // card itself so a row of rail cards ends on one line.
          <li key={index} className={cx("flex shrink-0 snap-start", itemClassName)}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
