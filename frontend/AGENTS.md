# Frontend 协作规范

本文件约束 `frontend/` 及其所有子目录。前端代理只修改本目录；不得修改 `backend/`。发现后端契约缺失或不一致时，记录所需契约、失败场景和验收方式，交由后端处理，不得越界补写后端、直连数据库或绕开 API。

## 1. 产品与事实源

- 本项目是 SEO 优先的多语言提示词/博客站，不是传统 CMS 编辑后台。公开页面应覆盖首页、聚合/筛选页、模型页、详情页，以及 PRD 要求的分类、标签、RSS、站点地图等入口。
- 已合并到 Git 的 Markdown（Frontmatter + 正文）是发布事实源。Payload CMS、抓取结果、缓存和数据库都只是采集、编排、索引或投影层，不能凌驾于 Git 中的已审核内容。
- 前端只消费后端提供的“已发布内容投影”。不得从 Payload CMS、数据库或抓取源直读数据，也不得在浏览器里携带 CMS/数据库凭证。
- 页面上的数量、热度、作者、日期、互动指标、标签和来源必须来自 Markdown 发布索引或真实 API 响应。禁止硬编码诸如“982 条”“7 成”“热门”等未经当前数据证明的文案或数字。数据不可用时显示明确的空态、未知态或暂不可用态，不用看似真实的占位数据顶替。
- 示例数据只能存在于测试夹具、Storybook 或明确标注的开发 fixture 中，绝不能进入生产渲染路径、metadata、JSON-LD、RSS 或 sitemap。

## 2. 技术基线

- 使用 Next.js App Router、TypeScript、Tailwind CSS 与必要的模块化 CSS；不得引入 Pages Router。
- `tsconfig` 必须启用 `strict: true`。禁止新增 `any`、`@ts-ignore`、无理由的类型断言和无法证明安全的非空断言；外部响应先作为 `unknown`，经过运行时 schema 校验后再进入领域类型。
- React Server Component 是默认选择。只有浏览器交互、剪贴板、局部状态或浏览器 API 所需的最小叶子组件才能写 `"use client"`；不得为了方便把整页、布局或内容列表客户端化。
- 依赖优先使用平台能力和现有依赖。新增依赖前说明必要性、体积与维护成本；不得重复引入同类 UI、请求或状态库。
- 包管理器以锁文件为准，禁止混用 npm、pnpm、yarn 或 bun，也不得无故重写锁文件。

## 3. 推荐目录边界

新代码按职责放置，避免页面文件同时承担请求、映射、状态和展示：

```text
frontend/
├── src/
│   ├── app/
│   │   ├── [locale]/             # 所有公开、可索引页面
│   │   │   ├── layout.tsx
│   │   │   ├── prompts/          # L1 首页、L2 聚合、L3 模型、L4 详情
│   │   │   └── blog/             # 列表、文章、分类
│   │   ├── robots.ts
│   │   └── sitemap.ts
│   ├── components/
│   │   ├── ui/                   # 无业务含义的基础组件
│   │   └── seo/                  # breadcrumb、JSON-LD 等
│   ├── features/                 # prompt、model、category、search 等垂直模块
│   ├── lib/
│   │   ├── api/                  # 唯一的数据访问入口
│   │   ├── i18n/                 # locale 配置、路径与字典
│   │   └── seo/                  # metadata、canonical、hreflang 生成器
│   └── styles/                   # 全局样式与 Bauhaus tokens
└── tests/
```

- 领域模块不得反向依赖页面层；基础 UI 不得导入业务模块。
- API DTO、领域模型和 ViewModel 分开。DTO 只描述传输契约，映射函数负责默认值、枚举、日期和可空字段，组件不直接猜测后端字段。
- 同一概念只有一个公共类型和一个路径构造器，避免各页面复制接口、slug 或 locale 逻辑。

## 4. 真实多语言路由

