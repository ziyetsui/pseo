# SEO 代码审查：公开构建与视觉样本边界

日期：2026-09-04。审查对象是 Next.js 静态导出的 Prompt Library（L1–L4、Blog），目标为 Prompt 检索与阅读，支持 en / zh-CN 路由。本报告负责源码中的 metadata、canonical、hreflang、robots、sitemap、JSON-LD 和原型路由边界；不评价营销关键词排名，不修改应用代码。

本轮读取当前源码，并在内存中用 TypeScript 转译后实际调用 `siteMetadata` / `publicDataConfig` 做合成输入复现。未启动浏览器，未跑 build / e2e / Lighthouse / squirrel，不把历史验收当成本轮结果，也未读取生产部署配置或 Search Console。下列问题区分“代码已确定的行为”与“需要相应公开内容/配置才会触发的影响”。

采用 `seo-codebase-audit` 的证据、影响、修复和自我复核流程；亦阅读用户指定的 seo-audit、seo-audit-full、audit-website。此报告是主任务分派的代码审查分项，不冒充完整 URL 扫描或 PageSpeed Full Audit。报告路径遵守本轮明确的文件所有权。

## 需要处理的发现

### F1 · 高优先级：文档中的 public 构建命令允许生成全站禁止抓取的 robots.txt

**证据：** [README.md:22](/Users/ziye/Desktop/pseo/frontend/README.md:22) 的公共构建命令设置模式、API、revision、static directory，未设置 `FRONTEND_SITE_URL`。[config.ts:10](/Users/ziye/Desktop/pseo/frontend/src/lib/catalog/config.ts:10) 的 `publicDataConfig` 也只要求 API URL 和 revision。[robots.ts:6](/Users/ziye/Desktop/pseo/frontend/src/app/robots.ts:6) 在缺少 SITE_URL 时，无论是否 public-api 都返回 `Disallow: /`。这不是根据 CMS 当前内容是否准许索引作出的决定。编译器 robots 没有补救： [finalize-export.mjs:50](/Users/ziye/Desktop/pseo/frontend/scripts/finalize-export.mjs:50) 只复制 sitemap/RSS，未复制 compiler robots。

本轮实测：向 `publicDataConfig` 提供有效格式的 API URL 与 revision、不给 SITE_URL，函数成功返回，没有拒绝该构建配置。robots 分支由上述源码直接确定。未宣称当前用户服务器或线上站点正在使用这种配置。

**影响：** 按 README 在干净环境执行 public 构建，最终 robots 会阻止抓取已允许公开索引的内容；即使 Prompt 的 meta 为 index、sitemap 已列 URL，仍不能按预期抓取。Google 也明确说明，爬虫需要能访问页面才能读取页面级 robots 指令。[Google robots 文档](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag)

**建议：** 把“可发布公开站点”的 canonical origin 纳入显式构建校验，并与已验证 snapshot 的 canonical origin 对齐；缺失或不一致时终止公开发布构建，不将其静默当作一个成功的 SEO 产物。继续保留 visual-fixture 的 noindex/禁止抓取。同步 README 的 public 命令。若仍需要隔离的 public-api 本地构建，应显式区分验收与发布意图，不能以省略 SITE_URL 作为隐式开关。

适用范围：**公开发布配置门禁缺口**；本地 visual-fixture 禁止索引是正确行为。

### F2 · 中优先级：Prompt 的 API hreflang 被丢弃，改由另一个 origin 重建

**证据：** 后端生成类型 [generated.ts:45](/Users/ziye/Desktop/pseo/frontend/src/lib/api/generated.ts:45) 的 `SeoSchema` 已含完整 `hreflang`。[public.ts:33](/Users/ziye/Desktop/pseo/frontend/src/lib/catalog/public.ts:33) 把 `detail.seo` 赋给 Prompt，但 UI [types.ts:78](/Users/ziye/Desktop/pseo/frontend/src/lib/catalog/types.ts:78) 没有声明该字段。[metadata.ts:15](/Users/ziye/Desktop/pseo/frontend/src/site/metadata.ts:15) 只采用 entity 的 `seo.hreflang`；Prompt 则从 `localeVariants` 和 `FRONTEND_SITE_URL` 重新生成。

本轮合成有效 SEO 输入的实际输出：

