# Claude 前端 MVP 交接报告

## 1. 概要

| 项 | 值 | 来源 |
| --- | --- | --- |
| 状态 | 已完成，HEAD 无失败门禁 | §7、§12 |
| 日期 | 2026-09-02 | — |
| 前端基线 | `6fb3a2a`（该 commit 下 `frontend/` 不存在） | `git diff --stat 6fb3a2a..HEAD -- frontend` |
| 当前 HEAD | `ade7e79`（*Polish the four-level UI without touching tokens or wireframe structure*） | `git rev-parse --short HEAD` |
| 分支 | **`codex/cms-preview-integration`**（本地仓库，`git remote -v` 为空） | `git branch --show-current` |
| 交付范围 | `frontend/**` + 本文件 | 全局约束 #1 |

> **与任务书的一处差异，如实记录**：交接契约假设分支为 `main`。HEAD 实际在
> `codex/cms-preview-integration` 上——这是并行的 CMS lane 建的分支，前端的 27 个 commit 与
> CMS/content/infra 的 commit 交织在同一条线上（见 §2）。仓库仍无远程。

四层页面与 Blog 均可通过本机静态导出查看（`pnpm build` 后 `serve out`，Playwright 用 `127.0.0.1:43117`）：

- L1 `/zh-CN/prompts` · L2 `/zh-CN/prompts/image` · L3 `/zh-CN/prompts/models/nano-banana-pro`
- L4 `/zh-CN/prompts/country-miniature-stamp-poster` · Blog `/zh-CN/blog`

---

## 2. 改动文件

`git diff --stat 6fb3a2a..HEAD -- frontend` → **201 files changed, 32257 insertions(+), 0 deletions(-)**（基线下该目录为空，全部为新增）。

### 2.1 按目录

| 目录 | 文件数 | 关键文件 |
| --- | --- | --- |
| `src/app/[locale]/**` | 19 | 路由组 `(hub)`/`(gallery)`/`(site)` 三个 `layout.tsx`；`(hub)/prompts/page.tsx`、`(gallery)/prompts/image/page.tsx`、`(site)/prompts/models/[modelSlug]/page.tsx`、`(site)/prompts/[promptSlug]/page.tsx`、`(site)/blog/{page,[slug],category/[slug]}.tsx`、`(site)/page.tsx`（`/zh-CN` 中转页）、`src/app/not-found.tsx` |
| `src/lib/content/**` | 8+1 | `repository.ts`（唯一数据合同）、`index.ts`（factory）、`fixture-repository.ts`、`query.ts`、`types.ts`、`variables.ts`、`creator-handle.ts`、`trending-labels.ts`；**`server.ts` 由并行 agent 在 `873db01` 加入** |
| `src/lib/{seo,i18n,api,format}` | 3+2+3+1 | `seo/site.ts`（canonical/metadata）、`seo/json-ld.tsx`、`seo/breadcrumbs.ts`、`i18n/{config,routes}.ts`、`api/cms-preview-{client,errors,schema}.ts` |
| `src/features/**` | 43 | `prompt/{PromptCard,PromptExplorer,TrendingTabs,ExpandToggle,CopyPromptButton,PromptText,MetricsSnapshotNote}`、`search/{SearchForm,FacetChips,PromptResults,ActiveFilters}`、`hub/{PromptHubBrowse,FeaturedPrompt,AnchorNav,footer-links,hub-copy}`、`gallery/*`、`model/{ModelBrowse,ModelSpecPanels,ModelGenerateControls,ModelCreators,ModelIdentity}`、`prompt-detail/{PromptDetailView,StickyCopyBar,PromptCopyProvider,taxonomy-links}`、`blog/*` |
| `src/components/{ui,layout}` | 11+7 | `layout/{SiteShell,SiteHeader,SiteFooter,MobileNav,BrandMark,nav.ts}`；**`layout/InternalPreviewMarker.tsx` 由并行 agent 在 `873db01` 加入**；`ui/{Card,Button,Chip,Rail,Section,Breadcrumb,MediaFrame,…}` |
| `src/styles/globals.css` | 1 | Bauhaus token 唯一事实源（全局约束 #7） |
| `tests/unit/**` | 46 files / 500 tests | 见 §7 |
| `tests/e2e/**` | 9 spec + `routes.ts` | `journey / filters / copy / not-found / mobile-nav / a11y / responsive / no-js / screenshots` |
| `scripts/` | 2 | `extract-wireframe.mjs`（fixture 生成器）、`check-static-output.mjs`（静态产物真值门禁） |
| 配置 | 8 | `package.json`、`pnpm-lock.yaml`、`pnpm-workspace.yaml`、`next.config.ts`、`tsconfig.json`、`vitest.config.ts`、`playwright.config.ts`、`postcss.config.mjs` |

### 2.2 生成产物（不要手改）

