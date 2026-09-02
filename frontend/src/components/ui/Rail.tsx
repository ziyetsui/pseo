"use client";

import { Children, useRef, type KeyboardEvent, type ReactNode } from "react";

import { cx } from "./class-names";

export interface RailProps {
  /** Accessible name of the scrollable region. Required — an unlabelled
   *  scroll region is unusable with a screen reader. */
  label: string;
  children: ReactNode;
  className?: string;
  listClassName?: string;
  itemClassName?: string;
}

/**
 * Horizontal scroller with keyboard control.
 *
 * With JavaScript disabled it degrades to a plain `overflow-x` list: the items
 * are server-rendered, the container scrolls with the trackpad, and the two
 * buttons simply do nothing. With JavaScript, ArrowLeft/ArrowRight move one
 * item and the buttons move a full container width.
 */
export function Rail({ label, children, className, listClassName, itemClassName }: RailProps) {
  const scrollerRef = useRef<HTMLUListElement>(null);
  const items = Children.toArray(children);

  function scrollBy(amount: number): void {
    const scroller = scrollerRef.current;
    if (scroller === null || amount === 0) return;
    if (typeof scroller.scrollBy === "function") {
      scroller.scrollBy({ left: amount, behavior: "smooth" });
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
