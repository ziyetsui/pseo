import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SiteFooter, type FooterColumn } from "@/components/layout/SiteFooter";
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
  it("renders the prototype's six in-page anchors", () => {
    render(<AnchorNav />);

    expect(HUB_ANCHORS.map((item) => item.label)).toEqual([
      "任务",
      "镜头",
      "模型",
      "风格",
      "合集",
      "创作者",
    ]);
    expect(screen.getByRole("link", { name: "任务" })).toHaveAttribute("href", "#tasks");
    expect(screen.getByRole("link", { name: "镜头" })).toHaveAttribute("href", "#camera");
    expect(screen.getByRole("link", { name: "模型" })).toHaveAttribute("href", "#models");
    expect(screen.getByRole("link", { name: "风格" })).toHaveAttribute("href", "#styles");
    expect(screen.getByRole("link", { name: "合集" })).toHaveAttribute("href", "#collections");
    expect(screen.getByRole("link", { name: "创作者" })).toHaveAttribute("href", "#creators");
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
