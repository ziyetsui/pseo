import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CopyPromptButton } from "@/features/prompt/CopyPromptButton";
import { ExpandToggle } from "@/features/prompt/ExpandToggle";
import { PromptText } from "@/features/prompt/PromptText";
import type { PromptSummary } from "@/lib/content/types";

import { makePromptSummary } from "../support/prompt-fixtures";

let search = "";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(search),
  usePathname: () => "/zh-CN/prompts",
}));

const { TrendingTabs } = await import("@/features/prompt/TrendingTabs");

const BASE = "/zh-CN/prompts";
const LONG_PROMPT = Array.from({ length: 40 }, (_, line) => `line ${line}`).join("\n");

function prompt(id: string, title: string): PromptSummary {
  return makePromptSummary({ id, slug: id, href: `${BASE}/${id}`, title });
}

const windows = [
  { window: "7d" as const, label: "近 7 天", items: [prompt("w7", "七日")], note: null, windowStart: null },
  { window: "all" as const, label: "全部", items: [prompt("wall", "全部")], note: null, windowStart: null },
];

function renderTabs() {
  return render(
    <TrendingTabs locale="zh-CN" basePath={BASE} windows={windows} observedAt="2026-08-20" />,
  );
}

beforeEach(() => {
  search = "";
});

/**
 * The invariant behind `transitionClassName`: `outline` is state, never
 * motion. A bare `transition` (21 properties in Tailwind v4) or a
 * `transition-colors` (7) both carry `outline-color`, which makes a
 * `:focus-visible` ring fade in from the element's own text colour.
 */
function expectNoOutlineTransition(element: Element): void {
  const classes = element.className;
  expect(classes).not.toMatch(/(^|\s)transition(\s|$)/);
  expect(classes).not.toContain("transition-colors");
  expect(classes).not.toContain("transition-all");
  expect(classes).not.toContain("outline");
}

describe("CopyPromptButton width reservation", () => {
  it("reserves the button's width for both labels without ever writing the success text", () => {
    render(
      <div>
        <pre id="p">x</pre>
        <CopyPromptButton text="x" targetId="p" />
      </div>,
    );

    const button = screen.getByRole("button", { name: "复制提示词" });
    const sizers = [...button.querySelectorAll('[aria-hidden="true"][style*="--copy-label"]')];
    expect(sizers).toHaveLength(2);

    const reserved = sizers.map((node) => node.getAttribute("style"));
    expect(reserved.some((style) => style?.includes("复制提示词"))).toBe(true);
    expect(reserved.some((style) => style?.includes("已复制"))).toBe(true);

    // The reserved copies are CSS `content`, never text. The copy contract is
    // that 已复制 appears only after a confirmed clipboard write, and
    // `tests/e2e/copy.spec.ts` asserts that against the whole document.
    expect(document.body.textContent).not.toContain("已复制");
    expect(button.textContent).toBe("复制提示词");
  });

  it("keeps the reservation on a caller's own labels", () => {
    render(
      <div>
        <pre id="p">x</pre>
        <CopyPromptButton text="x" targetId="p" label="复制" successLabel="已复制" />
      </div>,
    );

    const button = screen.getByRole("button", { name: "复制" });
    const reserved = [...button.querySelectorAll('[aria-hidden="true"][style*="--copy-label"]')].map(
      (node) => node.getAttribute("style"),
    );
    expect(reserved).toHaveLength(2);
    expect(reserved.some((style) => style?.includes("已复制"))).toBe(true);
    expect(button.textContent).toBe("复制");
  });
});

