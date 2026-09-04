# CMS public snapshot 的 deterministic Git 镜像

Payload CMS 中经人工审核并进入 `public` 状态的版本化记录是唯一 canonical 内容事实源。本目录保存相同内容合同的本地 fixture/生成投影；公开 PromptLab 仓库中的 `content/**` 由 mirror Bot 生成，不能反向覆盖 CMS。

## 目录合同

```text
content/
├── site.json
├── surfaces.json
├── prompts/
│   └── <immutable-canonical-id>/
│       ├── en.md
│       └── zh-CN.md
├── articles/
│   └── <immutable-canonical-id>/<locale>.md
└── taxonomies/
    ├── content-type/<immutable-taxonomy-id>/<locale>.json
    ├── model/<immutable-taxonomy-id>/<locale>.json
    └── article-*/<immutable-taxonomy-id>/<locale>.json
```

- 一个 canonical 内容对象使用稳定 immutable id；每个 locale 是独立 CMS 记录与镜像文件。
- frontmatter 位于两个 `---` 之间，使用 JSON-compatible YAML，以便确定性、无歧义地解析。
- 原始 Prompt 不随页面 locale 翻译；`prompt.language` 表示原文语言。缺失 locale 不静默 fallback。
- `sourceRevision` 从 CMS canonical source revision 确定性计算；源内容变化后，旧翻译必须标 stale 并退出 public snapshot，直至重新审核。
- taxonomy、surface、redirect、derived count、RSS、Sitemap、索引和 manifest 都从 CMS snapshot/关系生成，不手工维护。
- 每个镜像内容必须附带 exact `id + locale` rights projection：`cleared` 记录许可/授权；`community_attributed` 记录作者、原帖、署名与 takedown URL，并明确不受仓库 CC BY 再许可。
- `unknown`、`review_required`、`restricted`、`takedown`、未完成 translation review 或未进入 CMS `public` 的记录不得生成。

## 内容如何改变

人或 Agent 先向 CMS 提交 proposal，再由有权限的人完成 editorial、translation 与 rights review。旧的“直接编辑 Markdown → content PR → merge”发布方式已经废弃；公开镜像仓库不接受手工内容写入。

mirror Bot 对一致的 CMS public snapshot 执行全量、确定性生成和验证，并以 expected-main-SHA compare-and-swap 快进 generated-only 仓库 `main`。Bot 不 force push，不修改代码、workflow、保护规则或 secret。相同 snapshot revision 不创建空 commit；失败记录 drift 并可重试。

CMS `public`、Git mirror synced、production deployed 是不同状态，交付与 UI 必须分别显示。Git commit 或 README 更新本身不证明生产站已更新。

## Takedown

`takedown` 会立即从 CMS public projection 排除，并触发高优先级镜像/部署删除；定时 reconciliation 只是兜底。CMS 审计不会物理删除。公开 Git 历史可能保留旧内容，必要的历史清理必须走单独的人工法律/安全流程，不能由常规 Bot force push。

## 本地工程命令

```bash
node infra/bin/content.mjs validate
node infra/bin/content.mjs build --output infra/generated/static
node --test infra/tests/*.test.mjs
```

这些命令用于验证 schema、compiler 和镜像确定性，不是内容 authoring 或发布接口。生成物可重建，不是新的事实源。