| 输入条件 | canonical 输出 | languages 输出 |
| --- | --- | --- |
| API 提供 canonical 和 en/zh-CN/x-default hreflang；SITE_URL 未配置 | 保留 `https://canonical.example/en/prompts/example` | `undefined` |
| 同一 API；SITE_URL=`https://deployment.example` | 仍为 canonical.example | en/zh-CN 改成 deployment.example，API 的 x-default 丢失 |

例子使用保留域名 `.example`，不代表真实生产主机。即使当前配置恰好相同，这段实现仍没有忠实投影已提供的 SEO 合同。

**影响：** 相同 canonical 内容在不同构建 origin 下会输出不同的语言关系；缺 SITE_URL 时则失去 HTML 中已知的语言关系。Google 要求语言变体采用完整 URL，并互相回链；不能把它们重定向到另一套未经资格验证的主机。[Google 多语言文档](https://developers.google.com/search/docs/specialty/international/localized-versions)

**建议：** 为 `Prompt.seo` 显式保留 `hreflang: Record<string,string>`，由 public mapper消费同一 DTO；fixture 给空集合。metadata 优先采用同一 `seo` 对象的 canonical 和 hreflang，例如在类型补齐后使用：

```ts
alternates: {
  canonical: visual ? undefined : canonical,
  languages: visual ? undefined : seo?.hreflang,
}
```

不需要凭空添加 x-default；只保留事实源确实提供的键。若为无 SEO 合同的导航页生成 fallback，必须从已验证的站点 origin 和已公开的 locale 路由取得，不能猜测缺失翻译。

适用范围：**生产 Prompt metadata 映射缺陷**；视觉样本不输出 hreflang/canonical 是主动隔离。

### F3 · 中优先级：列表页 metadata 与 compiler sitemap 的索引资格来源不一致

**证据：** [页面 generateMetadata:40](/Users/ziye/Desktop/pseo/frontend/src/app/[locale]/[[...path]]/page.tsx:40) 的 Blog SEO 分支只匹配 `/blog/`，不匹配 `/blog` 列表；[同文件:47](/Users/ziye/Desktop/pseo/frontend/src/app/[locale]/[[...path]]/page.tsx:47) 让 Blog 列表和 L1 都落入无 entity/Prompt SEO 的通用 metadata。[metadata.ts:12](/Users/ziye/Desktop/pseo/frontend/src/site/metadata.ts:12) 因 `seo` 缺失固定输出 `index:false`。Blog 列表甚至使用通用 `The library` 标题，而可见标题是 notebook。

但 compiler [content-pipeline.mjs:1707](/Users/ziye/Desktop/pseo/infra/lib/content-pipeline.mjs:1707) 在 L1 surface 被批准为 index 时把 L1 加入 sitemap；[同文件:1743](/Users/ziye/Desktop/pseo/infra/lib/content-pipeline.mjs:1743) 在该 locale 有可索引文章时把 Blog 列表加入 sitemap。最终 [finalize-export.mjs:54](/Users/ziye/Desktop/pseo/frontend/scripts/finalize-export.mjs:54) 只检查对应 HTML 存在，不比较其 robots/canonical，就用该 sitemap 覆盖 Next 生成版本。

本轮实测：合成 `public-api` catalog 的 `/en/blog` metadata 为 `robots:{index:false,follow:true}`，title=`The library · Prompt Library`。该行为不随文章是否存在或 L1 surface 资格变化。没有声称当前 snapshot 已含文章或已批准 L1 索引；这两种资格出现时，冲突是确定的。

**影响：** 一旦 snapshot 已批准相应列表页，sitemap 请求收录它，而 HTML 仍明确要求不收录。应只在 sitemap列希望进入搜索的 canonical URL，并保持页面指令一致。[Google sitemap 文档](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)

**建议：** 在当前没有资格数据时继续保持 noindex；补齐从同一已验证 snapshot 读取页面级 SEO 资格的桥接，而不是把所有列表改成 index。为 Blog 列表生成专属 metadata。导出检查应逐项比较 sitemap `<loc>`、页面 canonical、robots 和可到达路径，明确拒绝 sitemap 指向 noindex 的产物。后端 [HomeDataSchema:272](/Users/ziye/Desktop/pseo/backend/src/pseo/api/schemas.py:272) 当前没有 surface SEO 字段，因此不能臆造 `home.seo`；需要正式扩展合同或消费已有受校验的静态 surface 记录。

适用范围：**公开资格到前端输出的接线缺口**；当前无内容或未通过资格的列表保持 noindex 不算缺陷。

## 已核对的边界，不列为 SEO 缺陷

| 范围 | 当前代码行为与证据 | 本次结论 |
| --- | --- | --- |
| visual-fixture | [metadata.ts:12](/Users/ziye/Desktop/pseo/frontend/src/site/metadata.ts:12) 固定 noindex/nofollow；[sitemap.ts:6](/Users/ziye/Desktop/pseo/frontend/src/app/sitemap.ts:6) 返回空；[finalize-export.mjs:10](/Users/ziye/Desktop/pseo/frontend/scripts/finalize-export.mjs:10) 写 noindex 响应规则与禁止抓取 | 主动隔离，不建议解除来提高本地 SEO 评分；是否真正鉴权/应用headers需部署实测 |
| public Prompt | [public.ts:33](/Users/ziye/Desktop/pseo/frontend/src/lib/catalog/public.ts:33) 使用后端 SEO；[metadata.ts:7](/Users/ziye/Desktop/pseo/frontend/src/site/metadata.ts:7) 保留提供的 canonical；[sitemap.ts:7](/Users/ziye/Desktop/pseo/frontend/src/app/sitemap.ts:7) 只收录 index Prompt | 不从 fixture 推断 public 或 index 资格；canonical 本身未发现被无条件重写 |
| 模型系列页 | [model-families.ts:35](/Users/ziye/Desktop/pseo/frontend/src/lib/catalog/model-families.ts:35) 合并系列不复制成员SEO，通用metadata默认noindex | 符合系列投影尚未获独立索引资格的决定，不误报为生产阻断 |
| `/proto/model-hero` | [原型 page.tsx:20](/Users/ziye/Desktop/pseo/frontend/src/app/(entry)/proto/model-hero/page.tsx:20) 显式noindex；[同文件:37](/Users/ziye/Desktop/pseo/frontend/src/app/(entry)/proto/model-hero/page.tsx:37) production只返回Not available，不读取catalog和真实原型界面 | 没有发现默认可索引泄漏；仍保留一个生产占位页面，并非真正移除路由。HTTP状态没有在此子任务实测，不报告404已通过 |
| JSON-LD | [StructuredData.tsx:5](/Users/ziye/Desktop/pseo/frontend/src/components/StructuredData.tsx:5) 只在public输出；以CreativeWork描述Prompt、Article描述文章，数据取实际字段；[同文件:16](/Users/ziye/Desktop/pseo/frontend/src/components/StructuredData.tsx:16) 转义`<` | 未发现本轮可证明的虚构类型或资格提升。UI名为Recipe不意味着应使用食谱Recipe schema；不因缺Organization/logo等未知事实要求编造 |
| locale | [locale layout:12](/Users/ziye/Desktop/pseo/frontend/src/app/[locale]/layout.tsx:12) html为路径locale、body标注固定英文UI；Prompt/Article分别保留源语言范围 | 不把`/en`前缀或BCP47合法语言码本身当作SEO错误；真正的hreflang问题见F2 |
| 404与未知路径 | [catch-all:19](/Users/ziye/Desktop/pseo/frontend/src/app/[locale]/[[...path]]/page.tsx:19) 禁止未生成动态参数，缺项调用notFound；[global-not-found:8](/Users/ziye/Desktop/pseo/frontend/src/app/global-not-found.tsx:8) 固定noindex | 源码有真实404机制；部署端HTTP行为交主任务本轮扫描核验 |

## 本轮证据摘要与限制

实际执行的检查：当前源码和合同阅读；TypeScript内存转译后的public配置缺失值复现、Prompt canonical/hreflang双origin复现、Blog列表metadata复现、fixture robots复现。没有复用旧报告的测试通过数或 Lighthouse 分数。合成输入用于证明分支，不是 CMS public内容。

本报告未给网站总分、当前收录率、富结果通过结论、流量损失估算；这些需要运行环境、搜索平台或媒体实际数据。Noindex与robots阻止抓取也不等于访问鉴权，不能据此声称视觉样本已经私有。除了本文件，未修改应用或其他Agent的报告。
