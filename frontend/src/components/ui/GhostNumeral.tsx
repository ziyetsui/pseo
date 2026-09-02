import type { CSSProperties } from "react";

import { cx } from "./class-names";
import { IS_BAUHAUS } from "./theme";

/**
 * A display-scale number at 10% contrast, used to mark a group.
 *
 * It is the cheapest way to say "this is the third band" without spending a
 * word or a colour on it: at that contrast it never competes with the heading
 * beside it, and at that size it is impossible to miss while scrolling.
 *
 * The digits are painted by a `::before` rule (see `.ghost-numeral` in
 * `globals.css`) rather than written as a text node. The numeral is decoration
 * — an ordinal the reader already has from position, next to a heading that is
 * the real label — but an automated audit reading a 10%-contrast text node can
 * only report a serious contrast failure, and the passing ratio would make the
 * number compete with the heading. Moving it out of the text layer keeps the
 * design and states its nature honestly.
 *
 * `aria-hidden` as well, so it never reaches assistive technology.
 */

export interface GhostNumeralProps {
  /** Usually a zero-padded ordinal: `01`, `02`. Digits only. */
  value: string;
  className?: string;
}

export function GhostNumeral({ value, className }: GhostNumeralProps) {
  // Only digits reach `content`, so the value can never close the CSS string.
  const digits = value.replace(/\D/g, "");

  return (
    <span
      aria-hidden="true"
      style={{ "--ghost-numeral": `"${digits}"` } as CSSProperties}
      className={cx(
        "ghost-numeral block text-5xl leading-none",
        /*
         * Weight is the one thing about the numeral that changes with the
         * theme. 900 + `tracking-tighter` is a poster numeral: it is trying to
         * be a graphic element, which is right in a system built out of them.
         * In `neutral` nothing decorative shouts, so it drops to the weight the
         * platform face actually draws well at display size and gives back the
         * negative tracking that was crowding the digits. It stays at 10% ink
         * and stays out of the text layer either way — see `globals.css`.
         *
         * Spliced in HERE rather than appended, so that under `bauhaus` the
         * emitted string is character-for-character the one that shipped before
         * the theme existed — a reordered class list renders identically but
         * makes an equivalence diff report a difference that is not one.
         */
        IS_BAUHAUS ? "font-black tracking-tighter" : "font-semibold tracking-tight",
        "text-foreground/10 tabular-nums select-none md:text-6xl",
        className,
      )}
    />
  );
}
