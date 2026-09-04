# PSEO CMS 与 Git 镜像选型证据

Status: 2026-09-02 Git-first decision superseded; 2026-09-03 CMS-first decision is current

Date: 2026-09-02; updated 2026-09-03

Current decision: [0011-promptlab-youmind-cms-publication.md](../specs/0011-promptlab-youmind-cms-publication.md)

Historical implementation: [0009-pseo-tech-arch.md](../specs/0009-pseo-tech-arch.md)

## 0. 决策演进

本文件最初在“内容必须通过 Markdown PR 发布”的约束下推荐 Git-first。
2026-09-03，owner 明确改变该产品约束并选择 YouMind-style CMS-first：

- Payload CMS 是内容、locale、taxonomy、来源、审核和权利决策的唯一事实源；
- GitHub `main` 是从一个已批准 CMS snapshot 生成的公开镜像；
- 内容由专用 bot 在完整校验后直接 fast-forward push `main`，不走逐内容 PR；
- code/schema/workflow/policy/exporter 仍走普通 PR；
- CMS approval、mirror commit 和 production released 仍是三个独立事实。

因此下文关于 Git-first 的结论只保留为当时约束下的历史推理，不能继续
指导 PromptLab 内容发布。

## 1. 被验证的问题

最初要在以下约束下选择 internal beta 架构：

- Git Markdown 与 PR 是发布审核链；
- Payload CMS 是内部编辑入口；
- 每种语言独立版本；
- Python 负责来源采集和内容管线；
- Next.js/TypeScript 前台输出 SEO 静态页；
- 部署目标为 Cloudflare；
- 首版需要尽快跑通端到端闭环。

## 2. 已验证事实

### YouMind

YouMind 公开仓库不是“每条内容、每个语言一个 Markdown”：

- 生成器按 16 个 locale 从 Payload API 拉取内容；
- 每个 locale 输出一个聚合 README；
- approved Issue 先写入 Payload；
- README workflow 每四小时重新生成并由 bot 推送 main；
- 公开仓库因此是 CMS 的导出镜像，不是 Markdown PR 的发布事实源。

当前采用：Issue Form → maintainer `approved` → CMS、CMS 作为真相源、每四
小时 reconciliation、生成多语言 README、bot 直推镜像 `main`。

必须加固：重新读取当前 Issue、校验批准者/body hash、幂等审计、不可变
snapshot、确定性输出、社区权利分轨、媒体独立许可、compare-and-swap、
post-push verify、release attestation 和 priority takedown。

YouMind 的公开实现会打印解析字段、从事件正文解析 Issue、容忍部分图片
上传失败，并把生成时间写入 README。PromptLab 不复制这些行为：日志不写
完整 Prompt，部分失败不批准，同一 snapshot 不因墙钟产生空提交。

证据：

