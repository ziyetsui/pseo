"use client";

import { Children, useRef, useSyncExternalStore, type KeyboardEvent, type ReactNode } from "react";

import { cx } from "./class-names";

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
            className="flex size-11 items-center justify-center border-2 border-foreground bg-surface text-lg font-black shadow-hard-sm transition duration-200 ease-out active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          >
            <span aria-hidden="true">←</span>
          </button>
          <button
            type="button"
            aria-label="向右滚动"
            onClick={() => scrollBy(pageStep())}
            className="flex size-11 items-center justify-center border-2 border-foreground bg-surface text-lg font-black shadow-hard-sm transition duration-200 ease-out active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
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
          "flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2",
          listClassName,
        )}
      >
        {items.map((item, index) => (
          <li key={index} className={cx("shrink-0 snap-start", itemClassName)}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
