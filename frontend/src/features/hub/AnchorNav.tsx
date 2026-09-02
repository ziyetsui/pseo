/**
 * The hub's in-page nav bar: `模型 合集 创作者`, pointing at the browse
 * sections further down the same document.
 *
 * The prototype's bar had six anchors. Three of them — 任务, 镜头, 风格 —
 * pointed at browse bands that were a second printing of the facet chip rows
 * and have been deleted, so the anchors went with the sections rather than
 * being repointed: an anchor that lands on the chip block would be a fourth
 * name for a control the reader can already see, and one that lands nowhere
 * fails `scripts/check-static-output.mjs` rule 3.
 *
 * These are the one legitimate kind of `#` href — a fragment that resolves to
 * an id in the SAME document, which that script verifies against the shipped
 * HTML. `HUB_SECTION_IDS` therefore holds exactly the ids
 * `PromptHubBrowse` still renders, and every one of them is linked here.
 */

import { cx } from "@/components/ui/class-names";
import { dividerClassName } from "@/components/ui/dividers";
import { pressClassName, transitionClassName } from "@/components/ui/hover";
import { controlLabelClassName } from "@/components/ui/type-scale";

export const HUB_SECTION_IDS = {
  models: "models",
  collections: "collections",
  creators: "creators",
} as const;

export type HubSectionId = (typeof HUB_SECTION_IDS)[keyof typeof HUB_SECTION_IDS];

export interface AnchorNavItem {
  label: string;
  id: HubSectionId;
}

/** One anchor per surviving browse band, in page order. Labels verbatim. */
export const HUB_ANCHORS: readonly AnchorNavItem[] = [
  { label: "模型", id: HUB_SECTION_IDS.models },
  { label: "合集", id: HUB_SECTION_IDS.collections },
  { label: "创作者", id: HUB_SECTION_IDS.creators },
];

/**
 * Three labels on a bar: the control-label tier, which is what every other
 * uppercase 14px control on the site now wears.
 *
 * The press is `band`. These anchors have no border, no shadow and no fill, so
 * there is nothing to collapse and translating a bare label on a bare bar reads
 * as a glitch; filling the band for the length of the tap is the reply that
 * fits. It is also the only feedback the bar gives on touch — the jump it
 * performs is instant and silent, and until now a tap produced nothing at all
 * before the page was suddenly somewhere else.
 */
const ANCHOR = cx(
  "flex min-h-11 items-center",
  controlLabelClassName(),
  transitionClassName("fill"),
  pressClassName("band"),
);

export interface AnchorNavProps {
  items?: readonly AnchorNavItem[];
  label?: string;
  className?: string;
}

export function AnchorNav({ items = HUB_ANCHORS, label = "页内导航", className }: AnchorNavProps) {
  if (items.length === 0) return null;

  return (
    <nav
      aria-label={label}
      // The rule under the bar is the card tier asked for by name rather than
      // spelled out here.
      //
      // It KEEPS the tier's `desktopThick` default (2px mobile, 4px from `md`),
      // which is a change from the 2px-everywhere it drew before, and it is the
      // right one: this bar sits flush under `SiteHeader`, whose own bottom rule
      // is `border-b-2 md:border-b-4`. Two stacked pieces of page chrome, 44px
      // apart, drawing their closing rules at different weights on desktop was
      // the mismatch — not the step itself. `browse-tile.tsx`'s proportion bar
      // is the call site that genuinely wants the opt-out.
      className={className ?? cx(dividerClassName("card", "bottom"), "bg-surface")}
    >
      <ul className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-1 px-4 md:px-8">
        {items.map((item) => (
          <li key={item.id}>
            <a href={`#${item.id}`} className={ANCHOR}>
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
