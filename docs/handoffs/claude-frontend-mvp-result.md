# Claude 前端 MVP 交接报告

日期：2026-09-02  
前端基线：`6fb3a2a`  
验收 HEAD：`1e62e0f`  
分支：`main`（本地仓库，未配置远程）

## 结论

Claude 完成了 wireframe 数据驱动的前端 MVP；Codex 完成 internal beta 审查、修复和全量回归。当前版本可在本机直接查看：

- L1：`http://localhost:3100/zh-CN/prompts`
- L2：`http://localhost:3100/zh-CN/prompts/image`
- L3：`http://localhost:3100/zh-CN/prompts/models/nano-banana-pro`
- L4：`http://localhost:3100/zh-CN/prompts/country-miniature-stamp-poster`
- Blog：`http://localhost:3100/zh-CN/blog`

预览仅监听本机回环地址，使用 `infra/generated/preview-site` 的 noindex 静态包。

## 已交付范围

- 35 条去重 Prompt，来自四张 wireframe 页面。
- 21 位创作者、11 个模型、6 个合集、4 个展示层级。
- L1 Prompt Hub、L2 内容类型、L3 模型页、L4 Prompt 详情页。
- Blog 首页、文章详情、404、移动导航。
- 搜索、筛选、复制、变量替换、面包屑、SEO 元数据和 JSON-LD。
- 中文 `zh-CN` 首发版本。
- 数据快照日期：`2026-08-20`。

前端改动统计：`174 files changed, 27170 insertions(+)`。

## Codex internal beta 修复

1. 删除会让无 JavaScript 静态页面只显示“加载中”的 route loading 边界；现在真实正文直接出现在 HTML。
2. 修复 L3 在 375px 移动端从 714px 溢出的布局问题；当前 `clientWidth === scrollWidth === 375`。
3. 让 Prompt 代码块可键盘聚焦并带有可访问名称，消除严重级 axe 问题。
4. 统一创作者 handle 格式，避免 `@@handle` 或漏写 `@`。
5. Footer 使用真实仓库快照日期，不再显示占位文案。
6. 修复 L1 页面标题重复为“提示词库 · 提示词库”。
7. 扩展静态门禁，检查全部 55 个导出 HTML 的正文、H1、日期、handle 和隐藏 Suspense 缓冲。

## 最终门禁

| 门禁 | 结果 |
| --- | --- |
| ESLint | 通过 |
| TypeScript | 通过 |
| Vitest | 36 files / 336 tests passed |
| Next production build（webpack） | 55 static pages，成功 |
| Static output truth gate | 通过 |
| Playwright E2E | 42 passed / 0 failed / 12 intentional skips |
| Desktop/mobile axe | 14/14 页面零 violation |
| Responsive | 320/375/768/1024/1440 全通过 |
| Screenshots | 9 passed / 1 intentional skip |

完整命令和输出摘要见 `frontend/evidence/test-run.md`，截图见 `frontend/evidence/screenshots/`。

静态预览包：

- 路径：`infra/generated/preview-site`
- revision：`sha256:af603d869ff986c23b1d4e384573bca52c2e45f8c2d267dca61138e191d2bae9`
- 文件数：378

## 数据真实性边界

当前前端按用户授权，以 wireframe 中的完整 35 条数据作为 internal-beta fixture；这保证页面与 wireframe 的最小版本一致。

Git-native 发布链路目前只有 1 条 `zh-CN` Prompt 记录，另有 taxonomy 和 surface 记录。因此不能把前端 35 条 fixture 描述为已经全部进入 Git/API。Nano Banana Pro taxonomy 可从 API 返回真实实体，但当前成员数是 0；API 中的 current Git Prompt 仍是 GPT Image 2。

## 已知缺口

- 仅实现 `zh-CN`；尚未做多语言内容生产。
- 部分 X 媒体为外链热链，稳定性和授权仍需正式上线前处理。
- 模型官方资料不完整时保持保守描述，没有补造事实。
- Playwright 当前只覆盖 Chromium。
- CMS 是 mock-only beta；正式发布器还需解决 immutable bundle TOCTOU 与 outbox/pending 崩溃恢复。
- internal-beta 的 RSS/sitemap 按 noindex 策略保持空/受限；这不是 production SEO 版本。
- 正式域名构建必须设置真实的 `NEXT_PUBLIC_SITE_URL`。
- Cloudflare 远程预览尚未部署：当前缺少 `CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`，并且必须先配置 Cloudflare Access。`noindex` 不能替代访问控制。

## API 接入建议

页面只依赖 `ContentRepository` facade。接 API 时新增 `src/lib/content/api-repository.ts` 并实现现有接口，再在 `src/lib/content/index.ts` 切换 factory；页面组件不需要重写。

当内容从 35 条扩到 982+ 条时，搜索、筛选、排序和分页必须下沉到服务端/API，不能继续把全量数据发到浏览器再过滤。

## 启动与复验

```bash
pnpm --dir frontend exec serve ../infra/generated/preview-site \
  -l tcp://127.0.0.1:3100 --no-port-switching -n

cd frontend
pnpm lint
pnpm typecheck
pnpm test
NEXT_PUBLIC_SITE_URL=https://ancher.space pnpm exec next build --webpack
pnpm check:static
pnpm test:e2e
pnpm screenshots
```

本报告只描述前端 MVP 与 Codex internal beta 验收；工作区中其他未跟踪的 backend、CMS、content、infra 和 spec 文件属于并行项目工作，未被本报告擅自归属给 Claude。
