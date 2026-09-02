import { Panel } from "@/components/ui/Panel";
import type { ModelDetail } from "@/lib/content/types";

import { ModelSection } from "./ModelSection";
import { EDITORIAL_STATUS_LABEL, outputLabel } from "./model-data";

export const SPEC_SECTION_ID = "model-spec";

/**
 * `能力 / 输入 / 输出 / 限制（由收录 Prompt 派生）` — the provenance is part of
 * the heading rather than a footnote, because the four columns are NOT a vendor
 * spec sheet and the heading is what a screen-reader user hears when they jump
 * between the page's regions.
 */
export function specSectionTitle(status: ModelDetail["editorialStatus"]): string {
  return `能力 / 输入 / 输出 / 限制（${EDITORIAL_STATUS_LABEL[status]}）`;
}

export interface ModelSpecPanelsProps {
  model: ModelDetail;
}

/**
 * Four columns derived from the prompts we actually hold. The prototype has no
 * such block; it is here because the handoff (§9) requires the model page to
 * state capabilities / inputs / outputs / limitations. It sits immediately
 * after 关于这个模型 — the prototype's own "what is this model" band — so the
 * addition disturbs the prototype's module order as little as possible.
 *
 * A column with nothing in it is dropped as long as at least one of its
 * siblings has something: a panel whose entire content is 尚未收录… is a
 * heading and a sentence saying there is no data, sitting at the same weight
 * as the panels that do carry data. When NO column has anything the four
 * empty sentences stay, because then the block's honest state IS "nothing has
 * been derived yet" and silently rendering an empty band would hide it.
 */
export function ModelSpecPanels({ model }: ModelSpecPanelsProps) {
  const columns: { title: string; items: readonly string[]; empty: string }[] = [
    { title: "能力", items: model.capabilities, empty: "尚未从收录 Prompt 中归纳出能力。" },
    { title: "输入", items: model.inputs, empty: "尚未收录输入方式。" },
    {
      title: "输出",
      items: model.outputs.map(outputLabel),
      empty: "尚未收录输出类型。",
    },
    { title: "限制", items: model.limitations, empty: "尚未收录限制说明。" },
  ];

  const withItems = columns.filter((column) => column.items.length > 0);
  const visible = withItems.length === 0 ? columns : withItems;

  return (
    <ModelSection
      id={SPEC_SECTION_ID}
      title={specSectionTitle(model.editorialStatus)}
      subline="以下四栏归纳自本站收录的 Prompt，不是模型官方规格说明。"
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {visible.map((column) => (
          <Panel key={column.title} tone="neutral" className="flex flex-col gap-3">
            <h3 className="text-base font-black tracking-tight uppercase">{column.title}</h3>
            {column.items.length === 0 ? (
              <p className="text-sm font-medium">{column.empty}</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {column.items.map((item) => (
                  <li key={item} className="text-sm font-medium">
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        ))}
      </div>
    </ModelSection>
  );
}