- 所有公开页面必须使用真实路径段，例如 `/{locale}/prompts`、`/{locale}/prompts/{slug}`、`/{locale}/prompts/models/{modelSlug}`。语言切换必须导航到对应 locale URL；禁止只改 Context、Cookie、查询参数或 `localStorage` 后在同一个 URL 替换文案。
- 支持的 locale、默认 locale、回退规则和 locale 类型只能在 `lib/i18n/` 集中定义。路由参数必须校验；未知 locale 返回 404 或按架构规范重定向，不能静默当成默认语言。
- 每个本地化页面生成匹配内容语言的 `lang`、title、description、canonical 与 `alternates.languages`/hreflang。只有确有对应翻译的 URL 才能互相声明 alternate；不得把缺失翻译伪装成已本地化内容。
- slug、分类、模型和标签链接统一经 typed route builder 生成，禁止散落字符串拼接。筛选与分页状态写入可分享、可回退的 URL search params。
- 服务端按 locale 获取内容。禁止首屏先渲染默认语言、hydration 后再切换，以免搜索引擎和用户看到错误语言或布局抖动。

## 5. 数据访问与 API 契约

- 所有后端请求只能经过 `lib/api/` 中集中的 typed API client；组件、hooks、route handlers 和页面不得直接调用 `fetch`、Axios、Payload SDK、SQL/ORM 或数据库驱动。
- API client 至少统一处理：base URL、locale、查询序列化、超时/取消、运行时响应校验、错误归一化、请求 ID，以及 Next.js 的缓存、revalidate 和 tag 策略。服务端密钥只能存在于 `server-only` 模块。
- 优先从后端 OpenAPI 契约生成或对齐 DTO。任何接口变更必须同步更新类型、schema、映射器、错误处理和契约测试；不能用可选字段或类型断言掩盖破坏性变更。
- 公共读取接口应覆盖实际页面所需的已发布数据：列表/搜索/筛选/分页、详情、模型/分类/标签/创作者聚合、locale 可用性、RSS/sitemap 所需更新时间。具体路径和字段以架构规范/OpenAPI 为准，前端不得另造一套事实模型。
- API 错误映射为可区分的 `not-found`、空结果、可重试故障、限流和不可用状态。禁止吞掉异常后返回空数组，也禁止把失败页面缓存成正常内容。
- 数据请求默认放在 Server Component 并行执行，避免瀑布。只有确需即时交互的筛选、复制等行为保留最小客户端状态；不得用客户端请求补齐首屏主体内容。

## 6. 渲染、索引与 SEO

- 首页、聚合页、模型/分类/标签页和详情页的 H1、摘要、主体内容、来源与核心内部链接必须出现在服务器返回的 HTML 中；禁止依赖 `useEffect`、点击或无限滚动后才出现。
- 发布页使用 `generateStaticParams` 完整静态生成；当前 Cloudflare Pages 方案不使用 ISR、Draft Mode 或运行时 tag revalidation。内容 merge 后触发整站或按构建策略分片重建；预览、草稿和未发布内容不得进入正式静态输出。
- 每个可索引页面必须有唯一 title、description、canonical、可验证的 Open Graph/Twitter 信息和与页面真实内容一致的 JSON-LD。面包屑使用真实链接和 `BreadcrumbList`；文章类页面使用契约规定的 Article 类型。
- 分页必须有可抓取 URL 与 `<a>` 链接。筛选组合按 SEO 策略选择 canonical/noindex；不得让无限参数组合制造索引垃圾。
- sitemap、robots、RSS 和页面 canonical 必须使用同一个绝对 URL/locale 路径生成逻辑。404、搜索空结果、预览和错误页不得误标为可索引内容。
- 图片使用 `next/image` 或等价的尺寸约束，提供真实 `alt`、宽高和合理优先级；只有首屏主图可设高优先级，避免布局偏移与无差别预加载。

## 7. 线框语义与 Bauhaus 视觉系统