| 路径 | 生成方式 |
| --- | --- |
| `frontend/src/data/wireframe/*.ts`（8 个：prompts / taxonomies / creators / models / collections / articles / snapshot / index） | `pnpm extract:wireframe` 从 `docs/wireframes/flow-proto.html` 解析 |
| `frontend/evidence/fixture-extraction.md` | 同上，与 fixture 同一次运行写出 |
| `frontend/evidence/screenshots/*.png` | `pnpm screenshots`（独立 Playwright project，普通 `test:e2e` 不会覆写） |
| `frontend/evidence/test-run.md` | 人工记录；**已过期**，见 §7 的说明 |
| `frontend/pnpm-lock.yaml` | pnpm |

`frontend/CLAUDE.md` 是本次新增的目录级说明（commit `f91ccd5`），描述结构、层级依赖与落点规则。

### 2.3 边界核验：本次工作是否碰过 `frontend/` 之外

```
$ git diff --stat 6fb3a2a..HEAD -- . ':!frontend' ':!docs/handoffs'
126 files changed, 15613 insertions(+)
```

**这 126 个文件不是本次前端工作的产物。** 它们全部落在 `cms/`、`content/`、`infra/`、`schemas/`、
`scripts/`、`prompt-lab-template/`、`.github/workflows/`、`docs/plans/` 下，来自同一区间内另一条并行
lane（CMS preview / Git-native publishing）的 commit：`1f3243e`、`a863228`、`6ed4f33`、`07cdb74`、
`9d7b38a`、`ec13211`…`873db01` 等。前端 lane 的 commit 是 `c551c9a`…`1e62e0f`、`c9b24ea`、
`cfe2907`、`27f462a`、`43ffb10`、`ade7e79`，改动一律限定在 `frontend/**` 与本文件。

工作区中还有并行 agent 的**未提交**改动，逐条列出（`git status --short`）：

| 状态 | 路径 |
| --- | --- |
| M | `cms/AGENTS.md`、`cms/CLAUDE.md` |
| M | `frontend/AGENTS.md`、`frontend/CLAUDE.md` — 加入根 `AGENTS.md` 继承、Git-first 事实源措辞、§10.1「Agent-native 内容预览边界」，以及 `next dev` 自动写入的 `nextjs-agent-rules` 块。**不是前端 lane 写的** |
| ?? | `.agents/`、`.gitignore`、`AGENTS.md`、`CLAUDE.md`、`assets/`、`backend/`、`content/AGENTS.md`、`content/CLAUDE.md`、`specs/`、`docs/wireframes/`、`docs/pseo-git-native-cms-evidence.md`、`cms/src/app/(payload)/admin/importMap.js`、`cms/tsconfig.tsbuildinfo` |

`docs/wireframes/` 是只读输入（全局约束 #1 禁止修改），未被本次工作触碰。

---

## 3. Fixture 提取数量

来源：`frontend/evidence/fixture-extraction.md`（由 `pnpm extract:wireframe` 生成）。
快照 `observedAt` = **2026-08-20**（原型自己的 `CUT` 表与 footer 日期）；本次运行内容哈希 `e5a3562ea1ad5957`。

### 3.1 每页卡片数

| 页面 | `article.card` 节点 | 去重后 X status id |
| --- | --- | --- |
| L1 | 21 | 21 |
| L2 | 18 | 13 |
| L3 | 14 | 13 |
| L4 | 1 | 1 |
| 合并 | 54 | **35** |

跨页重叠：L1∩L2 = 7、L1∩L3 = 5、L2∩L3 = 6，L4 与三者不相交。合并身份 = X status id。

- 有发布日期：**22 / 35**（L2/L3 卡片不带日期 → `publishedAt: null`，绝不填 0 或猜测，且被排除出所有 trending 窗口）
- 有 `valueScore`：21 / 35 ｜ `highValue`：30 / 35 ｜ 指标被四舍五入而标记 `metricsRounded`：0
- slug 来源：`curated` 1 · `derived` 14 · `wireframe-slug` 20（派生规则逐字复现原型在 L2/L3 发布的全部 20 个 slug）

### 3.2 Taxonomy（共 42 词条，6 条轴）

| 轴 | 词条数 | fixture 内计数 > 0 的词条 |
| --- | --- | --- |
| model | 11 | 9（`sora`、`wan` 为 0） |
| useCase | 8 | 7（`product-marketing` 为 0） |
| technique | 8 | 5 |
| style | 7 | 6 |
| subject | 5 | 4 |
| contentType | 3 | image 23 / video 11 / unknown 1 |

原型声明数（982 / 324 / 136 / 162 / 698…）只保存为 `wireframeDeclaredCount` 等元数据，**不进渲染路径**（全局约束 #3，由 `check:static` 规则 6 机械保证）。

### 3.3 其他实体

| 实体 | 数量 | 备注 |
| --- | --- | --- |
| 创作者 | **21** | 有头像 3、有粉丝数 1 |
| 合集 | **6** | 规则化为可序列化谓词；成员数读时计算，不落库 |
| 有模型页的模型 | **9 / 11** | `ModelDetail` 只为「≥1 条 fixture prompt」的模型生成 |
| Blog 文章 | **3** | 另有 2 个分类 |

### 3.4 排除 / 变形记录

