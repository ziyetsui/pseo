import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { SiteFooter, type FooterColumn } from "@/components/layout/SiteFooter";
import { MobileNav } from "@/components/layout/MobileNav";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { getPrimaryNav } from "@/components/layout/nav";
import { AnchorNav, HUB_ANCHORS } from "@/features/hub/AnchorNav";
import { buildFooterColumns } from "@/features/hub/footer-links";
import type { TaxonomyWithCount } from "@/lib/content/types";
import { SITE_NAME } from "@/lib/seo/site";

const LOCALE = "zh-CN";
const OBSERVED_AT = "2026-08-20";

function term(overrides: Partial<TaxonomyWithCount>): TaxonomyWithCount {
  return {
    id: "x",
    axis: "useCase",
    slug: "x",
    label: "X",
    labelZh: null,
    aliases: [],
    href: null,
    wireframeDeclaredCount: null,
    count: 1,
    highValueCount: 0,
    ...overrides,
  };
}

describe("site brand and primary nav", () => {
  it("names the site as the prototype does", () => {
    expect(SITE_NAME).toBe("Higgsfield 提示词库");
  });

  it("lists the prototype's seven nav entries in order, then Blog", () => {
    // `Blog` is the one entry the prototype has no equivalent for: `/zh-CN/blog`
    // is a real published section and the nav is the only place an indexable
    // page can link to it, so it is appended rather than substituted.
    expect(getPrimaryNav(LOCALE).map((item) => item.label)).toEqual([
      "首页",
      "图片",
      "视频",
      "模型",
      "用例",
      "风格",
      "创作者",
      "Blog",
    ]);
    expect(getPrimaryNav(LOCALE).at(-1)).toEqual({
      key: "blog",
      label: "Blog",
      href: "/zh-CN/blog",
    });
  });

  it("routes only the two pages this phase builds, and marks the current one", () => {
    render(<SiteHeader locale={LOCALE} currentNav="image" />);
    const nav = within(screen.getByRole("navigation", { name: "主导航" }));

    expect(nav.getByRole("link", { name: "首页" })).toHaveAttribute("href", "/zh-CN/prompts");
    const image = nav.getByRole("link", { name: "图片" });
    expect(image).toHaveAttribute("href", "/zh-CN/prompts/image");
    expect(image).toHaveAttribute("aria-current", "page");
    expect(nav.getByRole("link", { name: "首页" })).not.toHaveAttribute("aria-current");

    // 模型 in the prototype points at `/prompts/models`, an index this phase
    // does not build; it is text, not a link to some other model page.
    for (const label of ["视频", "模型", "用例", "风格", "创作者"]) {
      expect(nav.queryByRole("link", { name: label })).not.toBeInTheDocument();
      expect(nav.getByText(label)).toBeInTheDocument();
    }
    expect(nav.getAllByText("（即将推出）")).toHaveLength(5);
  });

  it("links Blog from the primary nav so the section is not orphaned", () => {
    render(<SiteHeader locale={LOCALE} />);
    const nav = within(screen.getByRole("navigation", { name: "主导航" }));
    expect(nav.getByRole("link", { name: "Blog" })).toHaveAttribute("href", "/zh-CN/blog");
  });

  it("brands the header with the site name", () => {
    render(<SiteHeader locale={LOCALE} />);
    expect(screen.getByRole("link", { name: /Higgsfield 提示词库/ })).toHaveAttribute(
      "href",
      "/zh-CN/prompts",
    );
  });
});

describe("AnchorNav", () => {
  it("links only the browse sections that still exist", () => {
    render(<AnchorNav />);

    // 任务 / 镜头 / 风格 pointed at bands that were a second printing of the
    // facet chip rows and have been deleted, so the anchors went with them
    // rather than dangling — `check:static` rule 3 requires every fragment to
    // resolve in the shipped HTML.
    expect(HUB_ANCHORS.map((item) => item.label)).toEqual(["模型", "合集", "创作者"]);
    expect(screen.getByRole("link", { name: "模型" })).toHaveAttribute("href", "#models");
    expect(screen.getByRole("link", { name: "合集" })).toHaveAttribute("href", "#collections");
    expect(screen.getByRole("link", { name: "创作者" })).toHaveAttribute("href", "#creators");
    for (const label of ["任务", "镜头", "风格"]) {
      expect(screen.queryByRole("link", { name: label })).toBeNull();
    }
  });
});

