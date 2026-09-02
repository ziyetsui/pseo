import { Panel } from "@/components/ui/Panel";
import { Section } from "@/components/ui/Section";
import type { ModelDetail } from "@/lib/content/types";

import { EDITORIAL_STATUS_LABEL, outputLabel } from "./model-data";

export const SPEC_SECTION_ID = "model-spec";
export const SPEC_SECTION_TITLE = "能力 / 输入 / 输出 / 限制";

export interface ModelSpecPanelsProps {
  model: ModelDetail;
}

/**
 * Four columns derived from the prompts we actually hold — not a vendor spec
 * sheet. The caption says so, so nobody mistakes it for official documentation.
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

  return (
    <Section
      id={SPEC_SECTION_ID}
      title={SPEC_SECTION_TITLE}
      description={`以下四栏由本站收录的 Prompt 派生（数据状态：${EDITORIAL_STATUS_LABEL[model.editorialStatus]}），不是模型官方规格说明。`}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {columns.map((column) => (
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
    </Section>
  );
}
