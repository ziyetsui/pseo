# Git-native 内容事实源

`main` 分支中的本目录是公开内容的唯一事实源。草稿、CMS 数据库、构建缓存和 Preview 都不能替代它。

## 目录合同

```text
content/
├── site.json
├── surfaces.json
├── prompts/
    └── <immutable-canonical-id>/
        ├── en.md
        └── zh-CN.md
└── taxonomies/
    ├── content-type/<immutable-taxonomy-id>/<locale>.json
    └── model/<immutable-taxonomy-id>/<locale>.json
```

- 一个 canonical 内容对象占一个目录；frontmatter 的 `id` 必须等于目录名，目录名一经发布不得改变。
- 每个 locale 是独立 Markdown 文件，slug、标题、摘要、正文和 SEO 可独立变化。
- frontmatter 位于两个 `---` 之间，使用 JSON-compatible YAML。JSON 是 YAML 1.2 的严格子集，因此既能保留标准 frontmatter，又能在 CI 中无依赖、无歧义地解析。
- 原始 Prompt 不随页面 locale 翻译；翻译的是页面说明。`prompt.language` 表示原文语言。
- `locales` 是可编辑语言集合，`publishedLocales` 是当前允许公开的子集；`defaultLocale` 必须已经发布。
- 发布状态必须经过普通 branch → PR → required checks → 人工 review → merge。只有合并到 `main` 的 `published + ready + indexable` 内容进入索引、RSS 和 Sitemap。
- 一旦对象进入发布状态，它的 locale 集必须与 `publishedLocales` 完全一致；缺少已发布 locale 时失败，禁止静默 fallback。
- `sourceRevision` 是源 locale 内容的可复算 SHA-256；源内容变化后，翻译必须重新引用新 hash 并完成 review。
- taxonomy 同样以稳定 ID 聚类；`selector` 只允许映射 Prompt 的真实 `contentType` 或 `models` 关系，构建时计算 `memberCount`，源文件不得抄入 wireframe 的历史数量。
- `surfaces.json` 是 internal beta 的显式发布面合同。每个 `publishedLocales` 必须恰好声明 L1、L2、L3、L4；target、locale、slug、kind 或 path 不一致都会阻断构建。
- 当前 internal beta 的 surface 统一为 `noindex,nofollow`。英文内容和 taxonomy 仅保留为 draft，不生成英文 route、索引、RSS 或 Sitemap 条目。

## 本地命令

```bash
node infra/bin/content.mjs validate
node infra/bin/content.mjs build --output infra/generated/static
node --test infra/tests/*.test.mjs
```

生成物是可重建投影，不应作为新的内容事实源。