describe("SiteFooter", () => {
  const columns: FooterColumn[] = [
    {
      title: "按模型",
      items: [{ label: "Seedance 提示词", href: "/zh-CN/prompts/models/seedance" }],
    },
    {
      title: "资源",
      items: [{ label: "全部合集", href: null, note: "（即将推出）" }],
    },
  ];

  it("writes the prototype's three legal lines verbatim, on either variant", () => {
    for (const variant of ["full", "compact"] as const) {
      const { unmount } = render(
        <SiteFooter variant={variant} columns={columns} snapshotDate={OBSERVED_AT} />,
      );
      const legal = screen.getByTestId("footer-legal");

      expect(legal).toHaveTextContent("Higgsfield 提示词库");
      expect(legal).toHaveTextContent("提示词版权归原作者所有，本站注明出处");
      expect(legal).toHaveTextContent(`数据更新于 ${OBSERVED_AT}`);
      // The RSS sentence is gone.
      expect(legal).not.toHaveTextContent("RSS");
      unmount();
    }
  });

  it("renders link columns only for the full variant", () => {
    const { unmount } = render(
      <SiteFooter variant="full" columns={columns} snapshotDate={OBSERVED_AT} />,
    );
    expect(screen.getByRole("heading", { name: "按模型" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Seedance 提示词" })).toHaveAttribute(
      "href",
      "/zh-CN/prompts/models/seedance",
    );
    // A resource with no page is text plus its reason, never a link.
    expect(screen.queryByRole("link", { name: /全部合集/ })).not.toBeInTheDocument();
    expect(screen.getByText("全部合集")).toBeInTheDocument();
    expect(screen.getByText("（即将推出）")).toBeInTheDocument();
    unmount();

    render(<SiteFooter columns={columns} snapshotDate={OBSERVED_AT} />);
    expect(screen.queryByRole("heading", { name: "按模型" })).not.toBeInTheDocument();
  });

  it("offers a compact link row for the prototype's L4 foot", () => {
    render(
      <SiteFooter
        variant="compact"
        links={[{ label: "首页", href: "/zh-CN/prompts" }]}
        snapshotDate={OBSERVED_AT}
      />,
    );
    expect(screen.getByRole("link", { name: "首页" })).toHaveAttribute("href", "/zh-CN/prompts");
  });

  it("adds Blog to the 资源 column of the full footer, once", () => {
    render(
      <SiteFooter
        variant="full"
        columns={columns}
        blogHref="/zh-CN/blog"
        snapshotDate={OBSERVED_AT}
      />,
    );
    const resources = screen.getByRole("heading", { name: "资源" }).parentElement;
    expect(resources).not.toBeNull();
    const blog = within(resources as HTMLElement).getAllByRole("link", { name: "Blog" });
    expect(blog).toHaveLength(1);
    expect(blog[0]).toHaveAttribute("href", "/zh-CN/blog");
  });

  it("never invents a 资源 column that the caller did not supply", () => {
    render(
      <SiteFooter
        variant="full"
        columns={[columns[0] as FooterColumn]}
        blogHref="/zh-CN/blog"
        snapshotDate={OBSERVED_AT}
      />,
    );
    expect(screen.queryByRole("heading", { name: "资源" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Blog" })).not.toBeInTheDocument();
  });

  it("says so rather than inventing a date when no snapshot is wired up", () => {
    render(<SiteFooter />);
    expect(screen.getByTestId("footer-legal")).toHaveTextContent("尚未接入内容仓库");
  });
});

describe("buildFooterColumns", () => {
  const columns = buildFooterColumns(LOCALE, {
    models: [
      term({ id: "model:seedance", axis: "model", slug: "seedance", label: "Seedance", count: 9 }),
      term({
        id: "model:kling",
        axis: "model",
        slug: "kling",
        label: "Kling",
        href: "/zh-CN/prompts/models/kling",
        count: 4,
      }),
    ],
    useCases: [
      term({ id: "useCase:fashion", slug: "fashion", label: "Fashion", labelZh: "时尚", count: 8 }),
    ],
    techniques: [
      term({
        id: "technique:camera",
        axis: "technique",
        slug: "camera-movement-shot-language",
        label: "Camera movement / shot language",
        labelZh: "镜头运动",
        count: 7,
      }),
    ],
    styles: [
      term({
        id: "style:cinematic",
        axis: "style",
        slug: "cinematic",
        label: "Cinematic",
        labelZh: "电影感",
        count: 6,
      }),
    ],
  });

  it("produces the prototype's five columns in order", () => {
    expect(columns.map((column) => column.title)).toEqual([
      "按模型",
      "按任务",
      "镜头与技法",
      "按风格",
      "资源",
    ]);
  });

  it("sends a model with a page to that page, and one without to the filtered hub", () => {
    const items = columns[0]?.items ?? [];
    expect(items).toContainEqual({
      label: "Kling 提示词",
      href: "/zh-CN/prompts/models/kling",
    });
    expect(items).toContainEqual({
      label: "Seedance 提示词",
      href: "/zh-CN/prompts?model=seedance",
    });
  });

  it("labels the Chinese axes as `{labelZh}提示词` and links them to a filtered hub", () => {
    expect(columns[1]?.items[0]).toEqual({
      label: "时尚提示词",
      href: "/zh-CN/prompts?useCase=fashion",
    });
    expect(columns[2]?.items[0]).toEqual({
      label: "镜头运动提示词",
      href: "/zh-CN/prompts?technique=camera-movement-shot-language",
    });
    expect(columns[3]?.items[0]).toEqual({
      label: "电影感提示词",
      href: "/zh-CN/prompts?style=cinematic",
    });
  });

  it("keeps the 资源 column as three unlinked, labelled placeholders", () => {
    expect(columns[4]?.items).toEqual([
      { label: "提示词详情页", href: null, note: "（即将推出）" },
      { label: "全部合集", href: null, note: "（即将推出）" },
      { label: "全部创作者", href: null, note: "（即将推出）" },
    ]);
  });

  it("never invents a term the current data does not have", () => {
    const sparse = buildFooterColumns(LOCALE, {
      models: [],
      useCases: [],
      techniques: [],
      styles: [],
    });
    for (const column of sparse.slice(0, 4)) expect(column.items).toEqual([]);
  });
});

/**
 * 图版 02 / 03 / 04 / 06 applied to the site chrome: the footer columns are a
 * dense text index rather than five stacks of boxes, and header and footer
 * share one type tier and one set of divider tiers.
 */
describe("site chrome card-system tiers", () => {
  const columns: FooterColumn[] = [
    {
      title: "按模型",
      items: [
        { label: "Seedance 提示词", href: "/zh-CN/prompts?model=seedance" },
        { label: "Kling 提示词", href: "/zh-CN/prompts/models/kling" },
      ],
    },
    {
      title: "资源",
      items: [{ label: "全部合集", href: null, note: "（即将推出）" }],
    },
  ];

  function footerRow(name: string): HTMLElement {
    return screen.getByRole("link", { name }).closest("a") as HTMLElement;
  }

  it("demotes the footer columns to hairline rows: no card frame, no shadow, no fill", () => {
    render(<SiteFooter variant="full" columns={columns} snapshotDate={OBSERVED_AT} />);

    const row = footerRow("Seedance 提示词");
    // The row tier: a 15% rule and nothing else. A footer column is an index,
    // and an index in boxes is what 图版 02 exists to stop.
    expect(row.className).toContain("border-b-2");
    expect(row.className).toContain("border-surface/15");
    expect(row.className).not.toMatch(/shadow-hard/);
    // No RESTING fill. The anchor matters: the row does carry
    // `active:bg-surface/10`, which is the press — a transient reply to a
    // gesture, not a box the row sits in. A hairline row has no other surface
    // to answer a tap with, and on touch it is the only feedback there is.
    expect(row.className).not.toMatch(/(^|\s)bg-(surface|canvas|muted)\b/);
    // 44×44 survives the demotion.
    expect(row.className).toContain("min-h-11");
  });

  it("gives every hairline row a chevron that is hidden from assistive tech", () => {
    render(<SiteFooter variant="full" columns={columns} snapshotDate={OBSERVED_AT} />);

    const row = footerRow("Seedance 提示词");
    const chevron = row.querySelector('[aria-hidden="true"]');
    expect(chevron).not.toBeNull();
    // Reveal expression ⑤ answers focus as well as hover: a chevron only a
    // mouse can summon is information a keyboard never receives.
    expect((chevron as HTMLElement).className).toContain("opacity-0");
    expect((chevron as HTMLElement).className).toContain("group-hover:opacity-100");
    expect((chevron as HTMLElement).className).toContain("group-focus-visible:opacity-100");
  });

  it("drops the rule under the last row of a column", () => {
    render(<SiteFooter variant="full" columns={columns} snapshotDate={OBSERVED_AT} />);
    expect(footerRow("Kling 提示词").className).not.toContain("border-b-2");
  });

  it("keeps an unbuilt destination as a non-link row with its marker", () => {
    render(<SiteFooter variant="full" columns={columns} snapshotDate={OBSERVED_AT} />);

    expect(screen.queryByRole("link", { name: /全部合集/ })).not.toBeInTheDocument();
    // The shared `HairlineRow`, in its non-link variant: a `<span>` carrying
    // the row's own 44px floor, and no chevron to promise a destination.
    const row = screen.getByText("全部合集").closest("li")?.firstElementChild as HTMLElement;
    expect(row.tagName).toBe("SPAN");
    expect(row.className).toContain("min-h-11");
    expect(row.querySelector('[aria-hidden="true"]')).toBeNull();
    // The marker is the signal; the dimmed colour never carries the state alone.
    expect(screen.getByText("（即将推出）")).toBeInTheDocument();
  });

  it("separates the footer columns on the column tier and the rows on the row tier", () => {
    render(<SiteFooter variant="full" columns={columns} snapshotDate={OBSERVED_AT} />);

    const heading = screen.getByRole("heading", { name: "资源" });
    const column = heading.parentElement as HTMLElement;
    // ~70% between columns, ~15% between rows: the denser the rules, the
    // lighter they are drawn (图版 06).
    // Only the WIDTH is breakpoint-scoped: a 0-width border paints nothing, so
    // the surface-aware hue can stay unprefixed.
    expect(column.className).toContain("lg:border-l-2");
    expect(column.className).toContain("border-surface/70");
    // …and it is drawn on the footer's own ink, without a `!` override.
    expect(column.className).not.toContain("!");
    // The first column has no rule to its left — there is no column there.
    const first = screen.getByRole("heading", { name: "按模型" }).parentElement as HTMLElement;
    expect(first.className).not.toContain("lg:border-l-2");
  });

  it("sets the column headings and the legal line on the micro label tier", () => {
    render(<SiteFooter variant="full" columns={columns} snapshotDate={OBSERVED_AT} />);

    expect(screen.getByRole("heading", { name: "按模型" }).className).toContain("tracking-micro");
    expect(screen.getByTestId("footer-legal").className).toContain("tracking-micro");
  });

  it("gives the compact variant the same tiers as the full one", () => {
    render(
      <SiteFooter
        variant="compact"
        links={[{ label: "首页", href: "/zh-CN/prompts" }]}
        snapshotDate={OBSERVED_AT}
      />,
    );

    // Same type tier as the full footer's legal line…
    expect(screen.getByTestId("footer-legal").className).toContain("tracking-micro");
    // …and the same column-tier rule above it.
    expect(screen.getByTestId("footer-legal").className).toContain("border-surface/70");
    // The short row is navigation, so it answers with the growing underline.
    const link = screen.getByRole("link", { name: "首页" });
    expect(link.className).toContain("group");
    expect(link.className).toContain("no-underline");
  });

  it("draws no rule above the legal line when nothing precedes it", () => {
    render(<SiteFooter variant="compact" snapshotDate={OBSERVED_AT} />);
    expect(screen.getByTestId("footer-legal").className).not.toContain("border-t-2");
  });

  it("gives the header nav links the growing underline and keeps the current-page rule", () => {
    render(<SiteHeader locale={LOCALE} currentNav="image" />);
    const nav = within(screen.getByRole("navigation", { name: "主导航" }));

    const home = nav.getByRole("link", { name: "首页" });
    expect(home.className).toContain("group");
    expect(home.className).toContain("no-underline");
    const bar = home.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(bar.className).toContain("group-hover:w-full");
    expect(bar.className).toContain("group-focus-visible:w-full");

    // The current page is still marked with a line, not with colour alone.
    const image = nav.getByRole("link", { name: "图片" });
    expect(image).toHaveAttribute("aria-current", "page");
    expect(image.className).toContain("aria-[current=page]:underline");
  });

  it("keeps the disclosure menu's list identical, markers on the same tier", async () => {
    render(<MobileNav items={getPrimaryNav(LOCALE)} currentNav="image" />);

    // The disclosure still opens the same way, and the panel is still out of
    // the accessibility tree until it does.
    const toggle = screen.getByRole("button", { name: "菜单" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(toggle);
    expect(screen.getByRole("button", { name: "关闭" })).toHaveAttribute("aria-expanded", "true");

    const nav = within(screen.getByRole("navigation", { name: "移动端主导航" }));
    // The identical link list, markers included — nothing was dropped or
    // promoted into a link by the restyle.
    expect(nav.getByRole("link", { name: "首页" })).toHaveAttribute("href", "/zh-CN/prompts");
    expect(nav.getByRole("link", { name: "Blog" })).toHaveAttribute("href", "/zh-CN/blog");
    const markers = nav.getAllByText("（即将推出）");
    expect(markers).toHaveLength(5);
    for (const marker of markers) expect(marker.className).toContain("tracking-micro");
  });

  it("sets the language control and the coming-soon markers on the micro label tier", () => {
    render(<SiteHeader locale={LOCALE} />);

    const nav = within(screen.getByRole("navigation", { name: "主导航" }));
    for (const marker of nav.getAllByText("（即将推出）")) {
      expect(marker.className).toContain("tracking-micro");
    }

    const language = screen.getByRole("button", { name: /zh-CN/ });
    expect(language.className).toContain("tracking-micro");
    expect(language).toHaveAttribute("aria-disabled", "true");
    expect(language).toHaveAttribute("aria-describedby", "locale-availability");
  });
});
