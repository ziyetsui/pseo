import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { Section } from "@/components/ui/Section";

/**
 * The prototype's generate box had three controls (设置 / 参考图 / 生成) behind
 * nothing at all. Hiding them would lose the prototype's information, so they
 * are kept as visibly disabled buttons that state why. One shared explanation
 * element is referenced by all three via `aria-describedby`, so the reason is
 * announced with every button without repeating the sentence three times (and
 * without three elements colliding on one DOM id).
 *
 * The real search on this page is the `PromptExplorer` search form below.
 */

export const GENERATE_SECTION_ID = "model-generate";
export const GENERATE_DISABLED_REASON_ID = "model-generate-disabled-reason";
export const GENERATE_DISABLED_REASON = "生成功能尚未接入，本页仅提供 Prompt 复制";

const CONTROLS = ["设置", "参考图", "生成"] as const;

export function ModelGenerateControls() {
  return (
    <Section id={GENERATE_SECTION_ID} title="生成（尚未接入）">
      <Panel tone="note" className="flex flex-col gap-3">
        <p id={GENERATE_DISABLED_REASON_ID}>{GENERATE_DISABLED_REASON}。</p>
        <div className="flex flex-wrap gap-3">
          {CONTROLS.map((label) => (
            <Button
              key={label}
              variant="outline"
              disabled
              aria-describedby={GENERATE_DISABLED_REASON_ID}
            >
              {label}
            </Button>
          ))}
        </div>
      </Panel>
    </Section>
  );
}
