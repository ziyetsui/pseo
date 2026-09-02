import { render, screen, within } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";

import { PromptDetailView } from "@/features/prompt-detail/PromptDetailView";
import { promptBreadcrumbs } from "@/features/prompt-detail/breadcrumbs";
import { formatStepBody } from "@/features/prompt-detail/variable-view";
import {
  countToken,
  extractVariables,
  getContentRepository,
  type PromptDetail,
  type RelatedGroups,
} from "@/lib/content";

const GOLDEN_SLUG = "country-miniature-stamp-poster";
const TOKEN = "[COUNTRY]";
// Its `promptText` contains only `@img1` (a reference-image placeholder), no
// `[BRACKET]`-style substitutable token, and its curated `variables` is empty.
const REFERENCE_ONLY_SLUG = "scene-a-seamless-ultra-cinematic-one-take-sh-2071174186978951379";

const repository = getContentRepository();

let golden: PromptDetail;
let goldenRelated: RelatedGroups;
let plain: PromptDetail;
let plainRelated: RelatedGroups;
let referenceOnly: PromptDetail;
let referenceOnlyRelated: RelatedGroups;

beforeAll(async () => {
  const detail = await repository.getPromptBySlug("zh-CN", GOLDEN_SLUG);
  if (detail === null) throw new Error(`fixture is missing the golden record ${GOLDEN_SLUG}`);
  golden = detail;
  goldenRelated = await repository.getRelated("zh-CN", golden.id);

  // A prompt whose text carries no variable tokens at all — the same template
  // has to render it without inventing empty sections.
  const { items } = await repository.listPrompts("zh-CN");
  for (const item of items) {
    if (extractVariables(item.promptText).length > 0) continue;
    const candidate = await repository.getPromptBySlug("zh-CN", item.slug);
    if (candidate === null || candidate.variables.length > 0 || candidate.steps.length > 0) continue;
    plain = candidate;
    plainRelated = await repository.getRelated("zh-CN", candidate.id);
    break;
  }
  if (plain === undefined) throw new Error("fixture has no prompt without variables");

  const referenceDetail = await repository.getPromptBySlug("zh-CN", REFERENCE_ONLY_SLUG);
  if (referenceDetail === null) {
    throw new Error(`fixture is missing the reference-image record ${REFERENCE_ONLY_SLUG}`);
  }
  referenceOnly = referenceDetail;
  referenceOnlyRelated = await repository.getRelated("zh-CN", referenceOnly.id);
});

function renderGolden() {
  return render(
    <PromptDetailView
      prompt={golden}
      locale="zh-CN"
      related={goldenRelated}
      breadcrumbs={promptBreadcrumbs("zh-CN", golden)}
    />,
  );
}