`fixture-extraction.md` §8 给出完整清单（18 条排除 + 13 条系统性变形），要点：

- 排除 5 位原型声明有作品、但四页里没有任何卡片的创作者（`@CHAO2U_AI`/`@Gdgtify`/`@ManuAGI01`/`@PrometheanAIX`/`@Samann_ai`）——收录会渲染出 0 条的空创作者。
- 排除模型 Sora（声明 13）、Wan（声明 11）：无 prompt 点名 → 不生成模型页，taxonomy 计数为 0。
- 排除 L2 未建模的内容类型 tile（`mixed` 84、`unresolved` 91、`网页` 4）与 5 个 `href="#"` 的模型 tile。
- 变形：媒体尺寸原型未提供 → 640×360 占位并标 `dimensionsSource: "assumed"`；L2/L3 英文 alt 统一改为中文；`data-q` 检索串改由 `buildPromptSearchText()` 从**完整** promptText 重建。
- **`PromptVariable.note` 是最终保真度收尾（`27f462a`）新增的字段**：从原型 `.varnote` 逐字取出 golden record 的那句
  `[COUNTRY] 同时驱动地标、动植物、传统服饰、邮票文字、货币面额与邮戳城市 —— 换一个国家即可得到一整套自洽的新画面。`，
  显式排除 `#countryNote`（那是实时状态行）。无 note 的记录回落到按当前文本计数生成的句子。

---

## 4. 路由清单

`pnpm build` 输出 **55 个 HTML**（已对当前 `out/` 直接核验：`find out -name '*.html' | wc -l` → 55）。

| 层 | 路由 | 静态产物 | 数量 |
| --- | --- | --- | --- |
| L1 | `/[locale]/prompts` | `out/zh-CN/prompts.html` | 1 |
| L2 | `/[locale]/prompts/image` | `out/zh-CN/prompts/image.html` | 1 |
| L3 | `/[locale]/prompts/models/[modelSlug]` | `out/zh-CN/prompts/models/{gpt-image,gpt-image-2,higgsfield-soul,kling,nano-banana,nano-banana-2,nano-banana-pro,seedance,veo}.html` | 9 |
| L4 | `/[locale]/prompts/[promptSlug]` | `out/zh-CN/prompts/<slug>.html` | 35 |
| Blog | `/[locale]/blog` | `out/zh-CN/blog.html` | 1 |
| Blog | `/[locale]/blog/[slug]` | `stamp-poster-case-study` / `how-to-replace-prompt-variables` / `sources-and-copyright` | 3 |
| Blog | `/[locale]/blog/category/[slug]` | `guides` / `case-studies` | 2 |
| 中转 | `/[locale]` | `out/zh-CN.html` — 0 秒 `meta refresh` + 真实链接，canonical 指向 L1 | 1 |
| 404 | `not-found` | `out/404.html` + `out/_not-found.html` | 2 |
| | | **合计** | **55** |

### 4.1 本期**不**构建的路由（原型里存在，此处不造假）

`/prompts/video`、`/prompts/use-cases/*`、`/prompts/styles`、`/prompts/creators`、`/prompts/models`（索引页）、RSS、sitemap、robots、`en` locale。

**UI 呈现方式**（交接文档 §5 + 全局约束 #5）：这些目的地一律**不渲染为链接**，而是渲染为带
`（即将推出）`（常量 `COMING_SOON_NOTE`）标注的非链接文本——包括导航里的 `视频 / 模型 / 用例 / 风格 / 创作者`
和 footer `资源` 栏的三项。`Taxonomy.href` 只在本期真实存在页面时非 null。
`check:static` 规则 4 机械保证 `src/` 中 `href="#"` 占位链接为 0（当前 3 个页内锚点为真实锚点）。

---

## 5. Wireframe 1:1 还原

### 5.1 需求与两次审计

2026-09-02 傍晚，Owner 提出新口径：**除视觉 token（色/字/边/影/圆角/动效，`specs/images/0008-bo-pseo-ui.md`）外，一切以 `docs/wireframes/flow-proto.html` 为准**。任何偏离必须引用规则（交接文档 H、`frontend/AGENTS.md` A、`.superpowers/sdd/global-constraints.md` G）。

据此做了两次逐元素审计（两份审计文件都在 `.superpowers/` 下、被 git 忽略，不是交付物，此处只汇报计数）：

| 审计 | 时点 | L1 | L2 | L3 | L4 |
| --- | --- | --- | --- | --- | --- |
| 第一次（Wave A/B 之前） | Major/Moderate/Minor | 2 / 10 / 11 | 2 / 6 / 8 | 1 / 7 / 7 | 2 / 3 / 8 |
| 第二次（Wave B 之后） | Major/Moderate/Minor | 1 / 1 / 5 | 0 / 2 / 3 | 0 / 1 / 4 | 0 / 1 / 2 |

第二次审计里唯一的 Major 是一处构建期回归（L1 热门 tab 标签渲染为空），已在最终收尾中修掉并加了门禁。

### 5.2 三次改动做了什么

