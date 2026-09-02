import { render, screen, within } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";

import { PromptDetailView } from "@/features/prompt-detail/PromptDetailView";
import { formatStepBody, variationVariableName } from "@/features/prompt-detail/variable-view";
import {
  countToken,
  extractVariables,
  formatCreatorHandle,
  getContentRepository,
  type PromptDetail,
} from "@/lib/content";
import { buildBreadcrumbTrail } from "@/lib/seo/breadcrumbs";

const GOLDEN_SLUG = "country-miniature-stamp-poster";
const TOKEN = "[COUNTRY]";
// Its `promptText` contains only `@img1` (a reference-image placeholder), no
// `[BRACKET]`-style substitutable token, and its curated `variables` is empty.
const REFERENCE_ONLY_SLUG = "scene-a-seamless-ultra-cinematic-one-take-sh-2071174186978951379";

const repository = getContentRepository();

let golden: PromptDetail;
let plain: PromptDetail;
let referenceOnly: PromptDetail;

beforeAll(async () => {
  const detail = await repository.getPromptBySlug("zh-CN", GOLDEN_SLUG);
  if (detail === null) throw new Error(`fixture is missing the golden record ${GOLDEN_SLUG}`);
  golden = detail;

  // A prompt whose text carries no variable tokens at all — the same template
  // has to render it without inventing empty sections.
  const { items } = await repository.listPrompts("zh-CN");
  for (const item of items) {
    if (extractVariables(item.promptText).length > 0) continue;
    const candidate = await repository.getPromptBySlug("zh-CN", item.slug);
    if (candidate === null || candidate.variables.length > 0 || candidate.steps.length > 0) continue;
    plain = candidate;
    break;
  }
  if (plain === undefined) throw new Error("fixture has no prompt without variables");

  const referenceDetail = await repository.getPromptBySlug("zh-CN", REFERENCE_ONLY_SLUG);
  if (referenceDetail === null) {
    throw new Error(`fixture is missing the reference-image record ${REFERENCE_ONLY_SLUG}`);
  }
  referenceOnly = referenceDetail;
});

function renderDetail(prompt: PromptDetail) {
  return render(
    <PromptDetailView
      prompt={prompt}
      locale="zh-CN"
      breadcrumbs={buildBreadcrumbTrail({ page: "promptDetail", locale: "zh-CN", prompt })}
    />,
  );
}

function renderGolden() {
  return renderDetail(golden);
}