- `docs/wireframes/` 决定信息架构、页面层级和交互语义：L1 首页，L2 任务/用例/风格/图片/视频/创作者等聚合页，L3 模型页，L4 详情页。保留搜索、筛选、来源、复制、相关内容、面包屑等任务路径以及正确的 HTML 语义。
- `specs/images/0008-bo-pseo-ui.md` 决定视觉表达。线框中的临时颜色、圆角、阴影和静态数字不是生产设计 token 或生产数据。两者冲突时，先保留线框的内容层级和行为，再用 Bauhaus tokens 落地视觉；不得照抄原型内联 CSS。
- 颜色、字体、间距、边框、圆角、硬阴影、层级与动效集中定义为 CSS variables，并映射到 Tailwind theme。组件只能消费语义 token（如 `--color-surface`、`--color-accent-red`），禁止在 JSX 中反复散落 hex、任意阴影和 magic number。
- Bauhaus 基线：纯几何形、红 `#D02020`、蓝 `#1040C0`、黄 `#F0C020`、黑 `#121212`、画布 `#F0F0F0`；边框明确，阴影为无模糊硬偏移；圆角只使用方形或完整圆形。不得使用渐变、柔化阴影或泛化 SaaS 卡片风格。
- 几何装饰不能覆盖正文、抢占可访问名称或制造错误交互暗示；装饰元素设为 `aria-hidden`，信息不能只靠颜色或形状表达。
- 动效仅用于状态反馈和层级关系，并尊重 `prefers-reduced-motion`。字体加载使用 `next/font`，避免阻塞和布局抖动。

## 8. 交互、状态、无障碍与响应式

- 每个数据视图显式设计 loading、success、empty、no-results、error、retry 和 stale/unavailable 状态。复制操作至少包含成功、权限/浏览器失败与可手动复制回退；状态文案通过合适的 live region 通知。
- 使用原生语义元素：导航用 `nav`，搜索用 `form`/`role="search"`，操作用 `button`，导航用 `a`/`Link`，标题层级连续。不要用 `div` 模拟按钮或链接。
- 所有交互必须可键盘操作，焦点可见且顺序合理。Tab、accordion、dialog 等复合组件遵循 WAI-ARIA 模式；能用原生语义时不添加多余 ARIA。
- 图片有准确 alt，图标按钮有可访问名称，表单有持久 label，错误与控件建立程序化关联。正文、控件、焦点和状态色均满足 WCAG 2.2 AA 对比度。
- 布局从小屏开始，至少验证 360px、768px、1024px 和 1440px：不得横向溢出；导航、筛选、卡片、长提示词、代码/URL、图片画廊和底部操作条可正常折行或收纳；触控目标不小于 44×44px。
- 客户端状态只保存短暂 UI 状态。locale、搜索词、筛选、排序和分页属于 URL 状态；服务端数据不复制进全局 store。

## 9. 测试与合并门禁

按锁文件选择包管理器，并保证 `package.json` 提供统一脚本。涉及功能的提交在交付前必须通过：

```text
<pm> lint
<pm> typecheck
<pm> test
<pm> build
```

- 改动路由、搜索/筛选、复制、语言切换或关键详情流时，还必须运行 `<pm> test:e2e`。不能运行某项时，交付说明必须写清未运行项、原因和风险，不能声称全部通过。
- 单元/契约测试覆盖 API schema 与 DTO→领域模型映射、locale/URL 构造、metadata/canonical/hreflang、空值和错误映射。
- 组件测试覆盖 loading/empty/error、键盘操作、焦点、筛选 URL 同步与复制回退；不得只测 happy path。
- E2E 至少验证：每个支持 locale 的 L1→L2→L3→L4 可达；首屏 HTML 有正确语言、H1 与核心内容；canonical/hreflang 正确；刷新和浏览器前进后退保持筛选状态；移动端无溢出；404 与 API 故障不伪装为正常页面。
- 新增或修改 UI 必须进行自动化 a11y 检查和人工键盘走查。对关键页面抽查禁用 JavaScript 后的可索引主体，确保 SEO 不依赖 hydration。

## 10. 工作方式与禁止事项

- 开工前阅读相关 PRD、技术架构、`docs/wireframes/` 和 `specs/images/0008-bo-pseo-ui.md`；先确认契约和页面语义，再实现样式。
- 保持改动小而可审查，不重排无关文件，不覆盖他人的未提交修改。提交中说明数据来源、缓存策略、SEO 影响、状态处理与验证证据。
- 禁止修改 `backend/`，禁止直连 Payload/DB，禁止组件级裸请求，禁止生产假数据，禁止硬编码虚假数量，禁止用客户端渲染替代可索引首屏，禁止以线框占位行为冒充完整生产实现。
- 如果需求与 API 契约、Git 发布事实或 SEO 原则冲突，停止扩散实现，在前端范围内记录最小复现与所需决策，等待对应负责人解决。