**Wave A — `c9b24ea`「共享层对齐原型」**（只动 `src/` 共享层、单测和静态门禁）

- `PromptCard` 拆出**两套卡片解剖**：`hub`（L1：媒体徽标逐字用 fixture 的 `视频 14s`/`图片 ×2`、四轴 chip、无 excerpt、千分位 `2,512 赞`、`复制提示词`·`展开`·`原帖 ↗`）与 `compact`（L2/L3：派生徽标 `PHOTO · ×2`、纯文本 tag、`3.8K 赞`、`热门` 徽标、`复制`·`展开`·`详情 →`）。
- `SiteFooter` 拆出 `full`（L1 五栏：按模型/按任务/镜头与技法/按风格/资源，由 `features/hub/footer-links.ts` 从真实 taxonomy 生成）与 `compact`（其余页面）两种形态；legal 三行逐字，删掉 RSS 那句。
- 导航改为原型的七项站点 nav + `aria-current`，未建项非链接；新增 `features/hub/AnchorNav.tsx` 提供 L1 的页内锚点条（`任务/镜头/模型/风格/合集/创作者` → `#tasks…#creators`）。
- `lib/seo/breadcrumbs.ts` 面包屑构建器（L1 空、L2 两级、L3 中间的 `模型` 为 `path: null` 非链接、L4 三级），同一个数组同时喂给 `<Breadcrumb>` 和 `BreadcrumbList` JSON-LD。
- `PromptQuery` 增加 `collection`，`?collection=<slug>` 由 `PromptExplorer` 识别，摘要变 `合集名 · 共 N 条`；未知 slug 走「已被忽略 + 可移除」而不是「匹配不到」。
- `listTrending(..., modelSlug)`：L3 与 L1 共用同一套排序与补位规则。
- 逐字文案：每页各自的搜索 placeholder、`共 N 条`/`筛选出 N 条`、热门补位句 `该时段收录较少，已补充全部时段热门。`、tab 标签 `全部`、`已复制 ✓`。

**Wave B — `cfe2907`「四层 + Blog 逐页复现原型」**

- 引入路由组 `(hub)` / `(gallery)` / `(site)`，让每页拿到自己的 header/footer chrome（`[locale]/layout.tsx` 退化为 locale 守卫）——这是「L1 五栏 footer、其余 compact」能落地的前提。
- L1–L4 与 Blog 按原型的模块顺序、每模块条数与逐字文案重写：L1 热门恢复 6 条（不再剔除精选）、`FeaturedPrompt` 双栏、`镜头与运动` 的动态成数句、合集 tile 恢复 `副标题 · N 条` 且全部可点；L2 hero 顺序 H1 → lede → statline → 搜索框 → `视频提示词（即将推出）` → `#resultcount` → `按标签浏览`；L3 genbox 回到 hero。
- `ALL_PROMPTS_ID` 移出 client 模块——`check:static` 规则 3 当场抓到 9 个模型页的锚点失效。

**最终保真收尾 — `27f462a`**

- **English taxonomy label + 中文轴标题**：chip / tile / card tag 一律渲染原型的英文 `label`（根因是 `fixture-repository.ts` 三处 `labelZh ?? label`），`labelZh` 只留给原型自己就写中文的表面（L1/L2/L3 的轴标题 `模型/任务/技法/风格`、footer 五栏、L2 `其他类型` tile、L4 kicker）。新增 `facet-label-language.test.tsx`（5 例）把白名单钉死。
- `PromptExplorer` 改成「一个状态容器 + 五个具名插槽」（`ExplorerSearch/Facets/Notices/Summary/Results`），L3 专用的 `ModelPromptExplorer.tsx`（348 行，约 120 行是逐字重复）被删除。
- 逐卡的 `指标观测于 …` 删除，改为区块级 `MetricsSnapshotNote`。
- 新增 `PromptVariable.note`（见 §3.4）。

### 5.3 仍然存在的偏离，及强制它的规则

| 偏离 | 规则 |
| --- | --- |
| 所有数量按 fixture 动态计算（H1 是 `35 条 Higgsfield 提示词` 而非原型的 `982 条`；tile/chip 计数同理） | 交接文档 §1、G#3 |
| `/prompts/video`、`/prompts/use-cases/*`、`/prompts/styles`、`/prompts/creators`、`/prompts/models` 渲染为 `（即将推出）` 非链接文本；footer `资源` 三项同理 | 交接文档 §5、G#5 |
| L3 的 `⚙ 设置` / `🖼 参考图` / `生成` 为 `aria-disabled` + 统一说明 `生成功能尚未接入，本页仅提供 Prompt 复制` | 交接文档 §9、G#12 |
| 不输出 `en` hreflang，`alternates.languages` 只在真实存在时输出（本期为空） | 交接文档 §13、G#4 |
| 无结果时在原型首句之后追加「没有同时满足这些条件的提示词：X、Y」+ 逐条移除 + 清除全部 | G#6（可恢复空态） |
| 卡片上的 observedAt 从逐卡改为区块级一句 | G#4 只要求指标可溯源到快照 |