describe("PromptDetailView — golden record", () => {
  it("renders the title as the page's only H1 and the editorial summary", () => {
    renderGolden();
    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent(golden.title);
    expect(screen.getByText(golden.summary ?? "")).toBeInTheDocument();
  });

  it("puts the prototype's kicker chips in one row before the H1", () => {
    const { container } = renderGolden();
    const heading = screen.getAllByRole("heading", { level: 1 })[0];
    const kicker = heading?.previousElementSibling;
    expect(kicker).not.toBeNull();
    const chipText = Array.from(kicker?.children ?? []).map((node) =>
      (node.textContent ?? "").trim(),
    );
    // `Prompt` (solid) · model · platform · technique · style — the prototype's
    // five chips, with the Chinese fixture labels where it has them.
    expect(chipText).toEqual(["Prompt", "GPT Image 2", "Higgsfield", "微缩摄影", "写实风"]);
    expect(container.querySelectorAll('a[href="#"]')).toHaveLength(0);
  });

  it("keeps the prototype's section order", () => {
    renderGolden();
    const headings = screen.getAllByRole("heading", { level: 2 }).map((node) => node.textContent);
    expect(headings).toEqual([
      "提示词",
      "使用步骤",
      "换个国家试试",
      "同系列",
      "来源",
      "输入 / 参数",
      "相关",
    ]);
  });

  it("names the counted variable total in the section note and the payload bar", () => {
    renderGolden();
    const occurrences = countToken(golden.promptText, TOKEN);
    expect(occurrences).toBeGreaterThan(0);
    expect(
      screen.getByText(
        `原文完整保留。高亮 ${TOKEN} 为变量，全文出现 ${occurrences} 次，替换为同一国家名即可使用。`,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(`英文 · ${occurrences} 处变量`)).toBeInTheDocument();
  });

  it("puts the primary copy button in the payload bar next to the language label", () => {
    renderGolden();
    const occurrences = countToken(golden.promptText, TOKEN);
    const bar = screen.getByText(`英文 · ${occurrences} 处变量`).parentElement;
    expect(bar).not.toBeNull();
    expect(within(bar as HTMLElement).getByRole("button", { name: /复制提示词/ })).toBeInTheDocument();
  });

  it("renders the prompt verbatim in a selectable <pre> with the tokens marked", () => {
    const { container } = renderGolden();
    const pre = container.querySelector("pre#prompt-text");
    expect(pre).not.toBeNull();
    expect(pre?.textContent).toBe(golden.promptText);

    const marks = container.querySelectorAll("pre#prompt-text mark");
    expect(marks).toHaveLength(countToken(golden.promptText, TOKEN));
    for (const mark of marks) expect(mark.textContent).toBe(TOKEN);
  });

  it("gives the scrollable prompt <pre> keyboard access and a name", () => {
    const { container } = renderGolden();
    const pre = container.querySelector("pre#prompt-text");
    // Same axe `scrollable-region-focusable` contract as the card `<pre>`.
    expect(pre).toHaveAttribute("tabindex", "0");
    expect(pre).toHaveAttribute("role", "group");
    expect(pre).toHaveAttribute("aria-label", "提示词原文");
  });

  it("explains what the variable drives, below the payload", () => {
    renderGolden();
    const occurrences = countToken(golden.promptText, TOKEN);
    expect(
      screen.getByText(
        `${TOKEN} 同时驱动全文 ${occurrences} 处描述 —— 换一个取值即可得到一整套自洽的新画面。`,
      ),
    ).toBeInTheDocument();
  });

  it("keeps the generator CTA as text with a disabled button, never a fake link", () => {
    renderGolden();
    const card = screen.getByRole("complementary", { name: "用这条提示词生成" });
    expect(within(card).getByText("在 bo 中选择 GPT Image 2，粘贴提示词并替换国家名。"))
      .toBeInTheDocument();
    const cta = within(card).getByRole("button", { name: /去 bo 生成/ });
    expect(cta).toHaveAttribute("aria-disabled", "true");
    expect(within(card).getByText("生成功能尚未接入")).toBeInTheDocument();
    expect(within(card).queryByRole("link")).not.toBeInTheDocument();
  });

  it("renders all four use steps, numbered 01–04, in an ordered list", () => {
    renderGolden();
    const section = screen.getByRole("region", { name: "使用步骤" });
    const list = within(section).getByRole("list");
    expect(list.tagName).toBe("OL");
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(golden.steps.length);
    expect(golden.steps).toHaveLength(4);
    expect(items.map((item) => item.textContent?.slice(0, 2))).toEqual(["01", "02", "03", "04"]);
  });

  it("never shows a replacement count that disagrees with the counted one", () => {
    renderGolden();
    const occurrences = countToken(golden.promptText, TOKEN);
    const steps = screen.getByRole("region", { name: "使用步骤" });
    const bodies = within(steps)
      .getAllByRole("listitem")
      .map((item) => item.textContent ?? "");
    for (const body of bodies) {
      for (const [, number] of body.matchAll(/(\d+)\s*处/g)) {
        expect(Number(number)).toBe(occurrences);
      }
    }
    // The fixture literally says "7 处"; it must agree with the count, and the
    // formatter must be what produces the rendered number.
    const replaceStep = golden.steps.find((step) => step.title.includes(TOKEN));
    expect(replaceStep).toBeDefined();
    expect(formatStepBody(replaceStep?.title ?? "", "9 处全部替换", golden.promptText)).toContain(
      `${occurrences} 处`,
    );
  });

  it("gives the country picker its own section after the steps", () => {
    renderGolden();
    const occurrences = countToken(golden.promptText, TOKEN);
    const section = screen.getByRole("region", { name: "换个国家试试" });
    expect(
      within(section).getByText(
        `选择国家后点击复制，提示词中 ${occurrences} 处 ${TOKEN} 将自动替换。`,
      ),
    ).toBeInTheDocument();

    const group = within(section).getByRole("radiogroup", { name: /国家/ });
    const radios = within(group).getAllByRole("radio");
    expect(radios.map((radio) => radio.textContent)).toEqual(golden.variables[0]?.options);

    const note = within(section).getByText(/当前选择：/);
    expect(note).toHaveAttribute("role", "status");
    expect(note).toHaveAttribute("aria-live", "polite");
    expect(note).toHaveTextContent(
      `当前选择：${golden.variables[0]?.defaultValue} —— 复制时自动替换。`,
    );
  });

  it("lists the pending variations with the lower-cased variable assignment", () => {
    renderGolden();
    const section = screen.getByRole("region", { name: "同系列" });
    expect(within(section).getByText("同一提示词换不同国家的效果方向。")).toBeInTheDocument();
    expect(within(section).getAllByRole("listitem")).toHaveLength(golden.variations.length);
    expect(within(section).getAllByText("待生成").length).toBe(golden.variations.length);
    expect(variationVariableName(TOKEN)).toBe("country");
    expect(within(section).getByText("country = Japan")).toBeInTheDocument();
  });

  it("keeps the source attribution and the metrics side by side under 来源", () => {
    renderGolden();
    const section = screen.getByRole("region", { name: "来源" });

    const info = within(section).getByRole("heading", { level: 3, name: "原帖信息" });
    expect(info).toBeInTheDocument();
    const post = within(section).getByRole("link", { name: /查看原帖/ });
    expect(post).toHaveAttribute("href", golden.source.url);
    expect(post).toHaveAttribute("rel", expect.stringContaining("noopener"));
    expect(post).toHaveAttribute("rel", expect.stringContaining("nofollow"));
    expect(
      within(section).getByText("提示词由作者在原帖中公开分享，本页逐字保留。"),
    ).toBeInTheDocument();
    expect(
      within(section).getByRole("link", { name: formatCreatorHandle(golden.source.handle) }),
    ).toBeInTheDocument();
    expect(section.textContent).not.toContain("@@");

    expect(within(section).getByRole("heading", { level: 3, name: "互动数据" })).toBeInTheDocument();
    for (const label of ["浏览", "点赞", "收藏", "转发", "评论", "引用"]) {
      expect(within(section).getByText(label)).toBeInTheDocument();
    }
    expect(
      within(section).getByText(new RegExp(`观测于\\s*${golden.metrics.observedAt}`)),
    ).toBeInTheDocument();
  });

  it("keeps the required inputs and the baked-in parameters in one 输入 / 参数 block", () => {
    renderGolden();
    const section = screen.getByRole("region", { name: "输入 / 参数" });
    for (const input of golden.requiredInputs) {
      expect(within(section).getByText(input)).toBeInTheDocument();
    }
    for (const parameter of golden.parameters) {
      expect(within(section).getByText(parameter.value)).toBeInTheDocument();
    }
  });

  it("gives 相关 the prototype's three collection columns, never single prompts", () => {
    const { container } = renderGolden();
    const section = screen.getByRole("region", { name: "相关" });
    expect(
      within(section)
        .getAllByRole("heading", { level: 3 })
        .map((node) => node.textContent),
    ).toEqual(["同模型", "同用途", "同创作者"]);

    expect(within(section).getByRole("link", { name: "GPT Image 2 全部提示词" })).toHaveAttribute(
      "href",
      "/zh-CN/prompts/models/gpt-image-2",
    );
    expect(within(section).getByRole("link", { name: "Higgsfield 平台提示词" })).toHaveAttribute(
      "href",
      "/zh-CN/prompts",
    );
    expect(within(section).getByRole("link", { name: "微缩摄影" })).toHaveAttribute(
      "href",
      "/zh-CN/prompts?technique=miniature-photography",
    );
    expect(
      within(section).getByRole("link", { name: `${formatCreatorHandle(golden.source.handle)} 的主页` }),
    ).toHaveAttribute("href", golden.creator.url);
    expect(within(section).getByRole("link", { name: "该作者其他提示词" })).toHaveAttribute(
      "href",
      `/zh-CN/prompts?q=${encodeURIComponent(golden.source.handle)}`,
    );
    expect(container.querySelectorAll('a[href="#"]')).toHaveLength(0);
  });

  it("links the model chip to its model page and the other axes to a filtered L1", () => {
    renderGolden();
    // The breadcrumb links the same model page, so every "GPT Image 2" link on
    // the page must point at it — no drift between the trail and the chip.
    const modelLinks = screen.getAllByRole("link", { name: "GPT Image 2" });
    expect(modelLinks.length).toBeGreaterThan(0);
    for (const link of modelLinks) {
      expect(link).toHaveAttribute("href", "/zh-CN/prompts/models/gpt-image-2");
    }
    const [style] = golden.styles;
    if (style === undefined) throw new Error("the golden record must carry a style term");
    expect(screen.getByRole("link", { name: style.labelZh ?? style.label })).toHaveAttribute(
      "href",
      `/zh-CN/prompts?style=${style.slug}`,
    );
  });

  it("shows every source-post image with the prototype's 图片 N/M badge", () => {
    renderGolden();
    for (const item of golden.media) {
      expect(screen.getByText(item.label ?? "")).toBeInTheDocument();
      expect(screen.getByAltText(item.alt)).toBeInTheDocument();
    }
  });

  it("pins a bottom bar carrying the title, model · creator and both actions", () => {
    renderGolden();
    const bar = screen.getByRole("complementary", { name: /快捷操作/ });
    expect(within(bar).getByText(golden.title)).toBeInTheDocument();
    expect(
      within(bar).getByText(`GPT Image 2 · ${formatCreatorHandle(golden.source.handle)}`),
    ).toBeInTheDocument();
    expect(within(bar).getByRole("link", { name: /查看原帖/ })).toHaveAttribute(
      "href",
      golden.source.url,
    );
    expect(within(bar).getByRole("button", { name: /复制提示词/ })).toBeInTheDocument();
  });

  it("starts the breadcrumb trail at 首页 and passes through the model page", () => {
    expect(
      buildBreadcrumbTrail({ page: "promptDetail", locale: "zh-CN", prompt: golden }),
    ).toEqual([
      { name: "首页", path: "/zh-CN/prompts" },
      { name: "GPT Image 2", path: "/zh-CN/prompts/models/gpt-image-2" },
      { name: golden.title, path: "/zh-CN/prompts/country-miniature-stamp-poster" },
    ]);
  });
});

describe("PromptDetailView — prompt without variables", () => {
  it("hides the variable-driven blocks instead of showing empty headings", () => {
    renderDetail(plain);
    expect(screen.queryByRole("region", { name: /换个/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "使用步骤" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "同系列" })).not.toBeInTheDocument();
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
    // The template itself is unchanged: prompt, source and related still render.
    expect(screen.getByRole("region", { name: "提示词" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "来源" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "相关" })).toBeInTheDocument();
  });

  it("labels the prompt language without a variable count", () => {
    renderDetail(plain);
    expect(screen.getByText("英文")).toBeInTheDocument();
    expect(screen.queryByText(/处变量/)).not.toBeInTheDocument();
  });

  it("still offers a copy button for the full prompt text", () => {
    renderDetail(plain);
    expect(screen.getAllByRole("button", { name: /复制提示词/ }).length).toBeGreaterThan(0);
  });

  it("renders — rather than 0 for metrics the snapshot does not have", () => {
    renderDetail({ ...plain, metrics: { ...plain.metrics, views: null, quotes: null } });
    const section = screen.getByRole("region", { name: "来源" });
    expect(within(section).getAllByText("—").length).toBeGreaterThanOrEqual(2);
    expect(within(section).getAllByText("未收录").length).toBeGreaterThanOrEqual(2);
  });
});

describe("PromptDetailView — reference-image tokens (@img1)", () => {
  it("never counts a reference-image token as a substitutable variable", () => {
    renderDetail(referenceOnly);
    // `@img1` occurs in the text, but it isn't something you type a value
    // into, so it must never inflate the "N 处变量" count — the label stays
    // plain.
    expect(screen.getByText("英文")).toBeInTheDocument();
    expect(screen.queryByText(/处变量/)).not.toBeInTheDocument();
  });

  it("tells the reader to attach a reference photo instead of offering to self-replace it", () => {
    renderDetail(referenceOnly);
    expect(screen.getByText(/需附上参考图：@img1/)).toBeInTheDocument();
    expect(screen.queryByText(/复制后请自行替换/)).not.toBeInTheDocument();
    // No radiogroup: there is nothing to pick a text value for.
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
    // Still copyable — the reference note doesn't replace the copy button.
    expect(screen.getAllByRole("button", { name: /复制提示词/ }).length).toBeGreaterThan(0);
  });
});

describe("formatStepBody", () => {
  it("rewrites the occurrence count in '7 处全部替换' but leaves '处理'/'处于' untouched", () => {
    const promptText = `${TOKEN} appears once here.`;

    expect(formatStepBody("", "分 2 处理颜色，无需替换。", promptText)).toBe(
      "分 2 处理颜色，无需替换。",
    );
    expect(formatStepBody("", "已处于待命状态，3 处理论上可省略。", promptText)).toBe(
      "已处于待命状态，3 处理论上可省略。",
    );
    expect(formatStepBody("", "9 处全部替换为同一国家名。", promptText)).toBe(
      "1 处全部替换为同一国家名。",
    );
  });
});
