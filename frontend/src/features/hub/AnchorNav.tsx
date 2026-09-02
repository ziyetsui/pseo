/**
 * The prototype's L1 nav bar: six in-page anchors, `任务 镜头 模型 风格 合集
 * 创作者`, pointing at the browse sections further down the same document.
 *
 * These are the one legitimate kind of `#` href — a fragment that resolves to
 * an id in the SAME document, which `scripts/check-static-output.mjs` verifies
 * against the shipped HTML. The hub page must therefore give its sections
 * exactly the ids in `HUB_SECTION_IDS`.
 */

import { cx } from "@/components/ui/class-names";
import { dividerClassName } from "@/components/ui/dividers";

export const HUB_SECTION_IDS = {
  tasks: "tasks",
  camera: "camera",
  models: "models",
  styles: "styles",
  collections: "collections",
  creators: "creators",
} as const;

export type HubSectionId = (typeof HUB_SECTION_IDS)[keyof typeof HUB_SECTION_IDS];

export interface AnchorNavItem {
  label: string;
  id: HubSectionId;
}

/** Prototype order and labels, verbatim. */
export const HUB_ANCHORS: readonly AnchorNavItem[] = [
  { label: "任务", id: HUB_SECTION_IDS.tasks },
  { label: "镜头", id: HUB_SECTION_IDS.camera },
  { label: "模型", id: HUB_SECTION_IDS.models },
  { label: "风格", id: HUB_SECTION_IDS.styles },
  { label: "合集", id: HUB_SECTION_IDS.collections },
  { label: "创作者", id: HUB_SECTION_IDS.creators },
];

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
      // spelled out here; it draws exactly what it drew before.
      className={className ?? cx(dividerClassName("card", "bottom"), "bg-surface")}
    >
      <ul className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-1 px-4 md:px-8">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className="flex min-h-11 items-center text-sm font-bold tracking-wider uppercase"
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