判断题（无规则强制，是权衡后的选择，逐条说明）：

| 判断 | 说明 |
| --- | --- |
| `?collection=all` 合成合集 | 原型的结尾 CTA `浏览全部提示词` 会把结果区切成「全部提示词 · 共 N 条」。仓库 6 个真实合集里没有 `all`，实现用一个成员=本页全部 id 的合成合集把这个状态写进 URL（H§7）。计数自算、成员真实，`hub-copy.ts` 注释已把 `all` 标为保留 slug。 |
| L4 kicker 显示 `超写实` 而非 `写实风` | `taxonomyLabel()` 优先取中文 alias；`超写实` 本就在该词条的 `aliases` 里（来自 l4.html），不是硬编码。L1 footer 仍写 `写实风提示词`（l1.html:536 原文）。 |
| L3 规格四栏面板（`ModelSpecPanels`）的位置 | 交接文档 §9 的必做项，原型没有完全对应的模块位置，按信息层级放在模型身份之后。 |
| L4 sticky 复制条 `md:hidden` | 用 `position: sticky`（不是 `fixed`）且必须是内容容器的最后一个 in-flow 子节点，桌面宽度下不出现。配合 `scroll-padding-bottom: 6rem` 保证它不遮挡刚获得焦点的控件。 |

---

## 6. 视觉打磨（`ade7e79`）

在**固定的 Bauhaus token** 内做了 3 轮打磨，规则来自 `ui-ux-pro-max` skill（映射见 `.superpowers/sdd/polish-guidance.md`）。

| 轮次 | 主要内容 |
| --- | --- |
| 1 | 导航不再折行：wordmark 与标签 `whitespace-nowrap`，未建项的 `（即将推出）` 落到第二行 `text-xs`，横向 nav 与语言控件从 `md` 推到 **`xl`**、`MobileNav` 改 `xl:hidden`；`Section`/`ModelSection` 间距 `mt-12` → `mt-10 md:mt-14`（移动 40 / 桌面 56）；移动端正文与卡片摘要提到 16px；prompt `<pre>` 固定 14px + `wrap-anywhere`；`GalleryStatline` 数字改 `tabular-nums`；全局 `scroll-padding`、`cursor`/`touch-action`、`text-wrap: balance/pretty`、链接 hover 下划线 |
| 2 | 折叠态 prompt 从 `max-h-40` 改为 **7 行 line-clamp**（此前会把等宽行拦腰切断并吃掉 `<pre>` 的下边框）；`FeaturedPrompt` 全文块 `max-h-65` 内滚动（原型 `.featured .ptext { max-height: 260px }` 本就如此）；把 round 1 的文档级默认值移进 `@layer base`——未分层的 `p { text-wrap: pretty }` 曾静默击穿 `truncate`，让 L4 sticky 条标题折成两行 |
| 3 | 蓝色角标只保留在 `hub` 主层卡片（L2/L3 二十多张 compact 卡上重复会从强调变墙纸，且是 `aria-hidden` 装饰）；`Rail` 列表项 `flex` 让 rail 卡片等高；`SearchForm` 把 `搜索`/`重置` 包成一组，375px 下不再出现落单的 `重置` |

**明确声明**：本轮**没有**改动任何 token 值、任何文案、任何模块顺序或存在性、任何模块条数、任何路由或数据。
改动限定在 `globals.css`、`src/components/{ui,layout}/**` 和 `src/features/**` 的 class name / 布局；
`src/app/**`、`src/lib/**`、`src/data/**` 未被触碰。

可度量的结果：**L1 桌面整页高度 7482px → 6636px**（`evidence/screenshots/l1-desktop.png`，`sips` 实测）。

---

## 7. 测试命令与实际结果

> `frontend/evidence/test-run.md` 记录的是 Task 9 的 run 1 / run 2（336 tests），**已经过期**——它写在 Wave A/B 与打磨之前。下表是当前 HEAD 的真实数字。

| 命令 | 结果 | 本次由谁验证 |
| --- | --- | --- |
| `pnpm lint` | exit 0，无输出 | **本次重跑，clean** |
| `pnpm typecheck` | exit 0，无输出 | **本次重跑，clean** |
| `pnpm test` | **46 files / 500 tests passed**，4.93s | **本次重跑** |
| `pnpm build` | exit 0，**55 static pages** → `out/` | 控制方在 HEAD 跑过；`out/` 现存 55 个 HTML，本次直接点数核验 |
| `pnpm check:static` | **PASSED**，9/9 规则 | 同上；关键计数本次直接对 `out/` 复算（见下） |
| `pnpm test:e2e` | **42 passed / 0 failed / 12 skipped** | 控制方在 HEAD 跑过 |
| axe（含在 e2e 内） | **14 个「页面×视口」组合，全部 0 violation**（统计的是**所有** impact 级别，不只 critical/serious） | 同上 |
| `pnpm screenshots` | 9 passed / 1 skipped（blog 只有桌面） | 同上；PNG 尺寸本次 `sips` 实测 |
| `pnpm extract:wireframe` | 连续两次运行**逐字节幂等**（第二次全部 `unchanged`，含 `evidence/fixture-extraction.md`） | 收尾 wave 记录 |

