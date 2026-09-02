# frontend/CLAUDE.md

本文件是 `frontend/` 的工作说明，面向在此目录内工作的 Claude Code。规范性约束以 [AGENTS.md](./AGENTS.md) 为准；本文件只解释**项目结构、层级依赖和落点规则**，两者冲突时服从 AGENTS.md。

上游契约（改代码前先读）：

- 产品：`../specs/0008-prd.md`
- 技术架构 / 路由 / API 合同：`../specs/0009-pseo-tech-arch.md`
- 视觉 token（Bauhaus）：`../specs/images/0008-bo-pseo-ui.md`
- 信息架构与交互语义：`../docs/wireframes/flow-proto.html`
- 当前阶段任务书：`../docs/handoffs/claude-frontend-mvp.md`；实施计划：`docs/plans/2026-09-02-frontend-mvp.md`

## 1. 一句话定位

SEO 优先、静态导出（`output: "export"`）的多语言 Prompt 库 + Blog 前台。Git 中已审核的内容是发布事实源；前端只消费“已发布内容投影”，运行时不依赖 Payload/数据库。当前阶段数据来自 wireframe 提取的 typed fixture，之后由 Codex 换成 API adapter，**页面组件不重写**。

## 2. 命令

```text
pnpm dev          # 本地开发
pnpm lint         # eslint .
pnpm typecheck    # tsc --noEmit
pnpm test         # vitest（单元 / 组件）
pnpm build        # next build → out/（静态导出）
pnpm test:e2e     # playwright（先 build；用 serve 托管 out/）
```

交付前四件套（lint / typecheck / test / build）必须全绿；改了路由、搜索筛选、复制、语言切换或详情流，再跑 `test:e2e`。不能运行的项要在交付说明里写明原因，不得声称通过。

## 3. 目录结构

```text
frontend/
├── AGENTS.md                 # 强制规范（优先级高于本文件）
├── CLAUDE.md                 # 本文件：结构与分层
├── README.md
├── docs/plans/               # 实施计划（工作文档，不进生产）
├── scripts/                  # 构建期脚本：wireframe 提取、静态输出门禁、截图
├── evidence/                 # 交付证据：fixture 提取记录、测试记录、screenshots/
├── public/
├── src/
│   ├── app/                  # 路由层：只做组装，不写业务逻辑
│   │   ├── layout.tsx        # 根 layout：html/body、next/font、lang
│   │   ├── not-found.tsx     # 404（noindex）
│   │   └── [locale]/         # 所有可索引公开页
│   │       ├── layout.tsx    # 校验 locale、skip link、SiteHeader/main/SiteFooter
│   │       ├── prompts/      # L1 首页
│   │       │   ├── image/            # L2 图片 Gallery
│   │       │   ├── models/[modelSlug]/   # L3 模型页
│   │       │   └── [promptSlug]/     # L4 Prompt 详情
│   │       └── blog/         # 列表、[slug] 文章、category/[slug]
│   ├── components/           # 无业务含义的可复用组件
│   │   ├── ui/               # Button、Chip、Card、Section、Rail、StateBlock、MediaFrame…
│   │   ├── layout/           # SiteHeader、SiteFooter、MobileNav、BrandMark、nav.ts
│   │   └── seo/              # JsonLd、Breadcrumb 等 SEO 呈现组件
│   ├── features/             # 垂直业务模块（prompt、search、gallery、model、prompt-detail、blog）
│   ├── lib/
│   │   ├── content/          # 数据访问唯一入口：types、repository 接口、fixture-repository、query、variables
│   │   ├── api/              # （二期）typed API client；组件永远不直接 fetch
│   │   ├── i18n/             # locale 配置 + typed route builder（唯一的路径构造处）
│   │   └── seo/              # metadata、canonical、hreflang、JSON-LD 生成器
│   ├── data/
│   │   └── wireframe/        # 由 scripts/extract-wireframe.mjs 生成的 typed fixture（勿手改）
│   └── styles/
│       └── globals.css       # 唯一的 token 来源：CSS variables → Tailwind @theme
└── tests/
    ├── setup.ts
    ├── unit/                 # vitest：lib、components、features
    └── e2e/                  # playwright：四层路由、筛选、复制、404、axe、响应式
```

## 4. 分层与依赖方向

只允许向下依赖，禁止反向：

```text
app/[locale]/*  →  features/*  →  components/*  →  lib/*  →  data/*
                        ↘            ↘
                         lib/content  lib/i18n / lib/seo
```

