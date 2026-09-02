import { Button } from "@/components/ui/Button";

/**
 * The prototype's generate box carries three controls (`⚙ 设置 / 🖼 参考图 /
 * 生成`) that are wired to nothing at all. Hiding them would lose the
 * prototype's information, so they stay where the prototype puts them — inside
 * the hero genbox, on one row under the search input — as visibly disabled
 * controls with a single shared explanation.
 *
 * `Button disabled` renders `aria-disabled` rather than the `disabled`
 * attribute, so the controls stay focusable and a screen reader actually
 * reaches the reason; all three point at ONE explanation element via
 * `aria-describedby`, so the sentence is announced with every button without
 * being repeated three times on screen (handoff §9, global constraint 12).
 *
 * The prototype's emoji glyphs are dropped: they are decorative, and an emoji
 * inside an accessible name is read aloud as its Unicode description.
 */

export const GENERATE_DISABLED_REASON_ID = "model-generate-disabled-reason";
export const GENERATE_DISABLED_REASON = "生成功能尚未接入，本页仅提供 Prompt 复制";

const SECONDARY_CONTROLS = ["设置", "参考图"] as const;

export function ModelGenerateControls() {
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        {SECONDARY_CONTROLS.map((label) => (
          <Button
            key={label}
            variant="ghost"
            disabled
            aria-describedby={GENERATE_DISABLED_REASON_ID}
          >
            {label}
          </Button>
        ))}
        <Button
          variant="primary"
          disabled
          aria-describedby={GENERATE_DISABLED_REASON_ID}
          className="ms-auto"
        >
          生成
        </Button>
      </div>

      <p id={GENERATE_DISABLED_REASON_ID} className="mt-3 text-xs font-medium">
        {GENERATE_DISABLED_REASON}
      </p>
    </>
  );
}
