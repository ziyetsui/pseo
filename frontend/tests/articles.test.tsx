import { createHash } from "node:crypto";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { loadArticleSite } from "@/site/articles";
import { BlogBody } from "@/components/BlogBody";
import type { Catalog } from "@/lib/catalog/types";

const revision = "sha256:test-article-contract";
const catalog: Catalog = { locale: "zh-CN", mode: "public-api", revision, observedAt: null, prompts: [], models: [], useCases: [], techniques: [], styles: [], subjects: [], collections: [], creators: [], locales: [] };
const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });

async function snapshot({ empty = false, missingRoute = false } = {}) {
  const root = await mkdtemp(path.join(tmpdir(), "pseo-article-adapter-")); roots.push(root);
  const category = { id: "atc_test", slug: "notes", name: "Notes", href: "/zh-CN/blog/category/notes" };
  const item = { id: "art_test", slug: "article-test", href: "/zh-CN/blog/article-test", locale: "zh-CN", title: "Article contract test", excerpt: "Test data only", author: { id: "ata_test", slug: "test-author", name: "Test author", href: "/zh-CN/blog?author=test-author" }, category, tags: [], cover: null, publishedAt: "2026-09-03T00:00:00Z", updatedAt: "2026-09-03T00:00:00Z", readingTimeMinutes: 1 };
  const seo = { title: item.title, description: item.excerpt, canonicalUrl: "https://example.com/zh-CN/blog/article-test", robots: "index,follow", hreflang: {} };
  const completePage = { total: empty ? 0 : 1, hasMore: false, nextCursor: null, limit: 1 };
  const files: Record<string, unknown> = {
    "route-manifest.json": { schemaVersion: 1, contentRevision: revision, publishedLocales: ["zh-CN"], routes: empty ? [] : [
      { kind: "blog-index", locale: "zh-CN", path: "/zh-CN/blog" },
      ...(!missingRoute ? [{ kind: "article-detail", locale: "zh-CN", path: item.href, artifactId: item.id }] : []),
      { kind: "article-category", locale: "zh-CN", path: category.href, artifactId: category.id },
    ] },
    "zh-CN/articles/index.json": { data: empty ? [] : [item], facets: {}, meta: { contentRevision: revision }, page: completePage },
  };
  if (!empty) {
    files["zh-CN/articles/by-slug/article-test.json"] = { summary: item, bodyHtml: "<h2 id=\"test\">Test</h2><p>Approved projection shape.</p>", revision, toc: [{ id: "test", label: "Test", level: 2 }], citations: [], source: null, related: [], seo, localeVariants: [] };
    files["zh-CN/article-categories/notes.json"] = { schemaVersion: 1, entity: { ...category, description: "Test category", updatedAt: item.updatedAt, articleCount: 1, seo }, items: [item], page: completePage };
  }
  const manifestFiles = [];
  for (const [name, object] of Object.entries(files)) {
    const bytes = Buffer.from(JSON.stringify(object)); await mkdir(path.dirname(path.join(root, name)), { recursive: true }); await writeFile(path.join(root, name), bytes);
    manifestFiles.push({ path: name, bytes: bytes.length, sha256: `sha256:${createHash("sha256").update(bytes).digest("hex")}` });
  }
  await writeFile(path.join(root, "build-manifest.json"), JSON.stringify({ schemaVersion: 1, contentRevision: revision, publishedLocales: ["zh-CN"], files: manifestFiles }));
  return root;
}

describe("Article static projection boundary", () => {
  it("distinguishes an unavailable source from a verified empty snapshot", async () => {
    expect((await loadArticleSite(catalog, "")).state).toBe("unavailable");
    const site = await loadArticleSite(catalog, await snapshot({ empty: true }));
    expect(site.state).toBe("ready"); expect(site.articles).toEqual([]); expect(site.routes).toEqual([]);
  });
  it("loads complete detail/category routes from one immutable projection", async () => {
    const site = await loadArticleSite(catalog, await snapshot());
    expect(site.routes).toEqual(["/zh-CN/blog/article-test", "/zh-CN/blog/category/notes"]);
    expect(site.details["article-test"]?.summary.title).toBe("Article contract test");
    expect(site.categories.notes?.items[0]?.id).toBe("art_test");
  });
  it("rejects a changed file and a catalog revision mismatch", async () => {
    const root = await snapshot();
    await expect(loadArticleSite({ ...catalog, revision: "sha256:different" }, root)).rejects.toThrow("manifest/catalog revision mismatch");
    await writeFile(path.join(root, "zh-CN/articles/index.json"), "{}");
    await expect(loadArticleSite(catalog, root)).rejects.toThrow("file size mismatch");
  });
  it("rejects a validly hashed Article without route membership", async () => {
    await expect(loadArticleSite(catalog, await snapshot({ missingRoute: true }))).rejects.toThrow("route membership mismatch");
  });
});

describe("compiled Markdown React renderer", () => {
  it("preserves readable headings/code while escaping text and dropping arbitrary attributes", () => {
    const html = renderToStaticMarkup(<BlogBody html={'<h2 id="heading">Title</h2><p onclick="bad()">Hello <strong>world</strong></p><pre><code>&lt;script&gt;not executable&lt;/script&gt;</code></pre>'} />);
    expect(html).toContain('<h2 id="heading">Title</h2>'); expect(html).toContain("&lt;script&gt;"); expect(html).not.toContain("onclick");
  });
  it("rejects executable tags and javascript links rather than injecting raw HTML", () => {
    expect(() => renderToStaticMarkup(<BlogBody html={'<script>bad()</script>'} />)).toThrow("Unsupported Article body element");
    expect(() => renderToStaticMarkup(<BlogBody html={'<p><a href="javascript:bad()">bad</a></p>'} />)).toThrow("Unsafe Article body URL");
  });
});
