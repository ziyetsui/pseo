import { cx } from "./class-names";
import { dividerClassName } from "./dividers";
import { MediaFrame, type MediaFrameProps } from "./MediaFrame";

/**
 * The media slot, and with it the card's compartment rule:
 *
 *     media  →  full-bleed rule  →  body
 *
 * The rule is the `card` divider tier — the heavy one, drawn edge to edge at
 * the same weight as the card's own frame. That is what makes the picture and
 * the words read as two compartments of one object instead of a picture with
 * some text loose underneath it. Inset it, lighten it, or leave it out and the
 * card immediately looks like a web page rather than a printed card.
 *
 * A wrapper rather than a change to `MediaFrame`: `MediaFrame` is the
 * `"use client"` leaf that owns the `<img>` and its failure state, and is also
 * used outside cards (the L4 hero, the thumbnail strip), where the compartment
 * rule does not apply. This module is a server component and simply names the
 * rule it adds.
 */
export type CardMediaProps = MediaFrameProps;

export function CardMedia({ className, ...rest }: CardMediaProps) {
  return (
    <MediaFrame
      {...rest}
      className={cx(dividerClassName("card", "bottom"), className)}
    />
  );
}
