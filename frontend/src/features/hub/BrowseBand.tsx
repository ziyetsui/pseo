import type { ReactNode } from "react";

import { GhostNumeral } from "@/components/ui/GhostNumeral";
import { cx } from "@/components/ui/class-names";
import { dividerClassName } from "@/components/ui/dividers";

/**
 * One of the hub's six browse bands: the same titled band `Section` draws, plus
 * a ghost numeral marking which of the six this is.
 *
 * ## Why this is not `Section` with one more prop
 *
 * `Section` owns the `<h2>` and has no slot beside it, and `components/ui` is
 * frozen for this round — so the marker is composed here instead. It is a
 * deliberate local workaround, not a second heading style: the heading keeps
 * its level, its id (`AnchorNav` links to it), its wording and its type, and
 * the rule under it is the same card-tier rule `Section` draws, now asked for
 * by name. Everything else about the two is identical. The gap to close later
 * is a `marker` slot on `Section`.
 *
 * The numeral is `aria-hidden` and sits in its own flex cell rather than
 * floating over the header, so it can never land on top of a band description
 * at any width. It is never the only label for anything — the band's heading
 * says what the band is, and a reader who cannot see the numeral loses
 * nothing but the decoration.
 */

export interface BrowseBandProps {
  /** Id of the `<h2>`, as `Section` does — must be one of `HUB_SECTION_IDS`. */
  id: string;
  title: string;
  description?: string;
  /** 1-based position among the browse bands; drawn zero-padded as `01`…`06`. */
  ordinal: number;
  children: ReactNode;
  className?: string;
}

export function BrowseBand({
  id,
  title,
  description,
  ordinal,
  children,
  className,
}: BrowseBandProps) {
  return (
    <section aria-labelledby={id} className={cx("mt-10 first:mt-0 md:mt-14", className)}>
      <div
        className={cx(
          "flex flex-wrap items-end justify-between gap-4 pb-3",
          dividerClassName("card", "bottom", { desktopThick: true }),
        )}
      >
        <div>
          <h2 id={id} className="text-2xl font-black tracking-tighter uppercase md:text-3xl">
            {title}
          </h2>
          {description === undefined ? null : (
            <p className="mt-2 max-w-prose text-base font-medium">{description}</p>
          )}
        </div>
        <GhostNumeral value={String(ordinal).padStart(2, "0")} />
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}
