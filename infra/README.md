# 内容与静态发布基础设施

这里实现 deterministic content mirror/compiler 与 Internal Beta 静态 Preview 打包。Payload CMS 的版本化、人工审核 public snapshot 是 canonical 内容事实源；`content/**` 是该 snapshot 的可重建 Markdown/JSON 投影及本地合同 fixture，不是人工或 Agent authoring surface，也不能反向覆盖 CMS。

生产输入必须是通过 snapshot rights/schema 门禁、生成 mirror manifest 并绑定 release receipt 的 immutable mirror。当前命令只验证本地投影和编译合同，不批准 CMS 内容、不写公开镜像、不部署，也不证明 production released。

## 本地命令

要求 Node.js 24 或更高版本；本目录没有第三方运行时依赖。

```bash
node infra/bin/content.mjs validate
node --test infra/tests/*.test.mjs
node infra/bin/content.mjs build
PSEO_INTERNAL_BETA_PREVIEW=1 \
  NEXT_PUBLIC_PREVIEW_GIT_SHA="$(git rev-parse HEAD)" \
  NEXT_PUBLIC_PREVIEW_DIRTY=0 \
  NEXT_PUBLIC_SITE_URL=https://internal-beta.pseo-internal-beta-preview.pages.dev \
  pnpm --dir frontend build
node infra/bin/prepare-preview.mjs
```

前 3 条会验证当前 deterministic mirror fixture，并把静态投影写入 `infra/generated/static/`。最后一条把 `frontend/out/` 与静态内容合并到 `infra/generated/preview-site/`，并强制加上三重 Preview 防索引措施：HTML robots meta、Cloudflare `_headers` 的 `X-Robots-Tag`、以及全站 `Disallow` 的 `robots.txt`。

以上 Preview 构建示例与 CI 一样按 clean checkout 标记 `NEXT_PUBLIC_PREVIEW_DIRTY=0`；若从含未提交修改的本地工作区构建，必须改为 `1`。`NEXT_PUBLIC_SITE_URL` 固定为受 Cloudflare Access 保护的 `internal-beta` branch alias。Preview banner 中的 Git SHA 只标识本次工程构建源码；它不是 CMS content revision、mirror synced 或 production released 的证明。

为了避免误删工作区，生成器只允许把输出写入 `infra/generated/` 或当前操作系统的临时目录。`infra/generated/` 已忽略，不应提交。

## Mirror/compiler 工程门禁

`engineering-projection-gates.yml` 在代码、schema、compiler、workflow 或合同 fixture 的工程 Pull Request 上执行以下阻断检查。它不是逐内容 PR 发布链，且通过检查不会批准 CMS 记录或更新 generated-only public mirror：

- 严格 JSON Schema，未知字段也会失败；
- `surfaces.json` 必须为每个已发布 locale 完整声明 L1–L4，且 taxonomy/Prompt target、slug、locale、kind、path 必须逐项一致；
- immutable ID 与目录、locale 与文件名一致；
- `locales` 表示支持编辑的语言，`publishedLocales` 单独控制当前可发布语言；禁止静默 fallback；
- 每个 locale 的 slug、title 与 SEO 文案不得冲突；
- Prompt 原文、变量和来源跨 locale 不得漂移；
- 源 locale 内容 hash 必须等于 `sourceRevision`，翻译必须明确引用该 hash；
- Markdown Prompt fence、内部链接与 HTTPS 外链必须有效；
- 静态 JSON 索引、RSS、Sitemap 必须可重复生成；
- frontend 与 backend 的质量/构建合同必须通过。

`preview.yml` 只产生可审查的工程静态 Preview artifact，不执行外部部署，也不读取 Cloudflare secret。实际部署前还必须配置 Cloudflare Access；`noindex` 不是访问控制。CMS 草稿预览走受保护、server-only Preview repository，不通过修改 `content/**` 伪造。

## Released mirror 的输出合同

静态内容包含：

- `/{locale}/prompts/index.json`：每个已发布 locale 的 Prompt 列表与显式 `localeVariants`；
- `/{locale}/prompts/rss.xml`：每个已发布 locale 独立的 Prompt RSS；
- `/sitemap.xml`：只包含 ready 内容，并输出相互可访问的 hreflang；
- `/route-manifest.json`：本次发布要求前端提供的具体页面路由；Preview 打包会逐条 fail-closed 校验；
- `/{locale}/taxonomies/index.json`：schema-backed taxonomy 及从当前 Prompt 关系计算的真实 `memberCount/memberIds`，不继承 wireframe 历史统计；
- `/robots.txt`：由发布 surface 决定；当前 internal beta 没有可索引 surface，因此全站禁止抓取；
- `/build-manifest.json`：内容 revision、locale 计数和每个产物的 SHA-256。

构建不访问网络；外链门禁只校验为绝对 HTTPS URL。可用性、来源、rights 和 editorial 事实必须在 CMS snapshot 前完成审核，compiler 不推断或批准这些事实。

完整 removal/takedown snapshot 可以包含 **0 条公开 Prompt**。compiler 不把“至少一条内容”当发布门禁：即使生成树已删除 `content/prompts/**` 和无引用 Prompt taxonomy，仍保留 `site.publishedLocales`，生成 total=0 的 locale 索引与 RSS、空 Sitemap、`Disallow: /` robots，并只保留能解析到公开目标的安全路由。该能力只处理已审核 snapshot 的撤下投影，不赋予本地 fixture 或 Agent 发布权限。

internal beta 的四个 surface 当前全部声明为 `noindex,nofollow`，因此静态 `robots.txt` 也 fail-closed 为全站 `Disallow`，RSS 没有 item，Sitemap 没有 URL。切换到可索引发布必须先升级并审查 surface schema/记录，而不能只改部署配置。
