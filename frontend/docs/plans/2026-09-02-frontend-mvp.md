# Frontend MVP 实施计划（wireframe fixture → Next.js static export）

Date: 2026-09-02
Source of truth: docs/handoffs/claude-frontend-mvp.md（交接书）、frontend/AGENTS.md、specs/0008-prd.md、specs/0009-pseo-tech-arch.md、specs/images/0008-bo-pseo-ui.md、docs/wireframes/flow-proto.html

## Global Constraints（所有任务都必须遵守）

1. 只允许修改 `frontend/**` 与 `docs/handoffs/claude-frontend-mvp-result.md`。禁止修改 backend/、cms/、specs/、assets/raw/、docs/wireframes/、任何现有 AGENTS.md。不要初始化远程 Git、不要建 GitHub repo、不要部署。
2. 技术基线：Next.js 16 App Router、`output: "export"`、TypeScript strict（**固定 typescript ^5.9，不用 7.x**）、Tailwind CSS 4 + CSS variables、pnpm、React Server Component 默认、Vitest + Testing Library、Playwright + @axe-core/playwright。不引入状态库。不在组件里散落 fetch。生产代码中 iframe / srcdoc / hash 路由数量必须为 0。
3. 数据边界：页面只调用 `ContentRepository`（`src/lib/content/repository.ts`），不直接 import `src/data/wireframe/*` 大 fixture。所有展示数量从 fixture 动态计算；禁止把 982 / 324 / 136 / 162 等原型声明数字渲染成“已实现数量”。
4. 数据诚实：fixture 页面只发布 `zh-CN`；不输出 en hreflang、不声称 en 已发布；`alternates.languages` 只在真实存在时输出（本阶段为空）。互动数字必须带 `observedAt`（快照 2026-08-20）。缺失值用 null + 说明，不填 0。
5. 路由必须实现：`/zh-CN/prompts`、`/zh-CN/prompts/image`、`/zh-CN/prompts/models/nano-banana-pro`、`/zh-CN/prompts/[promptSlug]`、`/zh-CN/blog`、`/zh-CN/blog/[slug]`、`/zh-CN/blog/category/[slug]`、`/not-found`（404）。所有内部链接必须是真实 href（由 `src/lib/i18n/routes.ts` 的 typed route builder 生成），`#` 假链接数量为 0。原型中指向本阶段不存在页面的链接（/prompts/video、/prompts/use-cases/*、/prompts/styles、/prompts/creators、/prompts/models 列表）一律不渲染为链接，或渲染为带“即将推出”说明的非链接文本。
6. 筛选规则：同轴 OR；跨轴 AND；q 与 facets AND；状态写入 URL query（`q`、`model`、`useCase`、`technique`、`style`、`subject`、`window`），刷新和前进后退不丢；count 从当前 fixture 计算；无结果时解释已选条件、可逐个移除、可重置。未知 query 参数显示可恢复提示，不静默忽略。
7. UI token（唯一来源 `src/styles/globals.css` 的 CSS variables，映射进 Tailwind `@theme`）：canvas `#F0F0F0`、foreground/border `#121212`、red `#D02020`、blue `#1040C0`、yellow `#F0C020`、muted `#E0E0E0`、white `#FFFFFF`。字体 Outfit（`next/font/google`，display swap，含 PingFang SC 等中文回退），Prompt 正文等宽字体。边框 2px（移动）/ 4px（桌面主元素）黑边；阴影只用无模糊硬偏移（3/4/6/8px）；圆角只用 0 或 9999px；动效 200–300ms ease-out；尊重 `prefers-reduced-motion`。保持内容密度，不要做成 Pricing/Testimonials/FAQ 的 SaaS landing page。JSX 中不散落 hex 与任意阴影。
8. 无障碍：semantic header/nav/main/footer；skip-to-content；每页唯一 H1、heading level 连续；focus-visible；触控目标 ≥ 44×44；键盘可完成搜索、筛选、rail、copy、导航；aria-live 宣告 copy 与筛选结果；320/375/768/1024/1440 无页面级横向溢出；图片有 width/height/alt/fallback，静态导出用 `images.unoptimized: true`。图标按钮有可访问名称。
9. Copy：clipboard 成功后才显示“已复制”；失败显示“复制失败，可选中文本手动复制”并选中文本；失败时绝不显示成功。变量替换按实际 token 出现次数计算，不硬编码“7 处”。
10. 每个数据区域有 loading、empty、no-results、error、retry 状态（route 级 `loading.tsx` / `error.tsx`，客户端筛选区域有 no-results/empty）。
11. SEO：每个真实页面 title、description、canonical（`NEXT_PUBLIC_SITE_URL`，默认 `https://example.invalid` 并在 result 报告注明）、`lang="zh-CN"`、BreadcrumbList JSON-LD、与可见内容一致的 CollectionPage/ItemList（L1/L2/L3）、CreativeWork（L4）、Article（Blog）。关闭 JS 后仍有 H1、正文、主要链接（首屏列表必须由 RSC 渲染）。
12. 原型中无行为的“设置 / 参考图 / 生成”按钮必须隐藏或显示为 disabled + 明确文字说明（例如“生成功能尚未接入”），不能伪装可用。
13. 每个任务：测试先行（TDD），完成后运行 `pnpm lint && pnpm typecheck && pnpm test`；涉及路由的任务再跑 `pnpm build`。commit message 用英文，说明数据来源与验证证据。

## 参考：wireframe 数据盘点（来自 docs/wireframes/flow-proto.html 的 PAGES 对象）

- 原型 HTML 用 `const PAGES={l1:"...",l2:"...",l3:"...",l4:"..."}` 嵌入四页（字符串内含 `\"` `\n` `<\/` 转义）。解析方式：截取 `<script>` 内 `const PAGES=` 到 `\n};` 的声明，用 `new Function` 求值得到四个 HTML 字符串。
- L1（135KB）：`<template id="allcards">` 里 21 张 `article.card`，属性 `data-id`（X status id）、`data-models`/`data-use_cases`/`data-techniques`/`data-styles`（`|` 分隔）、`data-date`、`data-vs`（value score）、`data-hv`（high-value 0/1）、`data-q`（搜索索引）；子节点 `.ph img`（媒体 src/alt）、`.mb`（媒体标签，如“视频 14s”“图片 ×2”）、`h3`（标题）、`pre.ptext`（Prompt 全文）、`.cardmeta`（作者 handle+链接、日期、赞、藏）、`a.src`（原帖 URL）。Featured 卡 id `2071174186978951379`（`#featprompt`）。JS 内 `COLS` 定义 6 个合集（名称、副标题、谓词）。`CUT={"7":"2026-08-13","30":"2026-07-21"}` 说明快照日 2026-08-20。`.feature` tiles 列出 use_cases 8 / techniques 7 / models 8 / styles N 个 taxonomy（含全库声明数量，仅作元数据）。`.creators` 7 位创作者（handle、条数、赞、藏）。Footer 列表。
- L2（100KB）：hero（`324 条` 等声明数字，仅元数据）；facets `button.chip[data-facet=use_case|style|subject][data-value]`（含全库声明 count）；18 张 `article.card[data-tags="|model:X|use_case:Y|style:Z|subject:W|technique:V|"]`，子节点 `.media img`、`.mb`、`h3`、`pre.prompt#pN`、`.tags`、`.meta`（handle、赞、藏、`.hv`、原帖 URL）、`.acts a[href^="/prompts/"]`（detail slug）。模型 tiles（slug: nano-banana-pro/higgsfield-soul/gpt-image-2 有 href，其他为 `#`）。Rails：精选、按模型（Nano Banana Pro / Higgsfield Soul / GPT Image 2）、Person / portrait。其他类型 tiles、相关链接、CTA。
- L3（75KB）：hero（Nano Banana Pro；`136 条 · 46 条热门 · 47 位创作者 · 收录 2025-11-20 至 2026-08-16` 声明数字）；genbox 有“设置 / 参考图 / 生成”无行为按钮；近期热门 grid；全部提示词 + facets（use_case/style/subject）；带变量的提示词 rail（3 条）；创作者 inline-list（6 位，含头像 URL 与条数）；关于这个模型（3 段文案）；相关；CTA。14 张卡与 L2 结构相同。
- L4（21KB）：单条 Prompt `国家主题微缩邮票海报`（id `2063814043631280180`，作者 @Naiknelofar788，2026-06-08，GPT Image 2，chips：Prompt / GPT Image 2 / Higgsfield / 微缩摄影 / 超写实）；4 张媒体；Prompt 全文含 `[COUNTRY]` 变量（原型文案称 7 处，必须由 parser 数）；4 个使用步骤；国家选项 Japan/France/Egypt/Brazil/India/Mexico；同系列 6 张（待生成）；来源（粉丝 34,683、平台 X、原帖 URL）；互动数据（浏览 7,318、赞 185、藏 122、转发 20、评论 44、引用 2）；相关（同模型/同用途/同创作者）；底部固定 CTA。
- 去重：四页合计 35 个唯一 X status id；同一 Prompt 出现在多页时合并为一条记录，并记录 `appearsOn: ("l1"|"l2"|"l3"|"l4")[]`。
- 模型 slug 规则：kebab-case（`Nano Banana Pro` → `nano-banana-pro`，`GPT Image 2` → `gpt-image-2`）。Prompt slug：L2/L3 卡片已给出 `/prompts/<slug>` 的用其 slug；其余按同样规则 `slugify(title 前 44 字符)-<id>` 生成；L4 黄金记录 slug 固定为 `country-miniature-stamp-poster`。

---

## Task 1：脚手架、设计 token、i18n 路由、基础布局

**目标**：`frontend/` 内可 `pnpm lint && pnpm typecheck && pnpm test && pnpm build` 的 Next.js 16 static export 骨架。

**文件**：
- `frontend/package.json`（scripts：`dev`、`build`（`next build`）、`lint`（`eslint .`）、`typecheck`（`tsc --noEmit`）、`test`（`vitest run`）、`test:e2e`（`playwright test`）、`screenshots`（后续任务补）；依赖：next@16、react@19、react-dom@19、tailwindcss@4、@tailwindcss/postcss、typescript@^5.9、vitest、@vitejs/plugin-react、jsdom、@testing-library/react、@testing-library/jest-dom、@testing-library/user-event、@playwright/test、@axe-core/playwright、eslint@9 或 10、eslint-config-next@16、`serve`（用于 e2e 静态站））
- `frontend/pnpm-lock.yaml`、`frontend/.gitignore`（node_modules、.next、out、playwright-report、test-results、evidence/screenshots 不忽略）
- `frontend/next.config.ts`：`output: "export"`、`trailingSlash: false`、`images: { unoptimized: true }`、`reactStrictMode: true`
- `frontend/tsconfig.json`（strict、`noUncheckedIndexedAccess`、paths `@/*` → `src/*`）
- `frontend/postcss.config.mjs`、`frontend/eslint.config.mjs`、`frontend/vitest.config.ts`（jsdom、setup 文件加载 jest-dom）、`frontend/playwright.config.ts`（webServer: `pnpm exec serve out -l 3100`，baseURL `http://localhost:3100`，projects desktop 1440×1200 与 mobile 375×812）
- `frontend/src/styles/globals.css`：`@import "tailwindcss"`；`:root` 定义 `--color-canvas`、`--color-foreground`、`--color-surface`（#FFFFFF）、`--color-muted`、`--color-accent-red`、`--color-accent-blue`、`--color-accent-yellow`、`--border-thin: 2px`、`--border-thick: 4px`、`--shadow-hard-sm: 3px 3px 0 0 var(--color-foreground)`、`--shadow-hard-md: 4px 4px 0 0 ...`、`--shadow-hard-lg: 8px 8px 0 0 ...`、`--radius-none`、`--radius-pill: 9999px`、`--motion-fast: 200ms`、`--motion-base: 300ms`、`--font-sans`、`--font-mono`；`@theme inline` 映射为 Tailwind 颜色/阴影/字体 token；`@media (prefers-reduced-motion: reduce)` 关闭 transition/animation；全局 `:focus-visible` 2px offset 的黑色/蓝色 outline；`body` 背景 canvas、文字 foreground。
- `frontend/src/lib/i18n/config.ts`：`SUPPORTED_LOCALES = ["zh-CN"] as const`、`Locale` 类型、`DEFAULT_LOCALE`、`isLocale()`、`PUBLISHED_LOCALES`（本阶段仅 zh-CN；注释说明 en 未发布）。
- `frontend/src/lib/i18n/routes.ts`：typed route builder：`promptsHome(locale)`、`promptsImage(locale)`、`modelPage(locale, modelSlug)`、`promptDetail(locale, promptSlug)`、`blogHome`、`blogArticle`、`blogCategory`，以及 `withQuery(path, params)`（稳定顺序序列化，空值省略）。单元测试覆盖所有 builder。
- `frontend/src/lib/seo/site.ts`：`getSiteUrl()`（`NEXT_PUBLIC_SITE_URL` 或 `https://example.invalid`）、`absoluteUrl(path)`、`buildMetadata({locale, title, description, path})` 返回 `Metadata`（title、description、canonical、openGraph、twitter、`alternates.languages` 仅包含 published locales 中真实存在的条目——本阶段只有 zh-CN 自身）。单元测试。
- `frontend/src/lib/seo/json-ld.ts`：`breadcrumbList(items)`、`JsonLd` 组件（`<script type="application/ld+json">`，用 `JSON.stringify` 并转义 `<`）。
- `frontend/src/app/layout.tsx`：根 layout 只做 html/body 与字体（`lang` 由 `[locale]/layout.tsx` 无法设置，因此根 layout 设 `lang="zh-CN"`——DEFAULT_LOCALE；注释说明多 locale 时改为 `[locale]` 根 layout 方案）。`next/font/google` Outfit（400/500/700/900）+ 等宽 `next/font/google` JetBrains Mono 或本地 `ui-monospace` 栈。
- `frontend/src/app/[locale]/layout.tsx`：校验 locale（非法 → `notFound()`），`generateStaticParams` 返回 published locales；渲染 skip link（`<a href="#main">跳到主内容</a>`）、`SiteHeader`、`<main id="main">`、`SiteFooter`。
- `frontend/src/components/layout/SiteHeader.tsx`：品牌（三个几何形 logo：红圆、蓝方、黄三角，`aria-hidden`）+ 站名；导航：提示词（L1）、图片提示词（L2）、模型 Nano Banana Pro（L3）、Blog；语言位置：显示当前 `zh-CN` 并用 disabled 按钮 + `aria-describedby` 说明“更多语言尚未发布”；移动端 `MobileNav`（`"use client"` 最小叶子：`<button aria-expanded aria-controls>` 打开 `<nav>` 面板，Esc 关闭，44×44 目标）。
- `frontend/src/components/layout/SiteFooter.tsx`：黑底（#121212）白字；列出真实存在的内部链接（L1、L2、L3、Blog）+ 来源/版权说明“提示词版权归原作者所有，本站注明出处”+ 数据快照日期（由 repository 提供，本任务先接受 props）。RSS 入口本阶段不存在 → 不渲染 RSS 链接（注明二期）。
- `frontend/src/app/[locale]/page.tsx`：redirect 到 `/zh-CN/prompts`（static export 下用 `<meta http-equiv="refresh">` + 链接的 RSC 页面，或直接渲染同 L1；简单起见渲染一个含链接的中转页）。
- `frontend/src/app/not-found.tsx`：404 页面（H1“页面不存在”，回到 L1 的真实链接，Bauhaus 样式，`robots: noindex`）。
- `frontend/src/app/[locale]/prompts/page.tsx`：临时占位（H1 “提示词库”，后续任务替换）。
- `frontend/tests/setup.ts`；`frontend/tests/unit/routes.test.ts`、`frontend/tests/unit/seo.test.ts`；`frontend/tests/e2e/.gitkeep`。
- `frontend/README.md`：命令说明、目录说明、fixture 声明。

**验收**：`pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build` 全部通过；`out/zh-CN/prompts.html`（或 `prompts/index.html`）存在且含 H1；`out/404.html` 存在。

---

## Task 2：wireframe 数据提取脚本 + typed fixture + ContentRepository

**目标**：把 flow-proto 四页内嵌的全部数据提取为 typed fixture，并提供页面唯一的数据入口。

**文件**：
- `frontend/scripts/extract-wireframe.mjs`（Node 24，仅依赖 node:fs + 一个轻量 HTML 解析器，如 `node-html-parser` devDependency）：读取 `../docs/wireframes/flow-proto.html`，求值 `PAGES`，解析四页，输出 `frontend/src/data/wireframe/*.ts`（生成文件顶部注释 `// GENERATED by scripts/extract-wireframe.mjs — do not edit`）以及 `frontend/evidence/fixture-extraction.md`（每页 card 数、唯一 id 数、合并后 prompt 数、每轴 taxonomy 数、creator 数、逐条排除记录——任何未进入 fixture 的数据必须列出原因）。`package.json` 增加 `extract:wireframe` 脚本。
- `frontend/src/lib/content/types.ts`：
  - `Locale`（复用 i18n）
  - `Media { id; kind: "image"|"video"; src; alt; width; height; label: string|null; durationSeconds: number|null; index; total }`（原型无尺寸 → 用固定 16:9 占位尺寸 640×360 并标注 `dimensionsSource: "assumed"`）
  - `Source { platform: "x"; url; sourceId; handle; creatorId; publishedAt: string|null }`
  - `Metrics { observedAt: string; likes: number|null; bookmarks: number|null; views: number|null; reposts: number|null; replies: number|null; quotes: number|null; valueScore: number|null; highValue: boolean }`
  - `TaxonomyAxis = "model"|"useCase"|"technique"|"style"|"subject"|"contentType"`
  - `Taxonomy { id; axis; slug; label; labelZh: string|null; href: string|null; wireframeDeclaredCount: number|null }`（`href` 只对本阶段存在页面非 null：model 三个有页面的、contentType image）
  - `Creator { id; handle; url; avatarUrl: string|null; followers: number|null; wireframeDeclaredPromptCount: number|null; wireframeDeclaredLikes; wireframeDeclaredBookmarks }`
  - `PromptVariable { token: string; label: string; options: string[]; defaultValue: string }`
  - `PromptStep { order; title; body }`
  - `PromptSummary { id; slug; href; locale; title; excerpt; promptPreview; contentType; models: Taxonomy[]; useCases; techniques; styles; subjects; creator: Creator; source: Source; metrics: Metrics; media: Media[]; appearsOn; hasVariables; featuredOn }`
  - `PromptDetail extends PromptSummary { promptText; promptLanguage: "en"; summary; variables: PromptVariable[]; steps: PromptStep[]; requiredInputs: string[]; optionalInputs: string[]; parameters: {label; value}[]; variations: {title; variableValue; media: Media|null; status: "pending"}[]; relatedGroups; localeVariants: LocaleVariantRef[] }`
  - `LocaleVariantRef { locale; slug; href; status: "ready"|"missing" }`
  - `ModelDetail { id; slug; label; href; summary; capabilities: string[]; inputs: string[]; outputs: string[]; limitations: string[]; editorial: { title; body }[]; editorialStatus: "derived-from-fixture"; officialUrl: null; relatedModels: Taxonomy[]; relatedUseCases: Taxonomy[] }`
  - `Collection { id; slug; title; subtitle; rule: CollectionRule }`（rule 为可序列化判定：`{ type: "axis-all", conditions: {axis, value}[] } | { type: "regex", pattern }`）
  - `ArticleSummary / ArticleDetail / ArticleCategory`（fixture 标记 `isFixture: true`）
  - `Snapshot { observedAt: "2026-08-20"; indexVersion: "wireframe-flow-proto"; source: "docs/wireframes/flow-proto.html" }`
- `frontend/src/data/wireframe/prompts.ts`、`models.ts`、`taxonomies.ts`、`creators.ts`、`collections.ts`、`articles.ts`（手写 2 篇明确标记 fixture 的文章：例如“如何替换 Prompt 变量”与“来源与版权说明”，分类 `guides`）、`snapshot.ts`、`index.ts`。
- `frontend/src/lib/content/repository.ts`：`interface ContentRepository`：
  - `getSnapshot()`
  - `listPrompts(locale, query?: PromptQuery)` → `{ items: PromptSummary[]; total; facets: FacetGroup[]; appliedFilters; unknownParams }`
  - `getPromptBySlug(locale, slug)` → `PromptDetail | null`
  - `listFeatured(locale, surface: "l1"|"l2")`
  - `listTrending(locale, window: "7d"|"30d"|"all", limit)` → `{ items; note: string|null; windowStart: string|null }`（相对 snapshot.observedAt 计算，不用 Date.now()）
  - `listTaxonomies(locale, axis)`（每项带 `count`，由 prompts 动态计算）
  - `getModel(locale, slug)` → `ModelDetail | null`；`listModelPrompts(locale, slug, query)`；`listPromptsWithVariables(locale, modelSlug?)`
  - `listCollections(locale)`（带动态 `count` 与 `sampleIds`）
  - `listCreators(locale)`（带动态 `count`）
  - `getRelated(locale, promptId)` → `{ sameSeries; sameModel; sameUseCase; sameCreator }`
  - `listArticles`、`getArticle`、`listArticleCategories`、`getArticleCategory`
  - 全部返回 `Promise`。
- `frontend/src/lib/content/query.ts`：纯函数 `applyPromptQuery(prompts, query)`（同轴 OR、跨轴 AND、q AND；q 按空白拆词、去掉前导 `@`、大小写不敏感匹配 title/promptText/handle/taxonomy label）、`parsePromptQuery(searchParams)`（返回 `{ query, unknownParams }`）、`serializePromptQuery(query)`；供服务端与客户端共用。
- `frontend/src/lib/content/variables.ts`：`extractVariables(promptText)`（正则 `\[[A-Z][A-Z0-9 _\/-]{1,40}\]` 与 `@img\d`/`@image\d`），`countToken(text, token)`，`substituteVariables(text, values)` → `{ text, replaced: Record<token, number>, unreplaced: string[] }`。
- `frontend/src/lib/content/fixture-repository.ts`：实现 `ContentRepository`；`frontend/src/lib/content/index.ts` 导出 `getContentRepository()`（默认 fixture；Codex 以后只替换此工厂）。
- 单元测试：`tests/unit/content/query.test.ts`（OR/AND/q、unknown params）、`variables.test.ts`（COUNTRY 计数 = 实际出现次数、替换后 unreplaced 为空、缺值时列出 unreplaced）、`fixture-repository.test.ts`（唯一 id 数 = 35、L4 黄金记录存在且 slug 为 `country-miniature-stamp-poster`、trending 7d/30d/all 相对 2026-08-20、collections 动态 count、模型 nano-banana-pro 的 prompts 数 = fixture 中标注该模型的数量、`getModel("gpt-image-2")` 有内容）、`extract.test.ts`（运行脚本后生成文件与提交文件一致——即 `pnpm extract:wireframe` 是幂等的）。

**L4 黄金记录规则**：`variables = [{ token: "[COUNTRY]", label: "国家", options: [Japan, France, Egypt, Brazil, India, Mexico], defaultValue: "Japan" }]`；`steps` 4 条原文；`requiredInputs = ["国家名（替换 [COUNTRY]）"]`、`optionalInputs = []`、`parameters` 来自 Prompt 尾部（`8k resolution`、`octane render`、`tilt-shift lens effect`、`shallow depth of field`）；`variations` 6 条（title、variableValue、media null、status pending）；source `followers: 34683`；metrics views 7318 / likes 185 / bookmarks 122 / reposts 20 / replies 44 / quotes 2；models 含 `gpt-image-2`；useCases/styles 用 L4 chips（“微缩摄影”“超写实”作为 style/technique 标签，`Higgsfield` 作为 platform 标签不是 taxonomy）。

**ModelDetail（nano-banana-pro）派生规则**：`summary` 由 fixture 计算（“库中 N 条 Prompt 点名该模型，来自 M 位创作者，收录 <min date> 至 <max date>”）；`capabilities` = 该模型 prompts 覆盖的 useCase/style/subject 标签；`inputs` = 从 prompts 检测到的输入类型（文本 Prompt；若含 `@img`/`[INSERT ...]`/“reference”则加“参考图 / 变量”）；`outputs = ["image"]`；`limitations = ["官方功能与定价说明尚未收录，请以官方渠道为准"]`（原型原文语义）；`editorial` = L3“关于这个模型”三段文案（数字用动态值替换，不写 157/68）；`relatedModels` = higgsfield-soul、gpt-image-2；`relatedUseCases` = fashion、beauty。另外为 `higgsfield-soul`、`gpt-image-2` 生成同规则 ModelDetail（页面 generateStaticParams 输出全部有 prompts 的模型）。

**验收**：`pnpm extract:wireframe` 幂等；`pnpm lint && pnpm typecheck && pnpm test` 通过；`evidence/fixture-extraction.md` 有逐条数量与排除记录。

---

## Task 3：共享 UI 组件与交互原语

**目标**：L1–L4 共用的 Bauhaus 组件与客户端叶子组件，全部带测试。

**文件**（`frontend/src/components/ui/` 与 `frontend/src/features/`）：
- `ui/Button.tsx`（variant primary-red / secondary-blue / yellow / outline / ghost；shape square/pill；min 44×44；active 位移+去阴影；`disabled` 时 `aria-disabled` + 说明文字 slot）
- `ui/Chip.tsx`（`<button aria-pressed>` 或 `<a>`；含 count `<small>`；pill）
- `ui/Card.tsx`、`ui/Section.tsx`（`<section aria-labelledby>` + h2 + 可选说明 + 可选“查看全部”真实链接）、`ui/Panel.tsx`、`ui/GeometricMark.tsx`（aria-hidden 装饰）
- `ui/Breadcrumb.tsx`（`<nav aria-label="面包屑">` + `<ol>`；最后一项 `aria-current="page"`）
- `ui/MediaFrame.tsx`（`"use client"` 最小：`<img width height alt loading decoding referrerPolicy="no-referrer">`，onError 切换到几何占位 + “媒体不可用”文字；首屏 `priority` 时 `loading="eager" fetchPriority="high"`）
- `ui/StateBlock.tsx`（`loading`（skeleton，`aria-busy`）/ `empty` / `no-results` / `error`+retry 按钮 / `unavailable`）
- `ui/Rail.tsx`（`"use client"`：横向滚动容器 `role="region" aria-label` + `tabIndex=0`；左右按钮（可见、44×44、有可访问名称）；ArrowLeft/ArrowRight 键盘滚动；`scroll-snap`）
- `features/prompt/PromptCard.tsx`（RSC：媒体、标题链接（真实 detail href）、taxonomy chips（链接到带 query 的 L1/L2）、Prompt 预览 `<pre>`（等宽，截断只在展示层）、meta（@handle 外链 rel="noopener nofollow"、日期、赞/藏 + observedAt 提示）、`CopyPromptButton`（复制完整原文）、原帖外链）
- `features/prompt/CopyPromptButton.tsx`（`"use client"`：`navigator.clipboard.writeText` 成功 → “已复制 ✓”（aria-live polite）；reject 或不存在 → “复制失败，可选中文本手动复制”并 `window.getSelection` 选中关联 `<pre>`（通过 `targetId`）；2.5s 后复位；绝不在失败时显示成功）
- `features/prompt/PromptText.tsx`（`<pre>` 等宽、可滚动、可选择；`expandable` 时由客户端 `ExpandToggle` 控制 `data-expanded`）
- `features/search/SearchForm.tsx`（RSC `<form role="search" method="get" action={path}>` + `input[type=search]` + 提交按钮 + 重置链接；无 JS 可用；保留 hidden inputs 维持其它 query）
- `features/search/FacetChips.tsx`（RSC：每个 chip 是 `<a>` 指向切换该值后的 URL（同轴 OR：加入/移除；`aria-pressed` 用 `aria-current` 替代或用 `data-active`），计数来自 props）
- `features/search/ActiveFilters.tsx`（RSC：结果摘要 `<p role="status">共 N 条`、每个已选条件的移除链接、重置链接、未知参数警告）
- `features/search/PromptResults.tsx`（RSC：grid 或 no-results StateBlock）
- `components/seo/JsonLd.tsx`（若 Task 1 未做）
- 单元测试：`CopyPromptButton.test.tsx`（成功路径、reject 路径、无 clipboard 路径，断言失败时文本不含“已复制”）、`Rail.test.tsx`（键盘）、`FacetChips.test.tsx`（href 生成正确：加入/移除、跨轴保留）、`MediaFrame.test.tsx`（onError fallback）、`StateBlock.test.tsx`。

**验收**：`pnpm lint && pnpm typecheck && pnpm test` 通过。

---

## Task 4：L1 Prompt Hub（/zh-CN/prompts）

**文件**：`frontend/src/app/[locale]/prompts/page.tsx`（`generateMetadata`、`searchParams` 由 `<Suspense>` 包裹的客户端 `PromptExplorer` 读取——静态导出下服务端无法读取 query，因此：RSC 渲染完整浏览态（Hero、Featured、Trending、taxonomy、合集、创作者）+ 全量 PromptSummary 列表传给 `features/prompt/PromptExplorer.tsx`（`"use client"`，`useSearchParams` + `applyPromptQuery`，用 `router.replace`/`Link` 更新 URL，`role="status" aria-live="polite"` 宣告结果数；当存在 q/facets 时显示结果区并隐藏浏览区，否则显示浏览区）、`loading.tsx`、`error.tsx`（`"use client"`，retry 调 `reset()`）。
- 模块顺序（原型）：Header；Hero（H1 “N 条提示词，复制即用”，N 动态 = repository total；说明文案）；Search + 四轴 facets（model/useCase/technique/style，count 动态）；筛选摘要（结果数、移除单个、重置）；Featured（id 2071174186978951379，不与列表重复渲染——列表中排除 featured 或在 featured 区标注）；热门（7d/30d/all tabs，`role="tablist"`，键盘左右切换；窗口相对快照日期；不足 3 条时显示“该时段收录较少，已补充全部时段热门”）；按任务（useCase tiles → 带 query 的 L1 链接，count 动态）；镜头与技法（technique）；按模型（model tiles：有页面的链接 L3，其余链接到 L1 query）；按风格（style）；精选合集（6 个，count 动态，链接到 L1 带对应 query）；创作者（7 位，外链 X + 动态 count）；最终 CTA（链接到 L2）；Footer。
- 页面顶部 `JsonLd`：BreadcrumbList + CollectionPage + ItemList（items = 首屏渲染的 prompt detail URL）。
- 无 JS：首屏 HTML 含 H1、Featured、热门（all）、taxonomy 链接、创作者；`SearchForm` GET 提交仍能到达带 query 的 URL（客户端 hydration 后应用筛选）。
- 单元测试：`PromptExplorer.test.tsx`（q AND facets、同轴 OR、跨轴 AND、移除单个 filter、无结果文案、未知参数提示）；`TrendingTabs.test.tsx`。

**验收**：`pnpm build` 后 `out/zh-CN/prompts.html` 含 H1、featured 标题、≥ 1 个 `/zh-CN/prompts/` detail 链接；lint/typecheck/test 通过。

---

## Task 5：L2 图片 Gallery（/zh-CN/prompts/image）

**文件**：`frontend/src/app/[locale]/prompts/image/page.tsx`、`loading.tsx`、`error.tsx`；`features/gallery/*`。
- 模块：Breadcrumb（提示词库 / 图片）；H1 “图片提示词”+ 动态数量（contentType=image 的 prompts）+ statline（条数、热门数 = highValue、创作者数、最新收录 = max publishedAt，全部动态）；搜索（GET form + 客户端 explorer 复用 Task 4 的 `PromptExplorer`，轴 useCase/style/subject/model）；精选 rail（L2 精选卡）；按模型 tiles（有页面的链接 L3，其余非链接 + count）+ 每个模型一条 Rail（Nano Banana Pro / Higgsfield Soul / GPT Image 2，“查看全部 N 条 →” 真实 L3 链接）；Person / portrait rail（subject=Person / portrait）；其他类型（视频/图片/网页……只把 image 渲染成链接，其余 disabled 说明“尚未发布”）；Related（真实链接：L1、L3 三个模型；用例链接改为 L1 带 query）；CTA（进入 nano-banana-pro）。
- 首屏第一张媒体 `priority`；其余 lazy。
- JSON-LD：BreadcrumbList + CollectionPage + ItemList。
- 单元测试：`gallery.test.tsx`（statline 数字等于 repository 计算值；模型 tiles 只有存在页面的是 `<a>`）。

**验收**：`pnpm build` 后 `out/zh-CN/prompts/image.html` 含 H1 与 L3 链接；lint/typecheck/test 通过。

---

## Task 6：L3 模型页（/zh-CN/prompts/models/[modelSlug]）

**文件**：`frontend/src/app/[locale]/prompts/models/[modelSlug]/page.tsx`（`generateStaticParams` = 所有有 prompts 的模型；`dynamicParams = false`；不存在 → `notFound()`）、`loading.tsx`、`error.tsx`；`features/model/*`。
- 模块：Breadcrumb（提示词库 / 图片提示词 / Nano Banana Pro）；Identity（H1 “Nano Banana Pro 提示词”、动态 summary、`officialUrl` 为 null 时显示“官方链接暂未收录”、快照日期）；Capabilities / Inputs / Outputs / Limitations 四栏（来自 ModelDetail，标注“由收录 Prompt 派生”）；原型 genbox：搜索框保留为真实搜索（作用于本页列表），“设置 / 参考图 / 生成”渲染为 disabled 按钮 + 文字“生成功能尚未接入，本页仅提供 Prompt 复制”；近期热门（highValue 或 valueScore 排序，前 6）；全部 Prompt + facets（useCase/style/subject，URL query，复用 explorer）；带变量的 Prompt rail（`hasVariables`）；创作者（动态 count，头像 `MediaFrame` 或几何占位）；关于这个模型（editorial 三段）；Related（上级：L2、L1；其他模型：真实 L3 链接；用例：L1 带 query）；CTA（回到列表锚点 `#all-prompts`——页面内锚点允许，不是 hash 路由）。
- JSON-LD：BreadcrumbList + CollectionPage + ItemList。
- 单元测试：`model-page.test.tsx`（H1、disabled 生成按钮带说明、Limitations 文案、未知 slug → notFound）。

**验收**：`out/zh-CN/prompts/models/nano-banana-pro.html` 存在，含 H1 与 ≥ 1 个 detail 链接；同时生成 higgsfield-soul、gpt-image-2；lint/typecheck/test/build 通过。

---

## Task 7：L4 Prompt 详情（/zh-CN/prompts/[promptSlug]）

**文件**：`frontend/src/app/[locale]/prompts/[promptSlug]/page.tsx`（`generateStaticParams` = 全部 35 条；`dynamicParams = false`；保留段冲突：`image` 与 `models` 是静态段，优先级高于动态段，确认 Next 路由不冲突）、`loading.tsx`、`error.tsx`；`features/prompt-detail/*`。
- 模块：Breadcrumb（提示词库 / 模型页（首个模型有页面时）/ 标题）；Identity（H1、摘要、模型/用途/风格 chips 链接到真实页面或 L1 query、作者 byline + 发布日期）；Example media（主图 `priority` + 缩略条；失败 fallback）；Prompt 原文（等宽 `<pre id="prompt-text">`，语言标签“英文 · N 处变量”，N 由 `extractVariables` 计算；变量 token 高亮 `<mark>`）；Copy 主按钮（复制经变量替换的完整原文）；Required / optional inputs；Parameters；使用步骤（`<ol>`，步骤文字中的“7 处”改为动态 N）；变量选择（`VariableSelector`，`"use client"`：`role="radiogroup"` 按钮组、当前值 `role="status"` 宣告“当前选择：Japan，复制时替换 N 处”；替换用 `substituteVariables`）；同系列（variations，占位“待生成”）；Source（创作者、粉丝、发布时间、平台、原帖链接、“逐字保留”说明）与互动数据（六项 + `观测于 2026-08-20`）；Related（同系列/同模型/同用途/同创作者，来自 `getRelated`，每项真实链接；“该作者其他提示词”= fixture 中同 handle 的其它 prompt）；移动底部固定 CTA（`position: sticky/fixed` + `padding-bottom: env(safe-area-inset-bottom)`，正文底部预留空间，含标题、原帖链接、复制按钮）。
- 无变量的 Prompt 页复用同一模板，变量区隐藏。
- JSON-LD：BreadcrumbList + CreativeWork（name、description、author（Person，url）、datePublished、inLanguage "en"、isBasedOn source url、image）。
- 单元测试：`VariableSelector.test.tsx`（切换国家后复制文本无 `[COUNTRY]` 且替换次数 = 原文出现次数）；`prompt-detail.test.tsx`（黄金记录渲染步骤 4 条、变量 N 与原文一致、互动数据带 observedAt）。

**验收**：`out/zh-CN/prompts/country-miniature-stamp-poster.html` 含 H1、Prompt 原文、来源链接；全部 35 页生成；lint/typecheck/test/build 通过。

---

## Task 8：Blog（列表 / 文章 / 分类）与 404 完整化

**文件**：`frontend/src/app/[locale]/blog/page.tsx`、`blog/[slug]/page.tsx`、`blog/category/[slug]/page.tsx`（均 `generateStaticParams`、`dynamicParams=false`）、`features/blog/*`。
- 列表：H1、定位说明、Featured 文章、分类链接、最新文章列表（fixture 2 篇）、明显的“fixture 内容”标记（仅在 fixture 模式下由 repository 的 `isFixture` 驱动）。
- 文章：title、description、author、publishedAt、updatedAt、正文（fixture 正文用简单 Markdown → 由最小渲染器或直接 JSX 段落；不新增大依赖）、来源/引用、相关文章、分享（复制链接按钮复用 Copy 逻辑）。
- 分类：只为有文章的分类生成。
- Article JSON-LD + BreadcrumbList。
- 404：确认 `out/404.html` Bauhaus 样式、含 L1/L2/Blog 真实链接、`noindex`。
- 单元测试：`blog.test.tsx`。

**验收**：`out/zh-CN/blog.html`、`out/zh-CN/blog/<slug>.html`、`out/zh-CN/blog/category/<slug>.html` 存在；lint/typecheck/test/build 通过。

---

## Task 9：E2E、axe、响应式、截图、静态输出门禁

**文件**：`frontend/tests/e2e/*.spec.ts`、`frontend/scripts/screenshots.ts`（或 Playwright 项目）、`frontend/scripts/check-static-output.mjs`、`package.json` 脚本 `test:e2e`、`screenshots`、`check:static`。
- E2E 必须覆盖：
  1. L1→L2→L3→L4 真实链接可达（点击而非直接导航）；
  2. L1 搜索 + 多轴筛选（同轴 OR、跨轴 AND）结果数与 URL 同步；
  3. 刷新与浏览器前进/后退恢复筛选；
  4. L4 Copy 成功（授予 clipboard 权限并读取 `navigator.clipboard.readText`）与失败（`page.addInitScript` 让 `writeText` reject）——失败时页面不含“已复制”；
  5. COUNTRY 替换：选择 France 后复制文本不含 `[COUNTRY]`，且 `France` 出现次数 = 原文 `[COUNTRY]` 次数；
  6. 404：访问不存在的 slug 返回 404 页面 H1；
  7. 移动导航：375 宽下菜单按钮 `aria-expanded` 切换并可键盘操作；
  8. axe（`@axe-core/playwright`）在 L1–L4 + Blog 无 critical/serious；
  9. 320/375/768/1024/1440 下 `document.documentElement.scrollWidth <= clientWidth`；
  10. 关闭 JavaScript（`javaScriptEnabled: false`）下 L1/L4 仍有 H1、Prompt 正文、detail 链接。
- `check:static`：断言 `out/` 中四层页面 + blog + 404 存在；grep 生产代码（`src/`）与 `out/` 中 `<iframe`、`srcdoc`、`href="#` 且非页内锚点、`location.hash` 数量为 0（允许 `#main`、`#all-prompts` 页内锚点——脚本白名单）。
- 截图：桌面 1440×1200 与移动 375×812 的 L1–L4 全页截图到 `frontend/evidence/screenshots/{l1,l2,l3,l4}-{desktop,mobile}.png`。
- 运行 `pnpm build && pnpm test:e2e && pnpm check:static && pnpm screenshots`，把真实输出记录到 `frontend/evidence/test-run.md`。

**验收**：全部 e2e 通过；截图 8 张存在；`check:static` 通过。

---

## Task 10：交接报告

**文件**：`docs/handoffs/claude-frontend-mvp-result.md`。内容必须包含：changed files（`git diff --stat` 基线→HEAD）；fixture 提取数量（引用 `frontend/evidence/fixture-extraction.md`）；路由清单（含静态输出路径）；测试命令与实际结果（逐条粘贴摘要，不得只写“通过”）；截图路径；已知缺口（如 en 未发布、RSS/sitemap 未做、模型官方信息未收录、媒体热链、`NEXT_PUBLIC_SITE_URL` 默认值等）；Codex 接 API 时只需替换的 adapter（`src/lib/content/index.ts` 工厂 + 新建 `api-repository.ts`，页面不改）；任何未通过门禁。
