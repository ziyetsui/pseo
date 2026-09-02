import type { ReactNode } from "react";

import { dividerClassName } from "@/components/ui/dividers";
import { sectionTitleClassName } from "@/components/ui/type-scale";

export interface ModelSectionProps {
  /** Id of the `<h2>`; the section is labelled by it. Unique per page. */
  id: string;
  title: string;
  /**
   * The prototype's `.sec-head .end` slot — the `共 136 条` counter next to
   * 全部提示词, the `3 条` pill next to 带变量的提示词. `components/ui/Section`
   * has no such slot (only a `moreHref` link), so the L3 page renders its own
   * section head with the same visual contract. See the report's
   * "Requested shared-file changes".
   */
  end?: ReactNode;
  /** The prototype's `.subline`, rendered under the head as plain text. */
  subline?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** A titled band with the prototype's `sec-head` end slot. */
export function ModelSection({ id, title, end, subline, children, className }: ModelSectionProps) {
  return (
    <section aria-labelledby={id} className={className ?? "mt-10 md:mt-14"}>
      <div
        className={dividerClassName("card", "bottom", {
          className: "flex flex-wrap items-end justify-between gap-4 pb-3",
        })}
      >
        <h2 id={id} className={sectionTitleClassName("uppercase")}>
          {title}
        </h2>
        {end === undefined ? null : <div className="text-sm font-bold">{end}</div>}
      </div>
      {subline === undefined ? null : (
        <p className="mt-3 max-w-prose text-base font-medium">{subline}</p>
      )}
      <div className="mt-6">{children}</div>
    </section>
  );
}
