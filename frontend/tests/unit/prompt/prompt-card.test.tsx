import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PromptCard, compactMediaLabel } from "@/features/prompt/PromptCard";

import {
  OBSERVED_AT,
  makeCreator,
  makeMedia,
  makeMetrics,
  makePromptSummary,
  makeSource,
  makeTaxonomy,
} from "../support/prompt-fixtures";

const cinematic = makeTaxonomy({
  id: "style:cinematic",
  axis: "style",
  slug: "cinematic",
  label: "Cinematic",
  labelZh: "电影感",
});
const cameraMove = makeTaxonomy({
  id: "technique:camera-movement",
  axis: "technique",
  slug: "camera-movement",
  label: "Camera movement / shot language",
  labelZh: "镜头运动",
});

function fullPrompt(overrides = {}) {
  return makePromptSummary({ techniques: [cameraMove], styles: [cinematic], ...overrides });
}

describe("PromptCard — shared behaviour", () => {
  it.each(["hub", "compact"] as const)("links the title to the real detail route (%s)", (variant) => {
    render(<PromptCard prompt={makePromptSummary()} locale="zh-CN" variant={variant} />);
    const heading = screen.getByRole("heading", { level: 3 });
    expect(within(heading).getByRole("link")).toHaveAttribute(
      "href",
      "/zh-CN/prompts/glass-cube-city",
    );
  });

  it.each(["hub", "compact"] as const)(
    "keeps the FULL prompt text (not the truncated preview) in the server HTML (%s)",
    (variant) => {
      const prompt = makePromptSummary();
      const { container } = render(
        <PromptCard prompt={prompt} locale="zh-CN" variant={variant} />,
      );
      const pre = container.querySelector("pre");
      expect(pre).not.toBeNull();
      expect(prompt.promptText).not.toEqual(prompt.promptPreview);
      expect(pre).toHaveTextContent(prompt.promptText);
      expect(pre?.id.length).toBeGreaterThan(0);
    },
  );

  it.each(["hub", "compact"] as const)(
    "offers exactly one 展开 toggle, in the action row (%s)",
    (variant) => {
      render(<PromptCard prompt={makePromptSummary()} locale="zh-CN" variant={variant} />);
      const toggles = screen.getAllByRole("button", { name: "展开" });
      expect(toggles).toHaveLength(1);
      expect(toggles[0]).toHaveAttribute("aria-expanded", "false");
    },
  );

  it.each(["hub", "compact"] as const)("switches the toggle to 收起 when opened (%s)", async (variant) => {
    render(<PromptCard prompt={makePromptSummary()} locale="zh-CN" variant={variant} />);
    await userEvent.click(screen.getByRole("button", { name: "展开" }));
    expect(screen.getByRole("button", { name: "收起" })).toHaveAttribute("aria-expanded", "true");
  });

  it.each(["hub", "compact"] as const)("renders no media block when the prompt has none (%s)", (variant) => {
    render(<PromptCard prompt={makePromptSummary({ media: [] })} locale="zh-CN" variant={variant} />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it.each(["hub", "compact"] as const)(
    "keeps the observation date in the DOM without a visible per-card line (%s)",
    (variant) => {
      const { container } = render(
        <PromptCard
          prompt={makePromptSummary({ metrics: makeMetrics({ observedAt: "2027-01-02" }) })}
          locale="zh-CN"
          variant={variant}
        />,
      );
      const metrics = screen.getByTestId("prompt-card-metrics");
      expect(metrics).toHaveAttribute("title", "指标观测于 2027-01-02");
      // Present for honesty, but only for assistive tech — never a visible row.
      const note = [...container.querySelectorAll(".sr-only")].find((node) =>
        (node.textContent ?? "").includes("指标观测于"),
      );
      expect(note).toBeDefined();
      expect(container.textContent).not.toContain(OBSERVED_AT);
    },
  );

  it("carries no excerpt on either variant — the prototype card has none", () => {
    const prompt = makePromptSummary();
    for (const variant of ["hub", "compact"] as const) {
      const { container, unmount } = render(
        <PromptCard prompt={prompt} locale="zh-CN" variant={variant} />,
      );
      expect(container.textContent).not.toContain(prompt.excerpt);
      unmount();
    }
  });

  it("lets a page override the <pre> id prefix so two renders of the same prompt don't collide", () => {
    const prompt = makePromptSummary();
    const { container } = render(
      <PromptCard prompt={prompt} locale="zh-CN" idPrefix="featured-prompt-text" />,
    );
    expect(container.querySelector("pre")?.id).toBe(`featured-prompt-text-${prompt.id}`);
  });
});

describe("PromptCard — hub variant (L1)", () => {
  it("chips the four browsable axes in English, and never the content type", () => {
    render(<PromptCard prompt={fullPrompt()} locale="zh-CN" />);

    expect(screen.getByRole("link", { name: /Seedance/ })).toHaveAttribute(
      "href",
      "/zh-CN/prompts/models/seedance",
    );
    expect(screen.getByRole("link", { name: /Poster/ })).toHaveAttribute(
      "href",
      "/zh-CN/prompts?useCase=poster",
    );
    expect(screen.getByRole("link", { name: /Cinematic/ })).toHaveAttribute(
      "href",
      "/zh-CN/prompts?style=cinematic",
    );
    expect(
      screen.getByRole("link", { name: /Camera movement \/ shot language/ }),
    ).toHaveAttribute("href", "/zh-CN/prompts?technique=camera-movement");
    // The card's own chips never include 图片 / Image — that is the media badge.
    expect(screen.queryByRole("link", { name: /^图片/ })).not.toBeInTheDocument();
  });

  it("uses the media badge exactly as the source record recorded it", () => {
    render(
      <PromptCard
        prompt={makePromptSummary({ media: [makeMedia({ label: "视频 14s" })] })}
        locale="zh-CN"
      />,
    );
    expect(screen.getByText("视频 14s")).toBeInTheDocument();
  });

  it("writes the meta line as @handle · date · N 赞 · N 藏 with thousands separators", () => {
    render(
      <PromptCard
        prompt={makePromptSummary({ metrics: makeMetrics({ likes: 2512, bookmarks: 6127 }) })}
        locale="zh-CN"
      />,
    );
    const metrics = screen.getByTestId("prompt-card-metrics");
    expect(metrics).toHaveTextContent("2,512 赞");
    expect(metrics).toHaveTextContent("6,127 藏");
    expect(within(metrics).getByRole("link", { name: /@azed_ai/ })).toHaveAttribute(
      "href",
      "https://x.com/azed_ai",
    );
    expect(within(metrics).getByText("2026-08-11")).toBeInTheDocument();
  });

  it("renders missing metrics as — instead of 0", () => {
    render(
      <PromptCard
        prompt={makePromptSummary({ metrics: makeMetrics({ likes: null, bookmarks: null }) })}
        locale="zh-CN"
      />,
    );
    const metrics = screen.getByTestId("prompt-card-metrics");
    expect(metrics).toHaveTextContent("— 赞");
    expect(metrics).toHaveTextContent("— 藏");
    expect(metrics).not.toHaveTextContent("0 赞");
    expect(metrics).not.toHaveTextContent("0 藏");
  });

  it("states when the publish date is not recorded", () => {
    render(
      <PromptCard
        prompt={makePromptSummary({ source: makeSource({ publishedAt: null }) })}
        locale="zh-CN"
      />,
    );
    expect(screen.getByText("日期未收录")).toBeInTheDocument();
  });

  it.each(["azed_ai", "@azed_ai"])("renders %s with exactly one leading @", (handle) => {
    const { container } = render(
      <PromptCard prompt={makePromptSummary({ creator: makeCreator({ handle }) })} locale="zh-CN" />,
    );
    expect(screen.getByRole("link", { name: /@azed_ai/ })).toBeInTheDocument();
    expect(container.textContent).not.toContain("@@azed_ai");
  });

  it("acts with 复制提示词 · 展开 · 原帖 ↗ and no 详情 link", () => {
    render(<PromptCard prompt={makePromptSummary()} locale="zh-CN" />);

    expect(screen.getByRole("button", { name: "复制提示词" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "展开" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /原帖/ })).toHaveAttribute(
      "href",
      "https://x.com/azed_ai/status/1",
    );
    expect(screen.queryByRole("link", { name: /详情/ })).not.toBeInTheDocument();
  });

  it("copies the full promptText and announces 已复制 ✓", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
      writable: true,
    });

    const prompt = makePromptSummary();
    render(<PromptCard prompt={prompt} locale="zh-CN" />);
    await userEvent.click(screen.getByRole("button", { name: "复制提示词" }));

    expect(writeText).toHaveBeenCalledWith(prompt.promptText);
    expect(screen.getByRole("status").textContent).toBe("已复制 ✓");

    Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
  });
});