describe("PromptDetailView — golden record", () => {
  it("renders the title as the page's only H1 and the editorial summary", () => {
    renderGolden();
    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent(golden.title);
    expect(screen.getByText(golden.summary ?? "")).toBeInTheDocument();
  });

  it("labels the prompt language with the counted variable total, not a literal", () => {
    renderGolden();
    const occurrences = countToken(golden.promptText, TOKEN);
    expect(occurrences).toBeGreaterThan(0);
    expect(screen.getByText(`英文 · ${occurrences} 处变量`)).toBeInTheDocument();
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

  it("renders all four use steps in an ordered list", () => {
    renderGolden();
    const section = screen.getByRole("region", { name: "使用步骤" });
    const list = within(section).getByRole("list");
    expect(list.tagName).toBe("OL");
    expect(within(list).getAllByRole("listitem")).toHaveLength(golden.steps.length);
    expect(golden.steps).toHaveLength(4);
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
    expect(
      formatStepBody(replaceStep?.title ?? "", "9 处全部替换", golden.promptText),
    ).toContain(`${occurrences} 处`);
  });

  it("shows every interaction metric with the snapshot date it was observed on", () => {
    renderGolden();
    const section = screen.getByRole("region", { name: "互动数据" });
    expect(within(section).getByText(new RegExp(`观测于\\s*${golden.metrics.observedAt}`)))
      .toBeInTheDocument();
    for (const label of ["浏览", "点赞", "收藏", "转发", "评论", "引用"]) {
      expect(within(section).getByText(label)).toBeInTheDocument();
    }
  });

  it("keeps the source attribution: creator, platform, date and the original post", () => {
    renderGolden();
    const section = screen.getByRole("region", { name: "来源" });
    const post = within(section).getByRole("link", { name: /原帖/ });
    expect(post).toHaveAttribute("href", golden.source.url);
    expect(post).toHaveAttribute("rel", expect.stringContaining("noopener"));
    expect(post).toHaveAttribute("rel", expect.stringContaining("nofollow"));
    expect(within(section).getByText(/逐字保留/)).toBeInTheDocument();
  });

  it("links the model chip to its model page and the other axes to a filtered L1", () => {
    renderGolden();
    // The breadcrumb links the same model page, so every "GPT Image 2" link on
    // the page must point at it — no drift between the trail and the chip.
    const modelLinks = screen.getAllByRole("link", { name: /GPT Image 2/ });
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

  it("lists the pending variations without pretending they exist", () => {
    renderGolden();
    const section = screen.getByRole("region", { name: "同系列" });
    expect(within(section).getAllByRole("listitem")).toHaveLength(golden.variations.length);
    expect(within(section).getAllByText("待生成").length).toBe(golden.variations.length);
  });

  it("links every related prompt to a real detail route, never to a placeholder", () => {
    const { container } = renderGolden();
    const section = screen.getByRole("region", { name: "相关" });
    const links = within(section).getAllByRole("link");
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link.getAttribute("href")).toMatch(/^\/zh-CN\/prompts\//);
    }
    expect(container.querySelectorAll('a[href="#"]')).toHaveLength(0);
  });

  it("puts the model page in the breadcrumb trail", () => {
    expect(promptBreadcrumbs("zh-CN", golden).map((item) => item.path)).toEqual([
      "/zh-CN/prompts",
      "/zh-CN/prompts/models/gpt-image-2",
      "/zh-CN/prompts/country-miniature-stamp-poster",
    ]);
  });
});

describe("PromptDetailView — prompt without variables", () => {
  function renderPlain() {
    return render(
      <PromptDetailView
        prompt={plain}
        locale="zh-CN"
        related={plainRelated}
        breadcrumbs={promptBreadcrumbs("zh-CN", plain)}
      />,
    );
  }

  it("hides the variable, step and variation sections instead of showing empty headings", () => {
    renderPlain();
    expect(screen.queryByRole("region", { name: "变量选择" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "使用步骤" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "同系列" })).not.toBeInTheDocument();
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
  });

  it("labels the prompt language without a variable count", () => {
    renderPlain();
    expect(screen.getByText("英文")).toBeInTheDocument();
    expect(screen.queryByText(/处变量/)).not.toBeInTheDocument();
  });

  it("still offers a copy button for the full prompt text", () => {
    renderPlain();
    expect(screen.getAllByRole("button", { name: /复制提示词/ }).length).toBeGreaterThan(0);
  });

  it("renders 未收录 rather than 0 for metrics the snapshot does not have", () => {
    const withNulls: PromptDetail = {
      ...plain,
      metrics: { ...plain.metrics, views: null, quotes: null },
    };
    render(
      <PromptDetailView
        prompt={withNulls}
        locale="zh-CN"
        related={plainRelated}
        breadcrumbs={promptBreadcrumbs("zh-CN", withNulls)}
      />,
    );
    const section = screen.getByRole("region", { name: "互动数据" });
    expect(within(section).getAllByText("—").length).toBeGreaterThanOrEqual(2);
    expect(within(section).getAllByText("未收录").length).toBeGreaterThanOrEqual(2);
  });
});

describe("PromptDetailView — reference-image tokens (@img1)", () => {
  function renderReferenceOnly() {
    return render(
      <PromptDetailView
        prompt={referenceOnly}
        locale="zh-CN"
        related={referenceOnlyRelated}
        breadcrumbs={promptBreadcrumbs("zh-CN", referenceOnly)}
      />,
    );
  }

  it("never counts a reference-image token as a substitutable variable", () => {
    renderReferenceOnly();
    // `@img1` occurs in the text, but it isn't something you type a value
    // into, so it must never inflate the "N 处变量" count — the label stays
    // plain.
    expect(screen.getByText("英文")).toBeInTheDocument();
    expect(screen.queryByText(/处变量/)).not.toBeInTheDocument();
  });

  it("tells the reader to attach a reference photo instead of offering to self-replace it", () => {
    renderReferenceOnly();
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