describe("ExpandToggle", () => {
  it("keeps the whole prompt in the DOM in both states", async () => {
    const { container } = render(<PromptText id="p1" text={LONG_PROMPT} />);

    expect(container.querySelector("pre#p1")).toHaveTextContent("line 39");
    await userEvent.click(screen.getByRole("button", { name: "展开" }));
    expect(container.querySelector("pre#p1")).toHaveTextContent("line 39");
    await userEvent.click(screen.getByRole("button", { name: "收起" }));
    expect(container.querySelector("pre#p1")).toHaveTextContent("line 39");
  });

  it("ships the height transition behind an interpolate-size support gate", () => {
    render(<PromptText id="p1" text={LONG_PROMPT} />);

    const styles = [...document.querySelectorAll("style")].map((node) => node.textContent ?? "");
    const clamp = styles.find((css) => css.includes(".prompt-clamp"));
    expect(clamp).toBeDefined();

    // The whole rule set degrades to today's snap where the keyword is not
    // interpolable — nothing applies outside the gate.
    expect(clamp).toContain("@supports (interpolate-size: allow-keywords)");
    // Line-exact by construction, which a pixel `max-height` could not be.
    expect(clamp).toContain("max-height: 4lh");
    expect(clamp).toContain("max-height: 7lh");
    // The tempo comes from the token, not from a literal.
    expect(clamp).toContain("transition: max-height var(--motion-base) ease-out");
  });

  it("renders one copy of the clamp rules however many prompts are on the page", () => {
    render(
      <div>
        <PromptText id="p1" text={LONG_PROMPT} />
        <PromptText id="p2" text={LONG_PROMPT} />
        <PromptText id="p3" text={LONG_PROMPT} />
      </div>,
    );

    const clamps = [...document.querySelectorAll("style")].filter((node) =>
      (node.textContent ?? "").includes(".prompt-clamp"),
    );
    expect(clamps).toHaveLength(1);
  });

  it("gives the toggle a press state and a named transition", () => {
    render(<PromptText id="p1" text={LONG_PROMPT} />);
    const toggle = screen.getByRole("button", { name: "展开" });

    // No shadow to collapse on a text control, so the press previews a fill.
    expect(toggle.className).toContain("active:bg-foreground");
    expect(toggle.className).toContain("transition-[color,background-color]");
    expectNoOutlineTransition(toggle);
    // 44×44 survives the type-tier swap.
    expect(toggle.className).toContain("min-h-11");
    expect(toggle.className).toContain("min-w-11");
  });

  it("lets a caller own the toggle's skin", () => {
    render(
      <ExpandToggle contentId="p1" toggleClassName="custom-toggle">
        <pre id="p1">x</pre>
      </ExpandToggle>,
    );
    expect(screen.getByRole("button", { name: "展开" })).toHaveClass("custom-toggle");
  });
});

describe("TrendingTabs panel swap", () => {
  it("presses the unselected tab flat and leaves the selected one alone", () => {
    renderTabs();

    const idle = screen.getByRole("tab", { name: "近 7 天" });
    const selected = screen.getByRole("tab", { name: "全部" });

    expect(idle.className).toContain("press-flatten");
    expect(idle.className).toContain("shadow-hard-sm");
    // Nothing to collapse: the selected tab carries no shadow, and a flat
    // object sliding against a flat page reads as a glitch, not as a press.
    expect(selected.className).not.toContain("press-flatten");
    expect(selected.className).toContain("bg-foreground");

    expectNoOutlineTransition(idle);
    expectNoOutlineTransition(selected);
    expect(idle.className).toContain("transition-[color,background-color,box-shadow,translate]");
  });

  it("keys the panel list on the window so a swap replaces it", () => {
    const { container, rerender } = render(
      <TrendingTabs locale="zh-CN" basePath={BASE} windows={windows} observedAt="2026-08-20" />,
    );
    const before = container.querySelector('[role="tabpanel"] ul');

    search = "window=7d";
    rerender(
      <TrendingTabs locale="zh-CN" basePath={BASE} windows={windows} observedAt="2026-08-20" />,
    );
    const after = container.querySelector('[role="tabpanel"] ul');

    expect(after).not.toBe(before);
  });

  it("arms the starting style on the gesture, not on load", async () => {
    renderTabs();

    // A page that is only read animates nothing: `@starting-style` fires on an
    // element's first render, and the exported HTML's panel is one of those.
    const list = () => document.querySelector('[role="tabpanel"] ul');
    expect(list()?.className).not.toContain("starting:");

    await userEvent.click(screen.getByRole("tab", { name: "近 7 天" }));

    const armed = list()?.className ?? "";
    expect(armed).toContain("starting:opacity-0");
    expect(armed).toContain("starting:translate-y-1");
    expect(armed).toContain("transition-[opacity,translate]");
    expect(armed).toContain("duration-200");
    // One block, never per card — a stagger would put motion on the data.
    expect(document.querySelectorAll('[role="tabpanel"] ul li [class*="starting:"]')).toHaveLength(
      0,
    );
  });

  it("keeps the roving tabindex, aria-selected and the window param", async () => {
    renderTabs();

    const seven = screen.getByRole("tab", { name: "近 7 天" });
    expect(seven).toHaveAttribute("aria-selected", "false");
    expect(seven).toHaveAttribute("tabindex", "-1");
    expect(seven).toHaveAttribute("href", `${BASE}?window=7d`);
    expect(screen.getByRole("tab", { name: "全部" })).toHaveAttribute("tabindex", "0");

    seven.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "全部" })).toHaveFocus();
  });
});