describe("PromptCard — compact variant (L2/L3)", () => {
  it.each([
    [makeMedia({ kind: "image", total: 1 }), "PHOTO"],
    [makeMedia({ kind: "image", total: 2 }), "PHOTO · ×2"],
    [makeMedia({ kind: "image", total: 4 }), "PHOTO · ×4"],
    [makeMedia({ kind: "video", total: 1, durationSeconds: 14 }), "VIDEO · 14s"],
    [makeMedia({ kind: "video", total: 3, durationSeconds: null }), "VIDEO · ×3"],
    [makeMedia({ kind: "video", total: 1, durationSeconds: null }), "VIDEO"],
  ])("derives the badge from kind + count, ignoring the L1 Chinese label", (media, expected) => {
    expect(compactMediaLabel(media)).toBe(expected);
    render(
      <PromptCard
        prompt={makePromptSummary({ media: [{ ...media, label: "图片 ×2" }] })}
        locale="zh-CN"
        variant="compact"
      />,
    );
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it("tags with model + style only, as plain text rather than filter links", () => {
    const { container } = render(
      <PromptCard prompt={fullPrompt()} locale="zh-CN" variant="compact" />,
    );
    expect(container.textContent).toContain("Seedance");
    expect(container.textContent).toContain("Cinematic");
    expect(container.textContent).not.toContain("Camera movement");
    expect(container.textContent).not.toContain("Poster");
    expect(screen.queryByRole("link", { name: /Cinematic/ })).not.toBeInTheDocument();
  });

  it("writes the meta line with K-formatted counts and the source link", () => {
    render(
      <PromptCard
        prompt={makePromptSummary({ metrics: makeMetrics({ likes: 3849, bookmarks: 2449 }) })}
        locale="zh-CN"
        variant="compact"
      />,
    );
    const metrics = screen.getByTestId("prompt-card-metrics");
    expect(metrics).toHaveTextContent("3.8K 赞");
    expect(metrics).toHaveTextContent("2.4K 藏");
    expect(within(metrics).getByRole("link", { name: /原帖/ })).toHaveAttribute(
      "href",
      "https://x.com/azed_ai/status/1",
    );
    // No date on the compact card, and no separator eaten by a null metric.
    expect(metrics).not.toHaveTextContent("2026-08-11");
  });

  it("renders missing metrics as — instead of 0", () => {
    render(
      <PromptCard
        prompt={makePromptSummary({ metrics: makeMetrics({ likes: null, bookmarks: null }) })}
        locale="zh-CN"
        variant="compact"
      />,
    );
    const metrics = screen.getByTestId("prompt-card-metrics");
    expect(metrics).toHaveTextContent("— 赞");
    expect(metrics).toHaveTextContent("— 藏");
    expect(metrics).not.toHaveTextContent("0 赞");
    expect(metrics).not.toHaveTextContent("0 藏");
  });

  it("shows the 热门 badge only for a high-value prompt", () => {
    const { rerender } = render(
      <PromptCard
        prompt={makePromptSummary({ metrics: makeMetrics({ highValue: true }) })}
        locale="zh-CN"
        variant="compact"
      />,
    );
    expect(screen.getByText("热门")).toBeInTheDocument();

    rerender(
      <PromptCard
        prompt={makePromptSummary({ metrics: makeMetrics({ highValue: false }) })}
        locale="zh-CN"
        variant="compact"
      />,
    );
    expect(screen.queryByText("热门")).not.toBeInTheDocument();
  });

  it("acts with 复制 · 展开 · 详情 → and announces 已复制", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
      writable: true,
    });

    const prompt = makePromptSummary();
    render(<PromptCard prompt={prompt} locale="zh-CN" variant="compact" />);

    expect(screen.getByRole("link", { name: "详情 →" })).toHaveAttribute("href", prompt.href);
    await userEvent.click(screen.getByRole("button", { name: "复制" }));

    expect(writeText).toHaveBeenCalledWith(prompt.promptText);
    expect(screen.getByRole("status").textContent).toBe("已复制");

    Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
  });
});
