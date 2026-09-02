# Claude 前端 MVP 实现交接

Status: Approved for implementation  
Owner: Claude Code  
Downstream owner: Codex  
Date: 2026-09-02

## 1. 任务

在 frontend/ 内实现一个可运行、可静态构建的 Next.js 前端最小版本。

“完整实现 wireframe 数据”在本阶段的严格定义：

1. 读取 docs/wireframes/flow-proto.html；
2. 提取该文件内四个 PAGES 页面实际嵌入的全部数据；
3. 所有 Prompt 卡、taxonomy、creator、source、metrics、media、步骤和变量进入 typed fixture；
4. 不用硬编码的 982/324/136 冒充已实现数量；
5. 页面展示数量从 fixture 动态计算；
6. 四层页面、搜索、筛选、复制、变量替换和导航全部可用；
7. 不接 Payload、Python API 或真实 X 抓取。

本阶段不是 pixel-perfect 复刻原型的临时 CSS，而是用 0008 UI Spec 的 Bauhaus token 实现 wireframe 的内容与任务路径。

## 2. 必读文件

按顺序完整阅读：

1. frontend/AGENTS.md
2. specs/0008-prd.md
3. specs/0009-pseo-tech-arch.md
4. specs/images/0008-bo-pseo-ui.md
5. docs/wireframes/flow-proto.html

冲突处理：

- 页面 IA、模块顺序和交互语义服从 wireframe/PRD；
- 颜色、字体、边框、阴影和几何语言服从 UI Spec；
- 技术、路由、数据边界服从 0009；
- frontend/AGENTS.md 是目录内强制规则。

## 3. 修改范围

只允许修改：

