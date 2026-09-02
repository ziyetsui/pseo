import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import BlogListPage, { generateStaticParams as listParams } from "@/app/[locale]/blog/page";
import ArticlePage, { generateStaticParams as articleParams } from "@/app/[locale]/blog/[slug]/page";
import CategoryPage, {
  generateStaticParams as categoryParams,
} from "@/app/[locale]/blog/category/[slug]/page";
import { getContentRepository } from "@/lib/content";
import { blogCategory } from "@/lib/i18n/routes";
import { absoluteUrl } from "@/lib/seo/site";
import { renderInlineMarkdown } from "@/features/blog/inline-markdown";

const LOCALE = "zh-CN";
const repository = getContentRepository();

function jsonLdOf(container: HTMLElement): unknown[] {
  return Array.from(container.querySelectorAll('script[type="application/ld+json"]')).map((node) =>
    JSON.parse(node.textContent ?? "null"),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Index access under `noUncheckedIndexedAccess` — fail loudly, never assert. */
function first<T>(items: readonly T[]): T {
  const [head] = items;
  if (head === undefined) throw new Error("the fixture repository returned an empty list");
  return head;
}

function requireRecord(value: unknown, what: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`expected ${what} to be present`);
  return value;
}

describe("blog list page", () => {
  it("is statically generated for every published locale", async () => {
    await expect(listParams()).resolves.toEqual([{ locale: LOCALE }]);
  });

  it("renders the H1, the featured article and the full latest list", async () => {
    const articles = await repository.listArticles(LOCALE);
    expect(articles.length).toBeGreaterThan(0);

    render(await BlogListPage({ params: Promise.resolve({ locale: LOCALE }) }));

    expect(screen.getByRole("heading", { level: 1, name: "Blog" })).toBeInTheDocument();

    const headline = first(articles);
    const featured = screen.getByRole("region", { name: /精选/ });
    expect(within(featured).getByRole("link", { name: headline.title })).toHaveAttribute(
      "href",
      headline.href,
    );

    const latest = screen.getByRole("region", { name: /最新文章/ });
    expect(within(latest).getAllByRole("listitem")).toHaveLength(articles.length);
    for (const article of articles) {
      expect(within(latest).getByRole("link", { name: article.title })).toHaveAttribute(
        "href",
        article.href,
      );
    }
  });

  it("marks fixture articles with a visible badge on every card", async () => {
    const articles = await repository.listArticles(LOCALE);
    render(await BlogListPage({ params: Promise.resolve({ locale: LOCALE }) }));

    const latest = screen.getByRole("region", { name: /最新文章/ });
    expect(within(latest).getAllByText("示例内容")).toHaveLength(articles.length);
  });

  it("links every category with a real route-builder href and a count from the data", async () => {
    const categories = await repository.listArticleCategories(LOCALE);
    render(await BlogListPage({ params: Promise.resolve({ locale: LOCALE }) }));

    const group = screen.getByRole("region", { name: /分类/ });
    for (const category of categories) {
      const link = within(group).getByRole("link", { name: new RegExp(category.label) });
      expect(link).toHaveAttribute("href", blogCategory(LOCALE, category.slug));
    }
  });

  it("says RSS is not available yet instead of linking a feed that does not exist", async () => {
    const { container } = render(
      await BlogListPage({ params: Promise.resolve({ locale: LOCALE }) }),
    );
    expect(screen.getByText(/RSS 订阅将在后续阶段提供/)).toBeInTheDocument();
    expect(container.querySelector('a[href$=".xml"]')).toBeNull();
    expect(container.querySelector('a[href="#"]')).toBeNull();
  });

  it("emits a BreadcrumbList", async () => {
    const { container } = render(
      await BlogListPage({ params: Promise.resolve({ locale: LOCALE }) }),
    );
    const types = jsonLdOf(container)
      .filter(isRecord)
      .map((entry) => entry["@type"]);
    expect(types).toContain("BreadcrumbList");
  });
});

describe("blog article page", () => {
  it("generates one param set per article slug", async () => {
    const articles = await repository.listArticles(LOCALE);
    await expect(articleParams()).resolves.toEqual(
      articles.map((article) => ({ locale: LOCALE, slug: article.slug })),
    );
  });

  it("shows a visible, non-dismissable fixture notice", async () => {
    const article = first(await repository.listArticles(LOCALE));
    render(
      await ArticlePage({ params: Promise.resolve({ locale: LOCALE, slug: article.slug }) }),
    );

    const notice = screen.getByText(/^示例内容（fixture）：/);
    expect(notice).toBeInTheDocument();
    expect(notice.textContent).toContain("不代表已发布内容");
    expect(within(notice.closest("div") as HTMLElement).queryByRole("button")).toBeNull();
  });

  it("renders the title, description and machine readable dates", async () => {
    const article = first(await repository.listArticles(LOCALE));
    const detail = await repository.getArticle(LOCALE, article.slug);
    if (detail === null) throw new Error(`fixture article ${article.slug} disappeared`);

    const { container } = render(
      await ArticlePage({ params: Promise.resolve({ locale: LOCALE, slug: article.slug }) }),
    );

    expect(screen.getByRole("heading", { level: 1, name: detail.title })).toBeInTheDocument();
    expect(screen.getByText(detail.excerpt)).toBeInTheDocument();

    const times = Array.from(container.querySelectorAll("time")).map((node) =>
      node.getAttribute("datetime"),
    );
    expect(times).toContain(detail.publishedAt);
    expect(times).toContain(detail.updatedAt);
  });

  it("renders every body paragraph without dangerouslySetInnerHTML markup", async () => {
    const article = first(await repository.listArticles(LOCALE));
    const detail = await repository.getArticle(LOCALE, article.slug);
    if (detail === null) throw new Error(`fixture article ${article.slug} disappeared`);
    const { container } = render(
      await ArticlePage({ params: Promise.resolve({ locale: LOCALE, slug: article.slug }) }),
    );
    const body = container.querySelector("[data-article-body]");
    if (body === null) throw new Error("the article body wrapper is missing");
    expect(body.querySelectorAll("p")).toHaveLength(detail.paragraphs.length);
  });

  it("offers a share control whose copy payload is the absolute canonical URL", async () => {
    const article = first(await repository.listArticles(LOCALE));
    const url = absoluteUrl(article.href);

    render(
      await ArticlePage({ params: Promise.resolve({ locale: LOCALE, slug: article.slug }) }),
    );

    expect(screen.getByRole("button", { name: "复制链接" })).toBeInTheDocument();
    expect(screen.getByText(url)).toBeInTheDocument();
  });

  it("emits Article JSON-LD whose headline matches the visible H1", async () => {
    const article = first(await repository.listArticles(LOCALE));
    const detail = await repository.getArticle(LOCALE, article.slug);
    if (detail === null) throw new Error(`fixture article ${article.slug} disappeared`);

    const { container } = render(
      await ArticlePage({ params: Promise.resolve({ locale: LOCALE, slug: article.slug }) }),
    );

    const payloads = jsonLdOf(container).filter(isRecord);
    const articleLd = requireRecord(
      payloads.find((entry) => entry["@type"] === "Article"),
      "Article JSON-LD",
    );
    expect(articleLd.headline).toBe(detail.title);
    expect(articleLd.datePublished).toBe(detail.publishedAt);
    expect(articleLd.dateModified).toBe(detail.updatedAt);
    expect(articleLd.inLanguage).toBe("zh-CN");
    expect(payloads.map((entry) => entry["@type"])).toContain("BreadcrumbList");
  });

  it("never invents an author the data does not carry", async () => {
    const article = first(await repository.listArticles(LOCALE));
    const { container } = render(
      await ArticlePage({ params: Promise.resolve({ locale: LOCALE, slug: article.slug }) }),
    );
    const articleLd = requireRecord(
      jsonLdOf(container)
        .filter(isRecord)
        .find((entry) => entry["@type"] === "Article"),
      "Article JSON-LD",
    );
    expect(articleLd.author).toBeUndefined();
  });

  it("404s on an unknown slug", async () => {
    await expect(
      ArticlePage({ params: Promise.resolve({ locale: LOCALE, slug: "no-such-article" }) }),
    ).rejects.toThrow();
  });
});

describe("blog category page", () => {
  it("only generates categories that actually have articles", async () => {
    const categories = await repository.listArticleCategories(LOCALE);
    const nonEmpty: string[] = [];
    for (const category of categories) {
      const articles = await repository.listArticles(LOCALE, category.slug);
      if (articles.length > 0) nonEmpty.push(category.slug);
    }

    const params = await categoryParams();
    expect(params).toEqual(nonEmpty.map((slug) => ({ locale: LOCALE, slug })));
    expect(params.length).toBeGreaterThan(0);
  });

  it("renders the category label as H1 and lists its articles", async () => {
    const category = first(await repository.listArticleCategories(LOCALE));
    const articles = await repository.listArticles(LOCALE, category.slug);

    render(
      await CategoryPage({ params: Promise.resolve({ locale: LOCALE, slug: category.slug }) }),
    );

    expect(screen.getByRole("heading", { level: 1, name: category.label })).toBeInTheDocument();
    expect(screen.getByText(category.description)).toBeInTheDocument();
    for (const article of articles) {
      expect(screen.getByRole("link", { name: article.title })).toHaveAttribute(
        "href",
        article.href,
      );
    }
  });

  it("404s on an unknown category", async () => {
    await expect(
      CategoryPage({ params: Promise.resolve({ locale: LOCALE, slug: "no-such-category" }) }),
    ).rejects.toThrow();
  });
});

describe("inline markdown renderer", () => {
  it("maps backtick code, bold and http links and leaves everything else as text", () => {
    const tokens = renderInlineMarkdown(
      "把 `[COUNTRY]` 换成 **具体国家**，参考 [规范](https://example.com/spec)。",
    );
    expect(tokens).toEqual([
      { type: "text", value: "把 " },
      { type: "code", value: "[COUNTRY]" },
      { type: "text", value: " 换成 " },
      { type: "strong", value: "具体国家" },
      { type: "text", value: "，参考 " },
      { type: "link", value: "规范", href: "https://example.com/spec" },
      { type: "text", value: "。" },
    ]);
  });

  it("does not treat a bare bracket group as a link", () => {
    expect(renderInlineMarkdown("变量 [COUNTRY] 未替换")).toEqual([
      { type: "text", value: "变量 [COUNTRY] 未替换" },
    ]);
  });
});