### 7.1 `check:static` 九条规则

| # | 规则 | 结果 |
| --- | --- | --- |
| 1 | required routes in `out/` | ok — 8 个必需路由文件 + 3 篇 blog 文章页 |
| 2a | forbidden patterns in `out/**/*.html` | ok — 55 个文件里 iframe / srcdoc / location.hash 共 0 处 |
| 2b | forbidden patterns in `src/` | ok — 0 处 |
| 3 | fragment hrefs point at ids in the same document | ok — **70** 个片段链接全部在同文档内解析（本次实测：`#main` ×55、`#all-prompts` ×9、`#tasks/#camera/#models/#styles/#collections/#creators` 各 ×1 = 70） |
| 4 | no `#` placeholder hrefs in `src/` | ok — 0 个占位链接（3 个真实页内锚点） |
| 5 | no `en` hreflang in the export | ok — **本次实测 `out/` 中 hreflang 命中文件数 = 0** |
| 6 | no prototype-declared counts in the export | ok — `982` / `324 条` / `136 条` 共 0 次（扫描前先剥掉 `_next/…` 资源 URL，构建哈希里的数字不会假阳性） |
| 7 | presentation truth and no-JS static HTML | ok — 55 个 HTML 都有日期、无重复 handle、`<h1>` 在 `<main>` 内、无隐藏 Suspense 缓冲 |
| 8 | one canonical host across the export | ok — **本次实测 53 个 canonical，host 唯一且全是 `https://example.invalid`** |
| 9 | no client-module values read as server data | ok — 55 个 HTML 无 `$undefined` prop、无 client-function stub（这条是为第二次审计的 Major 回归加的） |

### 7.2 横向溢出与 e2e 跳过

- `responsive.spec.ts` 在 **320 / 375 / 768 / 1024 / 1440** 五档验证 L1–L4 `documentElement.scrollWidth <= clientWidth`。打磨轮另外手工测了 1280 / 1366 / 1600。
- 12 个 skip 是 **project 维度的刻意作用域**，不是静默漏洞：`filters.spec.ts`（5 例）只在 desktop 跑、`mobile-nav.spec.ts`（3 例）只在 mobile 跑、`responsive.spec.ts`（4 例）自己驱动视口宽度所以只跑一遍。5 + 3 + 4 = 12。

---

## 8. 证据可信度事故（必须记录）

**发生了什么。** Wave B 之后的一轮 `pnpm test:e2e` 与 `pnpm screenshots` 全绿——但它测的不是这个仓库。
端口 3100 上有一个别的 lane 在 21:22 起的遗留 `serve` 进程，服务的是 `infra/generated/preview-site`
（另一条 CMS 预览链路的产物），而不是 `frontend/out/`。

**根因。** `playwright.config.ts` 用 `reuseExistingServer: !CI` + 一个共享端口 3100。Playwright 直接
attach 到那个已经在监听的进程上，于是整套 e2e 和截图都跑在一个**与本仓库无关**的站点上。第二次审计正是
从「截图里还留着 Wave B 已删除的面包屑，而 `out/` 里 `搜索与筛选` 命中 0 次」这个矛盾里把它揪出来的。

**修复。** commit `43ffb10` — 专用端口 **43117**、`reuseExistingServer: false`、显式绑定
`127.0.0.1`。配置文件里留了注释说明为什么永不复用。

**代价：两个真实缺陷被这层假绿灯掩盖了。** kill 掉旧 server 重跑后立刻 15 red：

1. **768px 处 header 横向溢出 24px**——品牌 + 八个导航项 + 语言块比视口宽，四个页面都会横向滚动，违反 `frontend/CLAUDE.md §7`。修法是把 `更多语言尚未发布` 在 `lg` 以下改 `sr-only`（`aria-describedby` 仍指向它）。这个缺陷在旧 `out/` 上一直存在。
2. **11 个 spec 的断言还停在 Wave A 之前的文案**（`找到 N 条提示词`、`已复制到剪贴板`、`图片提示词`、旧的 genbox 选择器…）。旧 server 让它们一直是绿的。

**§7 的所有数字都来自这次修复之后的运行。**

---

## 9. 截图

`frontend/evidence/screenshots/`，`pnpm screenshots` 以 `scale: "css"` 抓取（所以 PNG 宽度就是 CSS 像素）。
下表尺寸为本次 `sips -g pixelWidth -g pixelHeight` 实测；文件 mtime 23:38，晚于最终构建。