- frontend/**
- docs/handoffs/claude-frontend-mvp-result.md

禁止修改：

- backend/**
- cms/**
- specs/**
- assets/raw/**
- docs/wireframes/**
- 现有 AGENTS.md

不要初始化远程 Git、不要创建 GitHub repository、不要部署 Cloudflare。

## 4. 技术基线

- Next.js App Router；
- TypeScript strict；
- Tailwind CSS + CSS variables；
- pnpm 优先；若仓库已有锁文件则服从锁文件；
- static export；
- React Server Component 默认；
- Vitest/Testing Library；
- Playwright；
- axe；
- 不引入大型状态库；
- 不在组件内散落 fetch；
- 不使用 iframe、srcdoc 或 hash 路由。

## 5. 真实路由

必须实现：

~~~text
/zh-CN/prompts
/zh-CN/prompts/image
/zh-CN/prompts/models/nano-banana-pro
/zh-CN/prompts/[promptSlug]
~~~

同时实现：

~~~text
/zh-CN/blog
/zh-CN/blog/[slug]
/zh-CN/blog/category/[slug]
/not-found
~~~

Blog 本阶段可以使用 1–2 条明确标记的 fixture，但 Prompt 四层必须使用 flow-proto 的完整内嵌数据。

内部链接必须是真实 href；不能按文案猜路由。

## 6. 数据层

建立清晰边界：

~~~text
frontend/src/data/wireframe/
├── prompts.ts
├── models.ts
├── taxonomies.ts
├── creators.ts
├── articles.ts
└── index.ts

frontend/src/lib/content/
├── repository.ts
├── fixture-repository.ts
└── types.ts
~~~

页面只调用 ContentRepository，不直接 import 大型 fixture。Codex 后续会增加 API repository，不应重写页面组件。

最低类型：

- PromptSummary
- PromptDetail
- ModelDetail
- Taxonomy
- Creator
- ArticleSummary
- ArticleDetail
- Media
- Source
- Metrics
- LocaleVariantRef

所有数据必须有稳定 id 和真实 href。

## 7. L1

必须实现：

- Header、移动导航、语言位置；
- H1 与动态 Prompt 数量；
- 搜索；
- model/useCase/technique/style facets；
- 结果摘要、移除单个 filter、重置；
- Featured；
- 7d/30d/all 热门；
- 任务、技法、模型、风格、合集、创作者；
- Footer。

筛选规则：

- 同轴 OR；
- 跨轴 AND；
- q 与 facets 为 AND；
- 状态写入 URL query；
- 刷新和前进后退不丢；
- count 从当前 fixture 算。

## 8. L2

必须实现：

- 图片 Prompt H1；
- 搜索；
- useCase/style/subject/model facets；
- Featured；
- 按模型 rails；
- Person/portrait；
- 其他类型；
- Related；
- 可键盘操作的横向 rail。

## 9. L3

必须实现：

- Nano Banana Pro Identity；
- capabilities/inputs/outputs/limitations；
- 近期热门；
- 全部 Prompt；
- 带变量 Prompt；
- Creator；
- About；
- Related models/use cases。

原型中的无行为“设置/参考图/生成”必须隐藏或显示为 disabled + 明确说明，不能伪装可用。

## 10. L4

至少为 flow-proto 中“国家主题微缩邮票海报”实现：

- Breadcrumb；
- H1、摘要和 taxonomy；
- Example media；
- Prompt 完整原文；
- Copy；
- Required/optional inputs；
- Parameters；
- 使用步骤；
- COUNTRY 变量选择；
- 按实际 token 数替换，不硬编码七处；
- Source 和 metrics observedAt；
- 同系列、同模型、同用途、同创作者；
- 移动底部 CTA。

Copy 必须测试成功和 clipboard 拒绝。失败不能显示“已复制”。

## 11. UI

使用：

- canvas #F0F0F0；
- foreground #121212；
- red #D02020；
- blue #1040C0；
- yellow #F0C020；
- Outfit；
- Prompt 使用等宽字体；
- 2px/4px 黑边；
- 无模糊硬阴影；
- 方角或完整 pill；
- 200–300ms 机械动效；
- prefers-reduced-motion。

保持内容密度。不要把页面改造成带 Pricing/Testimonials/FAQ 的 SaaS landing page。

## 12. 状态与无障碍

每个数据区域有：

- loading；
- empty；
- no results；
- error；
- retry。

必须：

- semantic header/nav/main/footer；
- skip-to-content；
- 每页唯一 H1；
- 连续 heading level；
- focus-visible；
- 44×44 触控目标；
- 键盘完成搜索、filter、rail、copy、navigation；
- aria-live 宣告 copy 和筛选结果；
- 320/375/768/1024/1440 无页面级横向溢出；
- 图片 width/height/alt/fallback；
- static export 下使用 unoptimized 或自定义 image loader。

## 13. SEO

每个真实页面生成：

- title；
- description；
- canonical；
- zh-CN lang；
- BreadcrumbList；
- 与可见内容一致的 CollectionPage/ItemList/CreativeWork/Article；
- 关闭 JavaScript后仍有 H1、正文和主要链接。

fixture 页面不得声称 en 已发布，不输出假的 hreflang。

## 14. 测试与完成门禁

必须提供并执行：

~~~text
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
~~~

必须验证：

1. L1→L2→L3→L4 真实链接；
2. 搜索和多轴筛选；
3. URL 状态恢复；
4. Copy success/failure；
5. COUNTRY 替换；
6. 404；
7. 移动导航；
8. axe 无 critical/serious；
9. static output 中存在四层页面；
10. 生产代码中的 iframe/srcdoc/hash-route 数量为 0。

输出桌面 1440×1200 与移动 375×812 的 L1–L4 截图到：

~~~text
frontend/evidence/screenshots/
~~~

## 15. 交接报告

完成后创建 docs/handoffs/claude-frontend-mvp-result.md，必须包含：

- changed files；
- fixture 提取数量；
- 路由清单；
- 测试命令与实际结果；
- 截图路径；
- 已知缺口；
- Codex 接 API 时只需要替换哪些 adapter；
- 任何未通过门禁。

不得只写“完成”。

## 16. 终止条件

只有以下全部成立才交接：

- 四层页面可构建；
- flow-proto 内嵌 Prompt 数据全部进入 fixture 或有逐条排除记录；
- 所有主要交互可用；
- build/typecheck/test 通过；
- screenshot 已生成；
- result 文档已写；
- 未修改授权范围之外的文件。

