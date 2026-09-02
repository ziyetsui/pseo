import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PromptSummary } from "@/lib/content/types";

import { makePromptSummary } from "../support/prompt-fixtures";

let search = "";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(search),
  usePathname: () => "/zh-CN/prompts",
}));

const { TrendingTabs } = await import("@/features/prompt/TrendingTabs");

const BASE = "/zh-CN/prompts";
const OBSERVED_AT = "2026-08-20";

function prompt(id: string, title: string): PromptSummary {
  return makePromptSummary({ id, slug: id, href: `/zh-CN/prompts/${id}`, title });
}

const windows = [
  {
    window: "7d" as const,
    label: "近 7 天",
    items: [prompt("w7", "七日热门提示词")],
    note: "该时段收录较少，已补充全部时段的高分提示词。",
    windowStart: "2026-08-13",
  },
  {
    window: "30d" as const,
    label: "近 30 天",
    items: [prompt("w30", "三十日热门提示词")],
    note: null,
    windowStart: "2026-07-21",
  },
  {
    window: "all" as const,
    label: "全部时段",
    items: [prompt("wall", "全部时段热门提示词")],
    note: null,
    windowStart: null,
  },
];

function renderTabs() {
  return render(
    <TrendingTabs
      locale="zh-CN"
      basePath={BASE}
      windows={windows}
      observedAt={OBSERVED_AT}
    />,
  );
}

beforeEach(() => {
  search = "";
});

describe("TrendingTabs", () => {
  it("defaults to the all-time panel and renders its cards", () => {
    renderTabs();

    const all = screen.getByRole("tab", { name: "全部时段" });
    expect(all).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "近 7 天" })).toHaveAttribute("aria-selected", "false");

    const panel = screen.getByRole("tabpanel");
    expect(all).toHaveAttribute("aria-controls", panel.id);
    expect(panel).toHaveAttribute("aria-labelledby", all.id);
    expect(within(panel).getByRole("heading", { name: "全部时段热门提示词" })).toBeInTheDocument();
  });

  it("names the tablist", () => {
    renderTabs();
    expect(screen.getByRole("tablist", { name: "时间范围" })).toBeInTheDocument();
  });

  it("puts the window in the URL, dropping it for the canonical all-time view", () => {
    renderTabs();

    expect(screen.getByRole("tab", { name: "近 7 天" })).toHaveAttribute(
      "href",
      `${BASE}?window=7d`,
    );
    expect(screen.getByRole("tab", { name: "近 30 天" })).toHaveAttribute(
      "href",
      `${BASE}?window=30d`,
    );
    expect(screen.getByRole("tab", { name: "全部时段" })).toHaveAttribute("href", BASE);
  });

  it("keeps the rest of the query when switching windows", () => {
    search = "model=seedance";
    renderTabs();

    expect(screen.getByRole("tab", { name: "近 7 天" })).toHaveAttribute(
      "href",
      `${BASE}?model=seedance&window=7d`,
    );
  });

  it("selects the window named by the URL and shows its note", () => {
    search = "window=7d";
    renderTabs();

    expect(screen.getByRole("tab", { name: "近 7 天" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "全部时段" })).toHaveAttribute("aria-selected", "false");
    expect(screen.getByText(/该时段收录较少/)).toBeInTheDocument();
    expect(within(screen.getByRole("tabpanel")).getByRole("heading", { name: "七日热门提示词" }))
      .toBeInTheDocument();
  });

  it("hides the note when the window has one of its own", () => {
    search = "window=30d";
    renderTabs();

    expect(screen.queryByText(/该时段收录较少/)).not.toBeInTheDocument();
  });

  it("states the window boundaries from the snapshot rather than a hardcoded date", () => {
    search = "window=30d";
    renderTabs();

    expect(screen.getByText(/2026-07-21/)).toHaveTextContent(OBSERVED_AT);
  });

  it("uses a roving tabindex so the tablist is a single tab stop", () => {
    renderTabs();

    expect(screen.getByRole("tab", { name: "全部时段" })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("tab", { name: "近 7 天" })).toHaveAttribute("tabindex", "-1");
  });

  it("moves focus between tabs with the arrow keys", async () => {
    const user = userEvent.setup();
    renderTabs();

    const first = screen.getByRole("tab", { name: "近 7 天" });
    first.focus();
    expect(first).toHaveFocus();

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "近 30 天" })).toHaveFocus();

    await user.keyboard("{ArrowLeft}");
    expect(first).toHaveFocus();

    await user.keyboard("{End}");
    expect(screen.getByRole("tab", { name: "全部时段" })).toHaveFocus();

    await user.keyboard("{Home}");
    expect(first).toHaveFocus();
  });

  it("wraps around at both ends", async () => {
    const user = userEvent.setup();
    renderTabs();

    screen.getByRole("tab", { name: "近 7 天" }).focus();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "全部时段" })).toHaveFocus();

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "近 7 天" })).toHaveFocus();
  });

  it("shows an empty state rather than a bare grid when a window has nothing", () => {
    render(
      <TrendingTabs
        locale="zh-CN"
        basePath={BASE}
        windows={[{ window: "all", label: "全部时段", items: [], note: null, windowStart: null }]}
        observedAt={OBSERVED_AT}
      />,
    );

    expect(document.querySelector('[data-state="empty"]')).not.toBeNull();
  });
});