| 文件 | 尺寸 (px) | 字节 | 说明 |
| --- | --- | --- | --- |
| `l1-desktop.png` | 1440 × **6636** | 1.2M | 必需；打磨前为 7482 |
| `l1-mobile.png` | 375 × 14843 | 1017K | 必需 |
| `l2-desktop.png` | 1440 × 6957 | 1.8M | 必需 |
| `l2-mobile.png` | 375 × 8621 | 810K | 必需 |
| `l3-desktop.png` | 1440 × 8193 | 2.5M | 必需 |
| `l3-mobile.png` | 375 × 17071 | 2.3M | 必需；宽度正好 375，无横向溢出 |
| `l4-desktop.png` | 1440 × 3541 | 622K | 必需 |
| `l4-mobile.png` | 375 × 5580 | 430K | 必需 |
| `blog-desktop.png` | 1440 × 1929 | 194K | 额外 |
| `finding-1-l1-no-js.png` | 1440 × 1200 | 42K | **历史证据**，mtime 20:53：Task 9 Finding 1（无 JS 只剩骨架）修复**前**的画面，不是当前状态 |

前 9 张都是最终构建之后重新生成的，并逐张用 Read 工具核对过与当前 `out/` 一致：L1 无面包屑、六项锚点条、热门三个 tab 标签可见、chip 全英文、footer 五栏；L2 hero 顺序正确、`按标签浏览` 可见；L3 genbox 三键带 emoji；L4 kicker 五枚、varnote 逐字。

---

## 10. 已知缺口

| # | 缺口 | 细节 |
| --- | --- | --- |
| 1 | `en` 未发布 | `SUPPORTED_LOCALES = ["zh-CN"]`；不输出任何 `en` hreflang（`check:static` 规则 5 = 0），`alternates.languages` 为空 |
| 2 | RSS / sitemap / robots 未构建 | `src/app/` 下无对应文件，本期不做 |
| 3 | canonical host 是兜底值 | `FALLBACK_SITE_URL = "https://example.invalid"`；构建时不设 `NEXT_PUBLIC_SITE_URL` 就会把它写进全部 53 个 canonical。正式域名构建必须设置真实值 |
| 4 | 模型「官方资料」是派生的 | `ModelDetail` 的 summary / capabilities / inputs / outputs 全部由 fixture 的 prompt 聚合而来并如此标注；`officialUrl` 在类型上就是字面量 `null`，从不复制原型的 157/68/136 数字 |
| 5 | X 媒体外链热链 | `MediaFrame` 用 `referrerPolicy="no-referrer"` + 失败回落占位；稳定性与授权需在正式上线前处理 |
| 6 | trending 窗口稀疏 | 只有 **22 / 35** 条有发布日期，其余 `publishedAt: null` 被排除出 7d/30d 窗口，所以短窗口经常触发补位句 |
| 7 | 跨页模型标签取并集 | 原型在不同页面给同一 X status id 打不同模型标签（如 `2008952931484098637` 在 L1 是 Nano Banana、L2/L3 是 Nano Banana Pro）。按「跨页并集」规则，**13 / 35** 条 prompt 带 2 个以上模型 slug，会同时出现在多个模型页 |
| 8 | 无 route 级 `loading.tsx` | 静态导出没有请求期加载，`loading.tsx` 只会让无 JS 的读者永远看到骨架屏——7 个都已删除（`error.tsx` 全部保留），客户端筛选区自己有 no-results/empty 态 |
| 9 | 正则规则的合集是非链接 tile | 已改为可点（`?collection=template-prompts`）；但该合集的谓词与 `extractVariables()` 共用 token 规则、与原型的正则**不完全一致**（覆盖 `[SHOT 2]`、`[CTA-TEXT]`），差异见 `fixture-extraction.md` |
| 10 | `contentType` 没有查询轴 | `QUERY_FACET_KEYS = ["model","useCase","technique","style","subject"]`，图片/视频只能靠 L2 路由区分，不能作为筛选条件 |
| 11 | 客户端筛选把整个 `PromptSummary[]` 留在内存 | `PromptExplorer` 对全量数组做 `applyPromptQuery` + `recountFacets`。35 条没问题，目录级规模（982+）必须下沉到服务端 |
| 12 | Blog 是 fixture 内容 | 3 篇文章署名统一为 `站点编辑（fixture）`，`url: null`，页面上明确标注 |
| 13 | 生成控件全部禁用 | `⚙ 设置` / `🖼 参考图` / `生成` 为 `aria-disabled` + `生成功能尚未接入，本页仅提供 Prompt 复制` |
| 14 | **未测量项** | Lighthouse ≥ 90、200% 缩放均**未测**。键盘可达性只由自动化 spec（`journey`/`filters`/`mobile-nav`/`copy` + axe）覆盖，**没有做人工键盘走查**。Playwright 只装了 Chromium，无 Firefox/WebKit/真机 |

---

## 11. Codex 接 API 时需要替换的 adapter

### 11.1 替换点（只有两处）

| 位置 | 动作 |
| --- | --- |
| `src/lib/content/index.ts` | 唯一的 factory：`getContentRepository()` 现在返回 `getFixtureContentRepository()`。改这一个函数即可切源 |
| `src/lib/content/api-repository.ts`（新增） | 实现 `ContentRepository`（`src/lib/content/repository.ts`）。全部方法返回 Promise，调用点无需改动 |
| `src/lib/api/`（已存在 `cms-preview-{client,errors,schema}.ts`） | 按根 `AGENTS.md` §5 放 typed client；沿用这里已有的 schema 校验风格 |

