import type { ReactNode } from "react";

import { cx } from "./class-names";

/**
 * A display-scale number at 10% contrast, used to mark a group.
 *
 * It is the cheapest way to say "this is the third band" without spending a
 * word or a colour on it: at that contrast it never competes with the heading
 * beside it, and at that size it is impossible to miss while scrolling.
 *
 * `aria-hidden`, always. The number is an ordinal a reader infers from
 * position anyway, and it must never be the only label for anything — the
 * group's own heading is the label, and this sits next to it.
 */

export interface GhostNumeralProps {
  /** Usually a zero-padded ordinal: `01`, `02`. Rendered as given. */
  value: ReactNode;
  className?: string;
}

export function GhostNumeral({ value, className }: GhostNumeralProps) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        "block text-5xl leading-none font-black tracking-tighter text-foreground/10 tabular-nums select-none md:text-6xl",
        className,
      )}
    >
      {value}
    </span>
  );
}
