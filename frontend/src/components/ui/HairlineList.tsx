import Link from "next/link";
import type { HTMLAttributes, ReactNode } from "react";

import { Chevron } from "./Chevron";
import { cx } from "./class-names";
import { dividerClassName, type DividerSurface } from "./dividers";
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

/**
 * Everything else an `<a>` or a `<span>` accepts, forwarded to the ROW itself
 * rather than to an inner wrapper — which is what lets a caller (or a test) put
 * a `data-*` hook on the thing that actually is the row.
 *
 * Typed against `HTMLElement` rather than the anchor, because the same props
 * land on a `<span>` when the row has no destination.
 */
type HairlineRowRest = Omit<HTMLAttributes<HTMLElement>, "children" | "className">;

export interface HairlineRowProps extends HairlineRowRest {
  /**
   * Real destination, and the row's variant switch.
   *
   * A row with an `href` is a link. A row WITHOUT one is text: same rule, same
   * 44px floor, same type — minus the chevron, because an arrow on something
   * that navigates nowhere is a lie, and minus the anchor, because a row that
   * navigates nowhere is not a link. That is the shape every unbuilt
   * destination on the site needs (`（即将推出）` entries in the gallery, the
   * model page, the prompt detail page and the footer), and it lives here so
   * those four stop each keeping a private copy of it.
   *
   * The non-link row says its own state in words — the caller writes the note
   * into `children` — so nothing here is signalled by weight or colour alone.
   */
  href?: string;
  children: ReactNode;
  /** Secondary text at the right — a count, a date. Optional. */
  meta?: ReactNode;
  /** Off-site destination: opens in a new tab, `noopener nofollow`. */
  external?: boolean;
  /** Drop the rule under the last row of a list. */
  last?: boolean;
  /** Surface the row's rule is drawn on. `inverse` is the footer. */
  surface?: DividerSurface;
  className?: string;
}

export function HairlineRow({
  href,
  children,
  meta,
  external = false,
  last = false,
  surface = "canvas",
  className,
  ...rest
}: HairlineRowProps) {
  const body = (
    <>
      <span className="min-w-0 flex-1">{children}</span>
      {meta === undefined ? null : <span className="shrink-0 tabular-nums">{meta}</span>}
      {/*
        The chevron is the row's only decoration and never its only signal:
        the row is a link whatever the chevron is doing, and the reveal
        answers to focus as well as hover so a keyboard sees the same thing a
        pointer does. A row with no destination has no chevron at all.
      */}
      {href === undefined ? null : <Chevron className={hoverRevealClassName()} />}
    </>
  );

  // `min-h-11`: 44px, the touch-target floor — a hairline row is visually
  // slight but must not be a slight target.
  const rowClassName = cx(
    "group flex min-h-11 w-full items-center gap-3 py-2 text-sm font-medium no-underline",
    last ? undefined : dividerClassName("row", "bottom", { surface }),
    className,
  );

  return (
    <li className="flex flex-col">
      {href === undefined ? (
        <span {...rest} className={rowClassName}>
          {body}
        </span>
      ) : external ? (
        <a
          {...rest}
          href={href}
          target="_blank"
          rel="noopener nofollow"
          className={rowClassName}
        >
          {body}
          <span className="sr-only">（外部链接，新窗口打开）</span>
        </a>
      ) : (
        <Link {...rest} href={href} className={rowClassName}>
          {body}
        </Link>
      )}
    </li>
  );
}
