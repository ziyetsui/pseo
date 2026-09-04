# Prompt Library frontend

Next.js App Router、strict TypeScript、CSS 与 Tailwind CSS。L1 采用 `../docs/wireframes/proto-continuous-peek.html?v=2` 的 Magnetic 原型和动效；L2–L4 来自 `../specs/images/flow-proto-full.html` 的 Images Deck、Videos Deck、Anthology、Recipe。协作规范见 [AGENTS.md](./AGENTS.md)。

## 本地查看

```sh
pnpm install --frozen-lockfile
pnpm dev
```

打开 `http://127.0.0.1:3000/zh-CN/prompts`。`dev` 显式启用隔离的视觉样本；保留母版英文文案。这个模式不会代表 CMS 审核或生产发布，所有导出页面和响应规则均 noindex。

按 2026-09-04 用户要求，全站默认 Linear 暗色，沿用母版暗色 token；系统浅色偏好不覆盖站点默认主题。

L1 `/zh-CN/prompts` → L2 `/image` 或 `/video` → L3 `/models/{slug}` → L4 `/{promptSlug}`。页面可直接打开和刷新，筛选写入 URL，支持浏览器前进/后退；模型全文、变量、Deck 键盘、目录与本地 scratchpad 均可用。复制按钮已按用户要求移除；图片/视频 CTA 分别为 Generate image / Generate video，列表入口进入对应 L4。

## 公共数据构建

数据只通过现有匿名只读 Backend API 获取，类型由 OpenAPI 生成。构建完整遍历分页并取得全文，固定同一版本；任何 schema、revision、locale 或数量不一致都会失败。

```sh
FRONTEND_DATA_MODE=public-api \
FRONTEND_API_URL=http://127.0.0.1:8000 \
FRONTEND_EXPECTED_REVISION=sha256:<完整64位摘要> \
FRONTEND_SITE_URL=https://<实际公开域名> \
FRONTEND_STATIC_DIR=/absolute/path/to/verified/infra/generated/static \
pnpm build
pnpm check:static
```

`FRONTEND_SITE_URL` 在 public-api 模式下必填，必须是实际公开站点的 HTTPS origin，不得包含用户名、密码、路径、query 或 fragment。缺失或非法值会使构建失败。即使 Backend API 和静态服务在本机运行，也必须使用实际 canonical origin，不能把 localhost 作为公开域名。视觉 fixture 不要求此配置，仍保持 noindex 和 robots 全站禁抓取。

`FRONTEND_STATIC_DIR` 可选。配置后必须与 API 同 revision，并通过 manifest 的文件哈希校验；Blog、RSS 与 sitemap 从该不可变编译投影读取。L1/Blog 仅在已验证 sitemap 中具备资格时输出 index；Prompt 同时遵守 API 与 compiler 的更严格资格，避免 Internal Beta 页面被误索引。导出时 sitemap 中每个 URL 必须对应可索引且 canonical 一致的 HTML。未配置时 Blog 明确显示不可用，Prompt 继续采用 API SEO 合同。未启用/未审核的 locale 不生成内容页，不回退为其他语言。

输出为 `out/`。`out/frontend-build.json` 记录数据模式、revision、允许的 Prompt 路由与可选 mirror SHA；这份本地构建记录不证明 production release。当前实现不需要 CMS、Git mirror 或部署凭据，不启用 CMS draft Preview。

## 验证

```sh
pnpm generate:api
node scripts/generate-api.mjs --check
pnpm lint
pnpm typecheck
pnpm test
pnpm build:visual
pnpm check:static
pnpm dev
# 另一个终端，或对已运行的本地静态服务设置 FRONTEND_TEST_URL
pnpm test:e2e
```

本机后端联调：`FRONTEND_CONTRACT_API_URL=http://127.0.0.1:8000 pnpm exec vitest run --config tests/api.integration.config.ts`。

从仓库根目录运行 `node scripts/check-public-frontend.mjs` 可一次验证 compiler → 临时本机 Backend API → 同 revision 前端构建 → 静态链接检查。先安装 frontend 与 backend 锁定依赖；脚本自行启动、关闭临时 API，不占用正在使用的 8000 端口。它使用仓库合同 fixture，不代表 CMS public snapshot 已接通。运行后 `frontend/out` 是 public-api 工程产物；如需视觉样本导出，重新运行 `pnpm build:visual`。

对该 public-api 导出启动本机静态服务器后，运行 `FRONTEND_STATIC_TEST_URL=http://127.0.0.1:<端口> node scripts/smoke-public.mjs`，检查全部 zh-CN 嵌套分类/详情、真实 404、结构化数据和无 JavaScript 内容。CI 的 Preview artifact 使用同一工程链并追加 noindex；它不是 CMS 草稿预览或生产部署。

设计 CSS 由 `node scripts/extract-design.mjs` 从母版提取并限定作用域，交互/可访问性补丁在 `src/styles/interaction.css` 与 `globals.css`。`evidence/` 记录实际视觉截图、文案映射、接口验证和剩余外部限制。Blog 为同一体系的派生设计，原型没有对应定稿。

后端尚无合集、创作者详情、Article HTTP API 或生成接口。相关浏览使用已有筛选/静态文章投影；L4 的 Generate 按钮统一打开 `https://bo.video/home`，正文仍完整可读、可选择。Anthology scratchpad 的生成链接仍依赖有效的 `actions.tryUrl`。
