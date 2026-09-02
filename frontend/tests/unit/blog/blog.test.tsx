import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import BlogListPage, { generateStaticParams as listParams } from "@/app/[locale]/(site)/blog/page";
import ArticlePage, { generateStaticParams as articleParams } from "@/app/[locale]/(site)/blog/[slug]/page";
import CategoryPage, {
  generateStaticParams as categoryParams,
} from "@/app/[locale]/(site)/blog/category/[slug]/page";
import { getContentRepository } from "@/lib/content";
import { blogCategory } from "@/lib/i18n/routes";
import { absoluteUrl } from "@/lib/seo/site";
import { renderInlineMarkdown } from "@/features/blog/inline-markdown";
import { FIXTURE_BADGE_TEXT, FIXTURE_NOTICE_TEXT } from "@/features/blog/FixtureNotice";

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

/** Escapes regex metacharacters so free text can be used as a substring matcher. */
function textPattern(value: string): RegExp {
  return new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
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
    expect(within(latest).getAllByText(FIXTURE_BADGE_TEXT)).toHaveLength(articles.length);
  });

  it("links only categories that have an article, with a real route-builder href and a count from the data", async () => {
    const categories = await repository.listArticleCategories(LOCALE);
    const articles = await repository.listArticles(LOCALE);
    render(await BlogListPage({ params: Promise.resolve({ locale: LOCALE }) }));

    const group = screen.getByRole("region", { name: /分类/ });
    const nonEmpty = categories.filter(
      (category) => articles.filter((article) => article.category.slug === category.slug).length > 0,
    );
    const empty = categories.filter(
      (category) =>
        articles.filter((article) => article.category.slug === category.slug).length === 0,
    );
    // Sanity check: the fixture actually contains a zero-article category, so
    // the "not linked" assertion below is not vacuously true.
    expect(empty.length).toBeGreaterThan(0);

    for (const category of nonEmpty) {
      const link = within(group).getByRole("link", { name: new RegExp(category.label) });
      expect(link).toHaveAttribute("href", blogCategory(LOCALE, category.slug));
    }
    for (const category of empty) {
      // A zero-article category has no page at `blog/category/[slug]`
      // (`generateStaticParams` there skips it), so linking to it here would
      // be a link to a 404.
      expect(within(group).queryByRole("link", { name: new RegExp(category.label) })).toBeNull();
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

    const notice = screen.getByText(FIXTURE_NOTICE_TEXT);
    expect(notice).toBeInTheDocument();
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

  it("renders each paragraph as elements from the inline-markdown token mapper, never raw HTML text", async () => {
    // This slug's paragraphs are known to use `code` spans (`[COUNTRY]` etc.),
    // so the "not vacuously true" check below is actually exercised.
    const slug = "how-to-replace-prompt-variables";
    const detail = await repository.getArticle(LOCALE, slug);
    if (detail === null) throw new Error(`fixture article ${slug} disappeared`);
    const { container } = render(
      await ArticlePage({ params: Promise.resolve({ locale: LOCALE, slug }) }),
    );
    const body = container.querySelector("[data-article-body]");
    if (body === null) throw new Error("the article body wrapper is missing");
    const paragraphs = body.querySelectorAll("p");
    expect(paragraphs).toHaveLength(detail.paragraphs.length);

    // If a paragraph were ever pushed through `dangerouslySetInnerHTML` (or the
    // token mapper failed to convert markdown syntax to real elements), the
    // rendered text would still carry a literal "<"/">" or an un-mapped "**".
    // None of that should ever reach the DOM's text content.
    for (const paragraph of Array.from(paragraphs)) {
      expect(paragraph.textContent).not.toMatch(/[<>]/);
      expect(paragraph.textContent).not.toMatch(/\*\*/);
    }
    // This fixture's own paragraphs use `code` spans, so the assertion above
    // is exercised, not vacuously true.
    expect(body.querySelectorAll("code").length).toBeGreaterThan(0);
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

  it("renders the visible byline and matches it in the Article JSON-LD author", async () => {
    const article = first(await repository.listArticles(LOCALE));
    const detail = await repository.getArticle(LOCALE, article.slug);
    if (detail === null) throw new Error(`fixture article ${article.slug} disappeared`);

    const { container } = render(
      await ArticlePage({ params: Promise.resolve({ locale: LOCALE, slug: article.slug }) }),
    );

    // The byline is plain inline text next to the category/date meta, not its
    // own isolated element, so assert on the rendered text directly rather
    // than through a text-matching query that could ambiguously match several
    // ancestor nodes.
    expect(container.textContent).toContain(detail.author.name);

    const articleLd = requireRecord(
      jsonLdOf(container)
        .filter(isRecord)
        .find((entry) => entry["@type"] === "Article"),
      "Article JSON-LD",
    );
    const author = requireRecord(articleLd.author, "Article JSON-LD author");
    expect(author["@type"]).toBe("Person");
    expect(author.name).toBe(detail.author.name);
    // The fixture byline carries no url, so JSON-LD must not invent one.
    expect(detail.author.url).toBeNull();
    expect(author.url).toBeUndefined();
  });

  it("renders every source as a link carrying its own URL, and lists it in the JSON-LD citation array", async () => {
    const article = first(await repository.listArticles(LOCALE));
    const detail = await repository.getArticle(LOCALE, article.slug);
    if (detail === null) throw new Error(`fixture article ${article.slug} disappeared`);
    expect(detail.sources.length).toBeGreaterThan(0);

    const { container } = render(
      await ArticlePage({ params: Promise.resolve({ locale: LOCALE, slug: article.slug }) }),
    );

    for (const source of detail.sources) {
      const link = screen.getByRole("link", { name: textPattern(source.label) });
      expect(link).toHaveAttribute("href", source.url);
    }

    const articleLd = requireRecord(
      jsonLdOf(container)
        .filter(isRecord)
        .find((entry) => entry["@type"] === "Article"),
      "Article JSON-LD",
    );
    expect(articleLd.citation).toEqual(detail.sources.map((source) => absoluteUrl(source.url)));
  });

  it("labels the related list 相关文章 when every item shares the category", async () => {
    const sameCategoryArticle = first(await repository.listArticles(LOCALE, "guides"));
    const { unmount } = render(
      await ArticlePage({
        params: Promise.resolve({ locale: LOCALE, slug: sameCategoryArticle.slug }),
      }),
    );
    expect(screen.getByRole("region", { name: "相关文章" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "最新文章" })).toBeNull();
    unmount();
  });

  it("labels the related list 最新文章 when it falls back across categories", async () => {
    // `case-studies` holds exactly one article, so its related rail has
    // nothing left in-category and must fall back to the newest others.
    const soloCategoryArticle = first(await repository.listArticles(LOCALE, "case-studies"));
    render(
      await ArticlePage({
        params: Promise.resolve({ locale: LOCALE, slug: soloCategoryArticle.slug }),
      }),
    );
    expect(screen.getByRole("region", { name: "最新文章" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "相关文章" })).toBeNull();
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
