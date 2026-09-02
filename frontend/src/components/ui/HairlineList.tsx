import Link from "next/link";
import type { ReactNode } from "react";

import { Chevron } from "./Chevron";
import { cx } from "./class-names";
import { dividerClassName } from "./dividers";
import { hoverRevealClassName } from "./hover";

/**
 * The most counter-intuitive piece of this system: **not everything should be
 * a card.**
 *
 * A dense text index — a taxonomy list, a footer column, a related-links block
 * — put into cards produces thirty bordered boxes holding one word each, and
 * the noise buries the content. Demoted to hairline rows, the same index takes
 * a quarter of the space and stops competing. The payoff is not in the index
 * at all: it is that the real cards on the page become the only heavy objects
 * left, and therefore read as important again.
 *
 * So a hairline row has: a very light rule (the `row` divider tier, the
 * lightest of the three), no border, no shadow, no fill, and a chevron that is
 * transparent until the row is hovered OR focused.
 */

export interface HairlineListProps {
  children: ReactNode;
  className?: string;
}

/** The `<ul>` the rows live in. Rows carry their own rule, so this is bare. */
export function HairlineList({ children, className }: HairlineListProps) {
  return <ul className={cx("flex flex-col", className)}>{children}</ul>;
}

export interface HairlineRowProps {
  /** Real destination. Rows are links; a row that navigates nowhere is text. */
  href: string;
  children: ReactNode;
  /** Secondary text at the right — a count, a date. Optional. */
  meta?: ReactNode;
  /** Off-site destination: opens in a new tab, `noopener nofollow`. */
  external?: boolean;
  /** Drop the rule under the last row of a list. */
  last?: boolean;
  className?: string;
}

export function HairlineRow({
  href,
  children,
  meta,
  external = false,
  last = false,
  className,
}: HairlineRowProps) {
  const body = (
    <>
      <span className="min-w-0 flex-1">{children}</span>
      {meta === undefined ? null : <span className="shrink-0 tabular-nums">{meta}</span>}
      {/*
        The chevron is the row's only decoration and never its only signal:
        the row is a link whatever the chevron is doing, and the reveal
        answers to focus as well as hover so a keyboard sees the same thing a
        pointer does.
      */}
      <Chevron className={hoverRevealClassName()} />
    </>
  );

  // `min-h-11`: 44px, the touch-target floor — a hairline row is visually
  // slight but must not be a slight target.
  const rowClassName = cx(
    "group flex min-h-11 w-full items-center gap-3 py-2 text-sm font-medium no-underline",
    last ? undefined : dividerClassName("row", "bottom"),
    className,
  );

  return (
    <li className="flex flex-col">
      {external ? (
        <a href={href} target="_blank" rel="noopener nofollow" className={rowClassName}>
          {body}
          <span className="sr-only">（外部链接，新窗口打开）</span>
        </a>
      ) : (
        <Link href={href} className={rowClassName}>
          {body}
        </Link>
      )}
    </li>
  );
}
