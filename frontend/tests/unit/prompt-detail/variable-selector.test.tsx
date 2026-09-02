import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { VariableSelector } from "@/features/prompt-detail/VariableSelector";
import {
  getContentRepository,
  countToken,
  type PromptDetail,
  type PromptVariable,
} from "@/lib/content";

/**
 * Driven by the real golden record, not a hand-written fixture: the whole point
 * of the selector is that "替换 N 处" is counted from the shipped prompt text,
 * so the test must fail if that text (or the counting) ever changes.
 */
const GOLDEN_SLUG = "country-miniature-stamp-poster";
const TOKEN = "[COUNTRY]";

let golden: PromptDetail;
let variable: PromptVariable;
let options: readonly string[];
let occurrences: number;

beforeAll(async () => {
  const detail = await getContentRepository().getPromptBySlug("zh-CN", GOLDEN_SLUG);
  if (detail === null) throw new Error(`fixture is missing the golden record ${GOLDEN_SLUG}`);
  golden = detail;
  const [first] = detail.variables;
  if (first === undefined) throw new Error("the golden record must declare a variable");
  variable = first;
  options = first.options;
  occurrences = countToken(golden.promptText, TOKEN);
});

function setClipboard(value: unknown): void {
  Object.defineProperty(navigator, "clipboard", { value, configurable: true, writable: true });
}

afterEach(() => {
  setClipboard(undefined);
});

function renderSelector() {
  return render(
    <div>
      <pre id="prompt-text">{golden.promptText}</pre>
      <VariableSelector
        promptText={golden.promptText}
        variables={golden.variables}
        targetId="prompt-text"
      />
    </div>,
  );
}

describe("VariableSelector", () => {
  it("exposes one radiogroup per variable with every option as a radio", () => {
    renderSelector();
    const group = screen.getByRole("radiogroup", { name: /国家/ });
    const radios = within(group).getAllByRole("radio");
    expect(radios.map((radio) => radio.textContent)).toEqual(options);
    expect(radios[0]).toHaveAttribute("aria-checked", "true");
  });

  it("copies the prompt with every token occurrence replaced by the chosen value", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });

    renderSelector();
    await userEvent.click(screen.getByRole("radio", { name: "France" }));
    await userEvent.click(screen.getByRole("button", { name: /复制提示词/ }));

    expect(writeText).toHaveBeenCalledTimes(1);
    const copied = String(writeText.mock.calls[0]?.[0]);
    expect(copied).not.toContain(TOKEN);
    expect(countToken(copied, "France")).toBe(occurrences);
    expect(occurrences).toBeGreaterThan(0);
  });

  it("announces the current selection and the counted replacement number", async () => {
    renderSelector();

    const status = screen.getByText(new RegExp(`当前选择：${variable.defaultValue}`));
    expect(status).toHaveAttribute("role", "status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveTextContent(`替换 ${occurrences} 处 ${TOKEN}`);

    await userEvent.click(screen.getByRole("radio", { name: "Egypt" }));
    expect(screen.getByText(/当前选择：Egypt/)).toHaveTextContent(
      `当前选择：Egypt，复制时替换 ${occurrences} 处 ${TOKEN}`,
    );
  });

  it("moves the selection with the arrow keys and keeps focus on the checked radio", async () => {
    renderSelector();

    const first = screen.getByRole("radio", { name: options[0] ?? "" });
    first.focus();

    await userEvent.keyboard("{ArrowRight}");
    const second = screen.getByRole("radio", { name: options[1] ?? "" });
    expect(second).toHaveAttribute("aria-checked", "true");
    expect(second).toHaveFocus();
    expect(first).toHaveAttribute("aria-checked", "false");
    expect(first).toHaveAttribute("tabindex", "-1");

    await userEvent.keyboard("{ArrowLeft}");
    expect(screen.getByRole("radio", { name: options[0] ?? "" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("radio", { name: options[0] ?? "" })).toHaveFocus();

    // Wraps backwards to the last option.
    await userEvent.keyboard("{ArrowLeft}");
    const last = screen.getByRole("radio", { name: options[options.length - 1] ?? "" });
    expect(last).toHaveAttribute("aria-checked", "true");
  });

  it("warns about tokens it cannot replace instead of copying them silently", () => {
    render(
      <div>
        <pre id="prompt-text">{`Draw ${TOKEN} in [STYLE_NAME].`}</pre>
        <VariableSelector
          promptText={`Draw ${TOKEN} in [STYLE_NAME].`}
          variables={golden.variables}
          targetId="prompt-text"
        />
      </div>,
    );
    expect(screen.getByText(/以下变量未替换/)).toHaveTextContent("[STYLE_NAME]");
  });

  it("renders a second copy button in the sticky bar that copies the same substituted text", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });

    render(
      <div>
        <pre id="prompt-text">{golden.promptText}</pre>
        <VariableSelector
          promptText={golden.promptText}
          variables={golden.variables}
          targetId="prompt-text"
          sticky={{
            title: golden.title,
            meta: "GPT Image 2 · @Naiknelofar788",
            sourceUrl: golden.source.url,
          }}
        />
      </div>,
    );

    await userEvent.click(screen.getByRole("radio", { name: "Mexico" }));

    const bar = screen.getByRole("complementary", { name: /快捷操作/ });
    await userEvent.click(within(bar).getByRole("button", { name: /复制提示词/ }));

    const copied = String(writeText.mock.calls[0]?.[0]);
    expect(copied).not.toContain(TOKEN);
    expect(countToken(copied, "Mexico")).toBe(occurrences);
    expect(within(bar).getByRole("link", { name: /原帖/ })).toHaveAttribute(
      "href",
      golden.source.url,
    );
  });
});
