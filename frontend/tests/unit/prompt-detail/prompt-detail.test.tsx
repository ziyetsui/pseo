import { render, screen, within } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";

import { PromptDetailView } from "@/features/prompt-detail/PromptDetailView";
import { formatStepBody } from "@/features/prompt-detail/variable-view";
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

  it("puts the kicker chips in one row before the H1, without the 「Prompt」 pill", () => {
    const { container } = renderGolden();
    const heading = screen.getAllByRole("heading", { level: 1 })[0];
    const kicker = heading?.previousElementSibling;
    expect(kicker).not.toBeNull();
    const chipText = Array.from(kicker?.children ?? []).map((node) =>
      (node.textContent ?? "").trim(),
    );
    // model · platform · technique · style. The prototype's solid `Prompt`
    // pill is gone: it was the highest-contrast object above the H1 and every
    // page in this library is a prompt, so it carried no information about
    // this record. `超写实` is the Chinese ALIAS the L4 prototype uses for
    // `Photorealistic`, whose canonical `labelZh` (`写实风`) is what the L1
    // footer column writes.
    expect(chipText).toEqual(["GPT Image 2", "Higgsfield", "微缩摄影", "超写实"]);
    expect(chipText).not.toContain("Prompt");
    expect(container.querySelectorAll('a[href="#"]')).toHaveLength(0);
  });

  it("keeps the prototype's section order", () => {
    renderGolden();
    const headings = screen.getAllByRole("heading", { level: 2 }).map((node) => node.textContent);
    expect(headings).toEqual([
      "提示词",
      "使用步骤",
      "换个国家试试",
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

  it("suppresses the inline payload copy button below md, where the bar covers it", () => {
    renderGolden();
    const bar = screen.getByText(/^英文 · \d+ 处变量$/).parentElement as HTMLElement;
    const inline = within(bar).getByRole("button", { name: /复制提示词/ });
    // Two identical red 复制提示词 buttons used to sit 185px apart in one
    // mobile viewport — this one and `StickyCopyBar`'s. `display: none` below
    // `md` (not `invisible`, not `opacity-0`) keeps it out of the tab order
    // and out of the accessibility tree at the widths where the bar is the
    // action, and hands it back from `md` up where the bar is far away.
    const gate = inline.closest("span.hidden") as HTMLElement | null;
    expect(gate).not.toBeNull();
    expect((gate as HTMLElement).className).toContain("md:inline-flex");
  });

  it("keeps a copy action on screen at every width, both wired to the same text", () => {
    renderGolden();
    const bar = screen.getByRole("complementary", { name: /快捷操作/ });
    // The sticky bar is no longer `md:hidden`, so the ~2,650px of desktop page
    // below the payload is no longer without a copy action.
    expect(bar.className).not.toContain("md:hidden");
    // Both buttons are fed by `PromptCopyProvider`, so the page can never
    // offer two disagreeing strings.
    expect(screen.getAllByRole("button", { name: /复制提示词/ })).toHaveLength(2);
  });

  it("draws one frame per thumbnail, not a doubled bottom edge", () => {
    const { container } = renderGolden();
    const items = container.querySelectorAll("header ul li");
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      // The `<li>` used to carry `border-2` around a `MediaFrame` that already
      // draws its own `border-b-2 md:border-b-4` compartment rule, so the
      // thumbnail wore a 6px bottom edge against 2px sides. The media owns the
      // frame now, and it is the same `card`-tier frame as the hero.
      expect(item.className).not.toMatch(/border/);
      const frame = item.firstElementChild as HTMLElement;
      expect(frame.className).toContain("border-2");
      expect(frame.className).toContain("md:border-4");
    }
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

  it("renders the prompt at full height — no cap, no nested scroll region", () => {
    const { container } = renderGolden();
    const pre = container.querySelector("pre#prompt-text") as HTMLElement;
    // The file's own prop doc promises "rendered in full, never truncated";
    // `max-h-96 overflow-auto` broke that promise 26 lines later, delivering
    // the one artifact the page exists for through a 384px letterbox with no
    // fade, no rule and no line count to say there was more.
    expect(pre.className).not.toMatch(/max-h-/);
    expect(pre.className).not.toMatch(/overflow-(auto|scroll|y-auto)/);
    // What IS bounded is the measure — and `ch` is exact because the block is
    // monospace.
    expect(pre.className).toContain("max-w-[85ch]");
    // Still a named region for assistive tech, but no longer a tab stop: the
    // `tabIndex` existed only for axe's `scrollable-region-focusable` rule,
    // and nothing here scrolls in either axis any more.
    expect(pre).not.toHaveAttribute("tabindex");
    expect(pre).toHaveAttribute("role", "group");
    expect(pre).toHaveAttribute("aria-label", "提示词原文");
  });

  it("prints the record's own variable note, verbatim, below the payload", () => {
    renderGolden();
    // The golden record carries the source page's sentence (`PromptVariable
    // .note`), which names what the variable actually drives rather than
    // repeating a generated "N 处描述" line every record would share.
    const note = golden.variables[0]?.note;
    expect(note).toBe(
      "[COUNTRY] 同时驱动地标、动植物、传统服饰、邮票文字、货币面额与邮戳城市 —— 换一个国家即可得到一整套自洽的新画面。",
    );
    expect(screen.getByText(note as string)).toBeInTheDocument();
  });

  it("falls back to a counted sentence for a record with no note", () => {
    const occurrences = countToken(golden.promptText, TOKEN);
    render(
      <PromptDetailView
        prompt={{
          ...golden,
          variables: golden.variables.map((variable) => ({ ...variable, note: null })),
        }}
        locale="zh-CN"
        breadcrumbs={buildBreadcrumbTrail({ page: "promptDetail", locale: "zh-CN", prompt: golden })}
      />,
    );
    expect(
      screen.getByText(
        `${TOKEN} 同时驱动全文 ${occurrences} 处描述 —— 换一个取值即可得到一整套自洽的新画面。`,
      ),
    ).toBeInTheDocument();
  });

  it("does not render the no-behaviour generator CTA at all", () => {
    renderGolden();
    // `frontend/CLAUDE.md` §6 lists 隐藏 FIRST among the two honest treatments
    // for a capability the app does not have. This one earns it: the button
    // did nothing, and its one explanatory sentence is already steps 01–03 of
    // 使用步骤 directly below — so hiding it costs no information and gives the
    // prompt back the third of the column the aside was spending.
    expect(screen.queryByRole("complementary", { name: "用这条提示词生成" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /去 bo 生成/ })).not.toBeInTheDocument();
    expect(screen.queryByText("生成功能尚未接入")).not.toBeInTheDocument();
    // The sentence it carried survives, verbatim, where it always also lived.
    const steps = screen.getByRole("region", { name: "使用步骤" });
    expect(within(steps).getByText(/GPT Image 2/)).toBeInTheDocument();
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

  it("renders no 同系列 grid, even for a record that carries variations", () => {
    const { container } = renderGolden();

    // The record still declares six variations; the page no longer advertises
    // them. Each card was a 待生成 badge over a country name, i.e. an image
    // that does not exist plus a value the country radio group above already
    // offers as a working control.
    expect(golden.variations.length).toBeGreaterThan(0);
    expect(screen.queryByRole("region", { name: "同系列" })).not.toBeInTheDocument();
    expect(screen.queryByText("待生成")).not.toBeInTheDocument();
    expect(container.textContent).not.toContain("country = Japan");
    // The radio group that does the same job for real is untouched.
    expect(screen.getByRole("radiogroup")).toBeInTheDocument();
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
    // The creator's own profile is off-site, so the hairline row carries the
    // same sr-only "（外部链接，新窗口打开）" notice every other external link
    // on the site does — the visible label is unchanged.
    expect(
      within(section).getByRole("link", {
        name: new RegExp(`^${formatCreatorHandle(golden.source.handle)} 的主页`),
      }),
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
    // The L4 chip prints the Chinese alias the prototype used (`超写实`).
    const styleLabel = style.aliases.find((alias) => /[\u4e00-\u9fff]/.test(alias)) ??
      style.labelZh ??
      style.label;
    expect(screen.getByRole("link", { name: styleLabel })).toHaveAttribute(
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

describe("PromptDetailView — the shared card-system tiers", () => {
  it("demotes 相关 from boxes to hairline rows with a hover-revealed chevron", () => {
    renderGolden();
    const section = screen.getByRole("region", { name: "相关" });
    const rows = within(section).getAllByRole("listitem");
    expect(rows.length).toBeGreaterThan(0);

    for (const row of rows) {
      const line = row.firstElementChild as HTMLElement;
      // Row tier — the lightest of the three — and never a card frame.
      expect(line.className).not.toContain("border-2 border-foreground ");
      expect(line.className).not.toContain("shadow-hard");
      // The 44px floor survives the demotion: a hairline row is visually
      // slight but must not be a slight target.
      expect(line.className).toContain("min-h-11");
    }

    // Every row except the last of its column carries the rule.
    const ruled = rows.filter((row) =>
      (row.firstElementChild?.className ?? "").includes("border-foreground/15"),
    );
    expect(ruled.length).toBe(rows.length - 3);

    const chevrons = section.querySelectorAll("[aria-hidden='true'].rotate-45");
    expect(chevrons.length).toBeGreaterThan(0);
    for (const chevron of chevrons) {
      // Transparent until hover OR focus — a chevron that only ever appears
      // under a mouse is information a keyboard never receives.
      expect(chevron.className).toContain("opacity-0");
      expect(chevron.className).toContain("group-hover:opacity-100");
      expect(chevron.className).toContain("group-focus-visible:opacity-100");
    }
  });

  it("keeps a 相关 group with no entries as its explanatory sentence, not an empty list", () => {
    renderDetail({ ...golden, useCases: [], subjects: [], techniques: [] });
    const section = screen.getByRole("region", { name: "相关" });
    expect(
      within(section).getByText("这条提示词还没有可归类的同类条目。"),
    ).toBeInTheDocument();
    expect(
      within(section)
        .getAllByRole("heading", { level: 3 })
        .map((node) => node.textContent),
    ).toEqual(["同模型", "同用途", "同创作者"]);
  });

  it("sets every block label in the shared micro-label tier", () => {
    renderGolden();
    for (const label of ["原帖信息", "互动数据", "必需输入", "参数", "同模型"]) {
      expect(screen.getByRole("heading", { level: 3, name: label }).className).toContain(
        "tracking-micro",
      );
    }
  });

  it("sets the interaction figures in the display tier and their captions in the micro tier", () => {
    renderGolden();
    const section = screen.getByRole("region", { name: "来源" });
    const caption = within(section).getByText("点赞");
    expect(caption.className).toContain("tracking-micro");
    const figure = caption.previousElementSibling as HTMLElement;
    // The FIGURE rung, not the poster-title rung: a standalone numeral, so it
    // takes `leading-none` (digits do not descend) and carries no line clamp.
    expect(figure.className).toContain("text-3xl");
    expect(figure.className).toContain("font-black");
    expect(figure.className).toContain("tabular-nums");
    expect(figure.className).not.toContain("line-clamp");
  });

  it("grows the underline on the byline link instead of painting a standing one", () => {
    renderGolden();
    const byline = screen.getAllByRole("link", {
      name: formatCreatorHandle(golden.source.handle),
    })[0] as HTMLElement;
    // Weight, not colour, is what marks it as a link at rest; the bar answers
    // focus as well as hover, and only `width` animates.
    expect(byline.className).toContain("font-bold");
    expect(byline.className).toContain("group");
    const bar = byline.querySelector("[aria-hidden='true']");
    expect(bar?.className).toContain("group-hover:w-full");
    expect(bar?.className).toContain("group-focus-visible:w-full");
  });
});