- [Markdown generator](https://raw.githubusercontent.com/YouMind-OpenLab/awesome-nano-banana-pro-prompts/main/scripts/utils/markdown-generator.ts)
- [Generate README](https://raw.githubusercontent.com/YouMind-OpenLab/awesome-nano-banana-pro-prompts/main/scripts/generate-readme.ts)
- [CMS client](https://raw.githubusercontent.com/YouMind-OpenLab/awesome-nano-banana-pro-prompts/main/scripts/utils/cms-client.ts)
- [Issue → CMS workflow](https://raw.githubusercontent.com/YouMind-OpenLab/awesome-nano-banana-pro-prompts/main/.github/workflows/sync-approved-to-cms.yml)
- [README update workflow](https://raw.githubusercontent.com/YouMind-OpenLab/awesome-nano-banana-pro-prompts/main/.github/workflows/update-readme.yml)
- [Local development](https://github.com/YouMind-OpenLab/awesome-nano-banana-pro-prompts/blob/main/docs/LOCAL_DEVELOPMENT.md)

### Payload

- 当前稳定版为 v3.88.0；main 已进入 v4 canary，beta 不跟随 main。
- Website Template 已有 Blog、SEO、Search、Redirect、Draft/Preview 等模块，但不是 Git-native。
- Localization 是字段级；公开读取的 fallback 必须显式关闭。
- locale 独立状态 localizeStatus 仍需按 Beta 功能看待。
- DB 中的 drafts/versions 不能替代 Git history。
- 官方提供 Markdown/MDX 与 Lexical 转换；payloadcms/website 有 Git branch 上的 MDX 写回模式，但整站复杂且需要 commit service。

证据：

- [Payload v3.88.0](https://github.com/payloadcms/payload/releases/tag/v3.88.0)
- [Website Template](https://github.com/payloadcms/payload/tree/main/templates/website)
- [Localization](https://payloadcms.com/docs/configuration/localization)
- [Drafts](https://payloadcms.com/docs/versions/drafts)
- [Versions](https://payloadcms.com/docs/versions/overview)
- [Markdown conversion](https://payloadcms.com/docs/rich-text/converting-markdown)
- [Payload website repository](https://github.com/payloadcms/website)

### OpenBlog

OpenBlog 明确以 Git Markdown 为事实源，提供 Next.js 的 Blog list/post/category、RSS、Sitemap、robots、JSON-LD、AGENTS.md 和 CI 校验，且使用 MIT License。它适合移植 Blog 基础设施和内容校验模式。

它没有 Payload、Python ingest、Prompt Artifact、多语言独立版本和本项目的 L1–L4 PSEO 投影，因此不能整仓替代本方案。最快做法是复用其 Blog/SEO primitives，而不是让它承担 CMS/Git Bridge。

证据：

- [OpenBlog README](https://raw.githubusercontent.com/kostja94/openblog/main/README.md)
- [OpenBlog repository](https://github.com/kostja94/openblog)

### Cloudflare 与 Next.js

- Next.js static export 可部署 Cloudflare Pages，PR 可生成 Preview。
- static export 不支持 Draft Mode、ISR、cookies、Server Actions、动态未预生成路由和默认图片优化。
- Payload 官方 D1/R2 模板存在，但需要 Paid Workers，GraphQL 完整支持未保证；beta 只依赖 REST。
- Cloudflare 支持 Python Workers + FastAPI。
- Python Worker 的依赖、临时文件系统、bundle 和 CPU 有限制，适合 Webhook/触发/状态，不适合 git CLI、浏览器抓取和大批处理。
- Pages 存在文件数、单文件大小和构建时长限制，PSEO 扩量前必须测算构建产物而不是只数页面。

证据：

- [Next.js static site on Pages](https://developers.cloudflare.com/pages/framework-guides/nextjs/deploy-a-static-nextjs-site/)
- [Preview Deployments](https://developers.cloudflare.com/pages/configuration/preview-deployments/)
- [Next.js static export limitations](https://nextjs.org/docs/app/guides/static-exports)
- [Payload Cloudflare template](https://github.com/payloadcms/payload/tree/main/templates/with-cloudflare-d1)
- [Python Workers](https://developers.cloudflare.com/workers/languages/python/)
- [FastAPI on Workers](https://developers.cloudflare.com/workers/languages/python/packages/fastapi/)
- [Python packages](https://developers.cloudflare.com/workers/languages/python/packages/)
- [Workers limits](https://developers.cloudflare.com/workers/platform/limits/)
- [Pages limits](https://developers.cloudflare.com/pages/platform/limits/)

### GitHub

GitHub 可以由受控 service identity 直接 fast-forward 更新 `main`，但
`Contents: write` 是仓库级权限，不能把 token 原生限制到少数生成路径。
因此生成内容应优先使用 generated-only mirror repository；若与代码同仓，
需固定 exporter revision、输出 allowlist、compare-and-swap、独立 post-push
audit 和异常冻结。人类与通用 Agent 不获得 bypass，force-push 和分支删除仍
关闭。

证据：

- [Git refs](https://docs.github.com/en/rest/git/refs?apiVersion=2022-11-28)
- [Rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets)
- [Automatic token authentication](https://docs.github.com/en/actions/security-for-github-actions/security-guides/automatic-token-authentication)

## 3. 更新后的方案比较

| 方案 | 内容事实源 | 内容发布 | 当前结论 |
| --- | --- | --- | --- |
| CMS-first + generated-only Git mirror | Payload CMS | 校验后的 bot fast-forward `main` | **采用**；最接近 YouMind 且保留审计/确定性加固 |
| Git-first + Payload draft | Git `main` | 每内容 PR | 已被 owner 取代；旧 PR 仅保留历史证据 |
| CMS/Git 双向编辑 | 两套可写源 | 冲突合并 | 拒绝；产生双主与回写冲突 |
| Payload-only、无公开镜像 | Payload CMS | CMS publish | 不满足公开可浏览/引用/贡献的 OpenLab 目标 |
| 巨型 README-only 镜像 | Payload CMS | 定时直推 | 可作为展示层，但仍需逐内容 Markdown/JSON 与机器索引 |

## 4. 当前决定

采用：

~~~text
owner/licensor Issue ─┐
community nomination ├→ maintainer approved exact Issue revision
CMS/Agent draft ──────┘
→ Payload CMS revision-bound approval + rights decision
→ immutable, pagination-closed export snapshot
→ temporary-directory deterministic Markdown/JSON/README build
→ schema/rights/path/secret/manifest verification
→ mirror bot compare-and-swap fast-forward to main
→ independent post-push verify
→ exact-commit production deploy + smoke
→ released receipt written back to CMS
~~~

`cleared` 适用于作者/获授权/兼容许可内容；`community_attributed` 适用于经
人工接受的公开来源路径，必须显示作者、原帖、author-retains-rights 和
takedown，不得声明 CC BY。`review_required/restricted/takedown` 不进入新增
公开 snapshot。

定时任务每四小时对账；approval、rights downgrade 和 takedown 使用事件
触发。Takedown 优先于 schedule，失败持续报警重试。Git 镜像 commit 不是
生产 released 证据。

## 5. 历史 Git-first 决定

2026-09-02 的约束曾导出以下方案：Payload draft → Submit Review → Git
Bridge → Markdown PR → CI/Preview → human merge。相关 PR #3/#4/#5 和测试
结果仍有审计价值，但它们不再是当前发布步骤，不应通过合并这些 PR 来完成
CMS-first cutover。

## 6. 事实、推断与待确认

### 事实

- `ziyetsui/prompt-lab` 已是公开仓库；其早期 Git-first foundation 与 PR
  证据存在，但 CMS-first intake/export/direct-main runtime 尚未安装。
- owner-only Cloudflare Pages/CMS Internal Beta 已上线；CMS 远程 D1 当前有
  36 Prompt，其中 35 条 wireframe/X seed 仍为 `review_required`。
- YouMind 的公开工作流确实以 approved Issue 写 CMS，并每四小时从 CMS
  生成多语言 README 后由 bot 直推 `main`。
- Cloudflare/Payload/Next/GitHub 的上述平台限制来自一手资料。

### 合理推断

- generated-only 仓库能显著降低仓库级写 token 不能 path-scope 的风险。
- CMS intake、CMS read-only export、Git mirror write 和 deploy 凭据分离比
  复用一个 API key 更适合公开投稿。
- 重生成与 Git 操作适合 GitHub Actions；Cloudflare Worker 保持为受保护的
  CMS/API 边界。

### 待确认

- 对现有 35 条记录是否逐条采用 `community_attributed`；当前没有批量授权；
- 具体 takedown 响应 SLA 和私有 rights contact；
- mirror 代码与生成输出是否最终分仓；
- GitHub App/ruleset 的专用 bypass identity；
- X/第三方媒体逐项复制许可；
- 生产部署与 `released` 回写实现。

## 7. 实施边界

政策/模板完成不等于链路完成。只有 approved-Issue intake、revision-bound
CMS approval、immutable snapshot、deterministic exporter、direct-main CAS、
post-push verify、production deploy attestation 和 priority takedown 全部通过
线上 E2E 后，才能称 CMS-first public mirror 已跑通。