- **app/**：页面文件只负责 `generateStaticParams`、`generateMetadata`、调用 `getContentRepository()` 取数据、把结果交给 features 组件。不写筛选逻辑、不拼 URL、不放 JSX 细节。
- **features/**：按业务垂直切分（`prompt/PromptCard`、`search/FacetChips`、`prompt-detail/VariableSelector`…）。可以依赖 components、lib；不得 import `app/`，不得 import `data/`。
- **components/ui、layout、seo**：不含业务概念，不 import features 或 data。只消费语义 token（`bg-canvas`、`text-foreground`、`shadow-hard-md`、`bg-accent-red`…），JSX 里不出现 hex、任意阴影或 magic number。
- **lib/content**：`ContentRepository` 接口 + 实现。页面**只**调用 `getContentRepository()`；除 `fixture-repository.ts` 外，任何文件不得 import `data/wireframe`。筛选（同轴 OR、跨轴 AND、q AND）、变量解析替换、trending 窗口计算都是这里的纯函数，供服务端与客户端共用。
- **lib/i18n**：`SUPPORTED_LOCALES`、`isLocale()`、route builder（`promptsHome`、`promptDetail`、`modelPage`、`blogArticle`… 与 `withQuery`）。全站内部链接必须经它生成，禁止字符串拼接和 `href="#"`。
- **lib/seo**：`buildMetadata`、`absoluteUrl`、JSON-LD builder。hreflang 只输出真实存在的已发布 locale（当前只有 zh-CN），不得伪造 en。
- **data/wireframe**：生成物。改数据请改 `scripts/extract-wireframe.mjs` 后重新 `pnpm extract:wireframe`，并更新 `evidence/fixture-extraction.md`。

## 5. Server / Client 边界

- 默认 React Server Component。首屏 H1、摘要、列表、Prompt 原文、来源、主要内链必须在服务端 HTML 中。
- `"use client"` 只给最小叶子：`MobileNav`、`CopyPromptButton`、`Rail`（键盘横滚）、`MediaFrame`（onError fallback）、`VariableSelector`、`PromptExplorer`（读 URL query 做客户端筛选）、`error.tsx`。
- 客户端筛选组件从服务端页面接收已序列化的 `PromptSummary[]`，不自己取数、不 import fixture。
- URL 是状态：`q`、`model`、`useCase`、`technique`、`style`、`subject`、`window` 写进 search params；刷新、分享、前进后退不丢。短暂 UI 状态（菜单开合、复制反馈）才留在组件里。

## 6. 数据诚实

- 页面上的数量、热门、作者、日期、互动指标全部由 repository 从当前数据动态计算；禁止渲染 982 / 324 / 136 这类原型声明数字。原型声明值只能以 `wireframeDeclared*` 元数据保存，不进渲染路径。
- 互动指标必须带 `observedAt`（当前快照 2026-08-20）；缺失值为 `null` + 说明，不填 0。7d/30d 相对快照时间计算，不用 `Date.now()`。
- 原型里没有真实能力的“设置 / 参考图 / 生成”按钮：隐藏，或 disabled + 明确文字说明。
- Fixture 内容（含 Blog 示例文章）带 `isFixture` 标记，只能在 fixture repository 中出现。

## 7. 状态、无障碍、视觉

- 每个数据区域：loading（route `loading.tsx` / skeleton）、empty、no-results、error + retry（route `error.tsx`）。
- 复制：clipboard 成功后才显示“已复制”；失败显示“复制失败，可选中文本手动复制”并选中文本；`aria-live` 宣告。
- 语义标签（header/nav/main/footer/form role=search）、skip link `#main`、每页唯一 H1 且层级连续、`focus-visible`、触控目标 ≥ 44×44、320–1440 无页面级横向溢出、图片有 width/height/alt/fallback。
- Bauhaus token：canvas `#F0F0F0`、foreground/border `#121212`、red `#D02020`、blue `#1040C0`、yellow `#F0C020`、muted `#E0E0E0`；Outfit + 等宽 Prompt 正文；2px/4px 黑边；无模糊硬阴影；圆角只用 0 或 9999px；动效 200–300ms ease-out 并尊重 `prefers-reduced-motion`。不要把内容页做成带 Pricing/FAQ/Testimonials 的 SaaS landing page。

## 8. 新增代码落点速查

| 要做的事 | 放哪里 |
| --- | --- |
| 新公开页面 | `src/app/[locale]/…/page.tsx`（+ `loading.tsx`、`error.tsx`、`generateStaticParams`） |
| 新的数据查询 | `src/lib/content/repository.ts` 加接口 → `fixture-repository.ts` 实现 → 单元测试 |
| 新的筛选/排序规则 | `src/lib/content/query.ts` 纯函数 |
| 新链接 | `src/lib/i18n/routes.ts` 加 builder，不在组件里拼 |
| 新的业务组件 | `src/features/<模块>/` |
| 新的通用控件 | `src/components/ui/` |
| 新 token | 只改 `src/styles/globals.css` |
| 新 metadata / JSON-LD 类型 | `src/lib/seo/` |
| 接真实 API | 新建 `src/lib/content/api-repository.ts` + `src/lib/api/`，在 `src/lib/content/index.ts` 工厂切换；不改页面 |

## 9. 禁止事项（摘自 AGENTS.md）

不改 `backend/`、`cms/`、`specs/`、`docs/wireframes/` 与任何现有 AGENTS.md；不直连 Payload/DB；组件里不裸 `fetch`；不用 Pages Router；不用 iframe / srcdoc / hash 路由；不新增 `any`、`@ts-ignore`；不混用包管理器（以 `pnpm-lock.yaml` 为准）；不让生产渲染路径出现假数据或假数量；不用客户端渲染替代可索引首屏。
