import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import NotFound, { metadata } from "@/app/not-found";
import { getContentRepository } from "@/lib/content";
import { blogHome, promptsHome, promptsImage } from "@/lib/i18n/routes";

const LOCALE = "zh-CN";

describe("404 page", () => {
  it("offers real recovery links to L1, L2 and Blog", async () => {
    render(await NotFound());

    const nav = within(screen.getByRole("navigation", { name: "可前往的页面" }));
    expect(nav.getByRole("link", { name: /提示词库/ })).toHaveAttribute(
      "href",
      promptsHome(LOCALE),
    );
    expect(nav.getByRole("link", { name: /图片提示词/ })).toHaveAttribute(
      "href",
      promptsImage(LOCALE),
    );
    expect(nav.getByRole("link", { name: /Blog/ })).toHaveAttribute("href", blogHome(LOCALE));
  });

  it("has a single H1, the real snapshot date and no placeholder hrefs", async () => {
    const snapshot = await getContentRepository().getSnapshot();
    const { container } = render(await NotFound());

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByText(new RegExp(`数据快照日期：${snapshot.observedAt}`))).toBeInTheDocument();
    expect(screen.queryByText(/尚未接入内容仓库/)).not.toBeInTheDocument();
    expect(container.querySelectorAll('a[href="#"]')).toHaveLength(0);
  });

  it("does not add a second robots directive on top of the one Next emits for /404", () => {
    // Next renders `<meta name="robots" content="noindex">` for the exported
    // 404 itself; declaring another here would ship two equivalent tags.
    expect(metadata.robots).toBeUndefined();
  });
});
