import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { StickyCopyBar } from "@/features/prompt-detail/StickyCopyBar";

/**
 * The bar's own failure mode, which no crawl and no Playwright assertion on a
 * freshly loaded page can reach.
 *
 * `CopyPromptButton`'s status region is empty until the reader clicks, and its
 * longest string by far is the FAILURE message — 复制失败，可选中文本手动复制,
 * around 168px at `text-xs`. It shipped inside a `shrink-0` group, so at 320
 * and 375 the first failed copy pushed the whole L4 page into horizontal
 * overflow: a state that violates the 320–1440 no-horizontal-overflow rule and
 * that was invisible to every automated check the project runs.
 *
 * jsdom has no layout, so these tests do not measure pixels. They assert the
 * STRUCTURE that makes overflow impossible regardless of the string, which is
 * the property that actually has to hold: nothing in the bar may refuse to
 * shrink, every flex level may wrap, and no text in it is held on one line
 * except the two lines that are explicitly truncated.
 */

const INFO = {
  // Deliberately far longer than any fixture title: the bar must survive
  // whatever the record hands it.
  title: "国家主题微缩邮票海报 —— 破框立体效果，七处变量全文联动的完整提示词",
  meta: "GPT Image 2 · @Naiknelofar788",
  sourceUrl: "https://x.com/Naiknelofar788/status/1",
};

const FAILURE_MESSAGE = "复制失败，可选中文本手动复制";
const SUCCESS_LABEL = "已复制 ✓";
const COPY_TEXT = "A miniature stamp poster of France, bursting out of its frame.";

function setClipboard(value: unknown): void {
  Object.defineProperty(navigator, "clipboard", { value, configurable: true, writable: true });
}

/** Utilities that stop a flex item shrinking or a string wrapping. */
const RIGID = [
  "shrink-0",
  "flex-none",
  "flex-shrink-0",
  "whitespace-nowrap",
  "w-max",
  "min-w-max",
  "text-nowrap",
];

function renderBar() {
  return render(<StickyCopyBar {...INFO} copyText={COPY_TEXT} targetId="copy-target" />);
}

/** Every element from `node` up to and including the bar's `<aside>`. */
function chainToBar(node: HTMLElement): HTMLElement[] {
  const chain: HTMLElement[] = [];
  let current: HTMLElement | null = node;
  while (current !== null) {
    chain.push(current);
    if (current.tagName === "ASIDE") return chain;
    current = current.parentElement;
  }
  throw new Error("node is not inside the sticky bar");
}

describe("StickyCopyBar", () => {
  let width: number;

  beforeEach(() => {
    // The two narrowest supported widths are 320 and 375; pin the narrower.
    width = window.innerWidth;
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 320 });
  });

  afterEach(() => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
  });

  it("renders at every width — the desktop reader has a copy action too", () => {
    renderBar();
    const bar = screen.getByRole("complementary", { name: "本页快捷操作" });
    // `md:hidden` left ~2,650px of a 3,500px desktop page with no copy action
    // at all — and those are exactly the pixels where the reader decides. The
    // wireframe prototype's bottom bar carries no breakpoint gate either.
    expect(bar.className).not.toMatch(/(^|[\s:])md:hidden/);
    expect(bar.className).not.toMatch(/(^|[\s:])(sm|lg|xl):hidden/);
    expect(bar.className).not.toMatch(/(^|\s)hidden(\s|$)/);
  });

  it("stays pinned without ever sitting on the footer", () => {
    renderBar();
    const bar = screen.getByRole("complementary", { name: "本页快捷操作" });
    // `sticky`, never `fixed`: a sticky box clamps to its own parent, which is
    // the page's content wrapper, so it releases at the true end of the
    // content instead of floating over the footer outside that wrapper.
    expect(bar.className).toContain("sticky");
    expect(bar.className).not.toContain("fixed");
  });

  it("carries the record line and both actions, with the copy text intact", async () => {
    const user = userEvent.setup();
    setClipboard({ writeText: async () => undefined });
    renderBar();
    const bar = screen.getByRole("complementary", { name: "本页快捷操作" });
    expect(within(bar).getByText(INFO.title)).toBeInTheDocument();
    expect(within(bar).getByText(INFO.meta)).toBeInTheDocument();
    expect(within(bar).getByRole("link", { name: /查看原帖/ })).toHaveAttribute(
      "href",
      INFO.sourceUrl,
    );

    // Whatever else changes about the bar, it copies the substituted string it
    // was handed and nothing else.
    let written: string | null = null;
    setClipboard({
      writeText: async (value: string) => {
        written = value;
      },
    });
    await user.click(within(bar).getByRole("button", { name: /复制提示词/ }));
    await waitFor(() => expect(written).toBe(COPY_TEXT));
  });

  it("cannot overflow the failure message at 320px", async () => {
    const user = userEvent.setup();
    setClipboard({
      writeText: async () => {
        throw new Error("clipboard denied");
      },
    });

    renderBar();
    const bar = screen.getByRole("complementary", { name: "本页快捷操作" });
    await user.click(within(bar).getByRole("button", { name: /复制提示词/ }));

    const message = await screen.findByText(FAILURE_MESSAGE);
    // The honest failure path: never a success label it cannot back up.
    expect(screen.queryByText(SUCCESS_LABEL)).not.toBeInTheDocument();

    // The message is the widest thing the bar can ever hold. Every ancestor of
    // it, up to the bar itself, has to be able to give way — otherwise the
    // 168px string is added to a row that is already full and the page scrolls
    // sideways at the narrowest supported width.
    const chain = chainToBar(message);
    expect(chain.length).toBeGreaterThan(2);
    for (const element of chain) {
      for (const rigid of RIGID) {
        expect(
          element.className.split(/\s+/),
          `${rigid} on <${element.tagName.toLowerCase()} class="${element.className}"> pins the failure message to one unshrinkable line`,
        ).not.toContain(rigid);
      }
    }

    // And every flex level between the message and the bar is allowed to wrap,
    // so when the row does run out the actions take a line of their own rather
    // than pushing past the viewport.
    const flexLevels = chain.filter((element) => element.className.includes("flex "));
    expect(flexLevels.length).toBeGreaterThan(0);
    for (const level of flexLevels) {
      expect(
        level.className,
        `<${level.tagName.toLowerCase()} class="${level.className}"> is a flex row that cannot wrap`,
      ).toContain("flex-wrap");
    }
  });

  it("truncates the record line instead of letting a long title widen the bar", () => {
    renderBar();
    const bar = screen.getByRole("complementary", { name: "本页快捷操作" });
    const title = within(bar).getByText(INFO.title);
    const meta = within(bar).getByText(INFO.meta);
    // These two are the one place a nowrap is correct — because `truncate`
    // pairs it with `overflow: hidden`, and their container is `min-w-0` so it
    // can actually reach zero.
    expect(title.className).toContain("truncate");
    expect(meta.className).toContain("truncate");
    expect((title.parentElement as HTMLElement).className).toContain("min-w-0");
  });
});