`ContentRepository` 的方法（全部按 locale 取数）：

`getSnapshot` ｜ `listPrompts(locale, query?)` ｜ `getPromptBySlug` ｜ `listFeatured(locale, "l1"|"l2")` ｜
`listTrending(locale, window, limit, modelSlug?)` ｜ `listTaxonomies(locale, axis)` ｜ `getModel` ｜
`listModelPrompts` ｜ `listPromptsWithVariables` ｜ `listCollections` ｜ `listCreators` ｜ `getRelated` ｜
`listArticles(locale, categorySlug?)` ｜ `getArticle` ｜ `listArticleCategories` ｜ `getArticleCategory`

### 11.2 不需要动的部分

`src/app/**` 全部页面、`src/features/**`、`src/components/**`、`src/lib/i18n/routes.ts` 的 typed route builder、
`src/lib/seo/**`（metadata / canonical / JSON-LD / breadcrumbs）。页面从不直接 import `src/data/wireframe/*`（全局约束 #3）。

### 11.3 **会**需要适配的部分（如实列出）

| 项 | 为什么 |
| --- | --- |
| `PromptExplorer` 的内存筛选 | 见 §10 #11。目录级规模下搜索/筛选/排序/分页必须下沉，`PromptExplorer` 要改成读服务端返回的结果与 facet 计数 |
| fixture repository 里预计算的东西 | trending 排名与补位、`getRelated` 的相关分组、facet 重算、合集成员、`ModelDetail` 的 summary/capabilities/inputs/outputs 全部在 `fixture-repository.ts` 内推导。API 要么提供等价端点，要么 adapter 自己承担 |
| `generateStaticParams` 假设全集在构建期可枚举 | 35 条 prompt / 9 个模型页现在是构建期展开的。982+ 条时需要 ISR、分页或按需构建策略 |
| 字面量类型 | `Snapshot.observedAt: "2026-08-20"`（字面量）、`isFixture: true`（两处）、`ModelDetail.officialUrl: null`——接 API 时这三处必须放宽为一般类型 |
| payload 体积 | `PromptSummary.searchText`（title + **完整** promptText + handle + taxonomy 标签）与 `promptText` 本身会被序列化进静态 HTML。服务端筛选之后 `searchText` 应当不再下发 |
| `wireframeDeclared*` 元数据 | `wireframeDeclaredCount` / `wireframeDeclaredPromptCount` / `…Likes` / `…Bookmarks` / `…HotCount` 只是原型溯源用，接真数据后可整体删除 |

### 11.4 与并行 lane 的交接

并行 agent 已经在 `frontend/` 内落了两样东西（commit `873db01`，写本文时其配套的 `frontend/AGENTS.md` / `CLAUDE.md` 改动仍未提交）：

- `src/lib/content/server.ts` — `createServerContentContext()` / `getServerContentRepository()`，
  给 CMS Preview 提供 server-only 的草稿投影入口；`(site)/prompts/models/[modelSlug]/page.tsx` 已经改用它。
- `src/components/layout/InternalPreviewMarker.tsx` — Preview 标识。

**Codex 必须与这条路径对账**：fixture / CMS Preview / production 三种 provider 应当共用同一个
`ContentRepository` 合同，`api-repository.ts` 要接进 `server.ts` 已经建立的选择逻辑，而不是在
`index.ts` 里另开一条分支。

---

## 12. 未通过的门禁

**HEAD (`ade7e79`) 上没有失败的门禁。** `lint` / `typecheck` / `test`（500）本次重跑为绿；
`build`（55 页）/ `check:static`（9/9）/ `test:e2e`（42 passed / 12 project-scoped skips）/ axe（14×0 violation）/
`screenshots`（9 passed / 1 skip）由控制方在 HEAD 跑过，`out/` 与 `evidence/screenshots/` 的产物本次已直接核验。

**没有跑、以及原因：**

| 未跑 | 原因 |
| --- | --- |
| 本报告作者未重跑 `pnpm build` / `test:e2e` / `screenshots` | 任务明确禁止——它们会重写 `out/` 与已提交的 PNG 证据。改为直接核验既有产物（HTML 计数、canonical、hreflang、片段锚点、PNG 尺寸） |
| Lighthouse / Core Web Vitals | 本期未测量，见 §10 #14 |
| 200% 浏览器缩放 | 未测量 |
| 人工键盘走查 | 只有自动化 spec 覆盖 |
| Firefox / WebKit / 真机 | 只安装了 Chromium |
| 远程预览部署 | 仓库无远程；Cloudflare 预览属于另一条 lane，不在本报告范围 |

---

*本报告只描述 `frontend/` 的 MVP 与 wireframe 保真工作。`backend/`、`cms/`、`content/`、`infra/`、`specs/`
和根 `AGENTS.md` 的改动属于同一时间窗内的另一条并行 lane，已在 §2.3 逐条标明，未擅自归属给本次工作。*
