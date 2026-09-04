# 前端重建验收 — 2026-09-04

本轮在用户确认主动清空的 `frontend/` 上重建。采用 Next.js App Router、React、strict TypeScript、CSS、Tailwind；三个 subagent 分别负责 API、视觉组件和 Recipe/文档。保留工作区其他并发修改，没有恢复旧前端整包、提交 Git、推送或部署。

## 实现范围

- `AGENTS.md`：技术边界、真实接口、CMS-first、五页定稿与 L1–L4 跳转、无障碍及验收约束。
- `src/components/`、`src/styles/`：Quotations、Images/Videos Deck、Anthology、Recipe 的选中母版；真实路由、搜索筛选、Deck 键盘/边界、全文展开/复制、变量替换、目录和持久 scratchpad。
- `src/lib/api/`、`src/lib/catalog/`：从 OpenAPI 生成 DTO/runtime schema；固定 revision 的只读目录、完整分页与全文，正式数据失败不回退样本。
- `src/site/`、`src/app/`：locale、独立静态页面、metadata、JSON-LD、Blog 静态投影、sitemap/RSS/robots、真实 404。Blog 没有母版，属于派生页面。
- `scripts/`：设计提取、API 合同生成、静态输出/样本隔离检查、截图与本地正式数据 smoke。

## 实际工程检查

| 检查 | 本轮结果 |
| --- | --- |
| `pnpm lint` | 0 errors；9 条 `@next/next/no-img-element` 提示。当前为有尺寸的静态导出原生图片，未隐藏这些提示。 |
| `pnpm typecheck` | 通过。 |
| `pnpm test` | 3 个文件，24/24 通过：API/目录 14、Recipe 4、Article adapter 6。 |
| `node scripts/generate-api.mjs --check` | 生成物与 Backend OpenAPI 一致。 |
| `pnpm build:visual` | 通过；56 个 HTML 页面，Next 显示 58 个静态生成项。 |
| `pnpm check:static`（visual） | 通过；56 个 HTML、3110 个内部链接；无假 `href="#"`、无 iframe/srcdoc，检查 noindex 和路由目标。 |
| `FRONTEND_TEST_URL=http://localhost:61091 pnpm test:e2e` | 对真实静态导出运行，28/28 通过。不是只对开发服务器测试。 |
| `pnpm build`（public-api，固定 revision） | 通过；详见 `public-build.json`。 |
| `pnpm check:static`（public） | 通过；13 个 HTML、202 个内部链接；核对允许的 Prompt 路由，并检查未授权 fixture 标题/ID 不进入 HTML/JS/JSON。 |
| `node scripts/smoke-public.mjs` | 7 个真实静态页面及 2 个真实 404 通过；检查 JSON-LD 与无 JS 主体，详见 `public-smoke.json`。 |
| Live FastAPI integration | 2/2 通过，覆盖实际 public GET 合同、4 种排序、3 种时间窗、全文/revision、禁用语言与缺失详情；详见 `api-contract.md`。 |
| CMS seed/Preview projector 单元测试 | 21/21 通过。没有访问 CMS DB，也不代表 live draft Preview 已接通。 |
| 根 compiler validate/build | `node infra/bin/content.mjs validate` 和 `build --output infra/generated/static` 通过。 |
| `node --test infra/tests/*.test.mjs` | 18/18 通过。 |

28 个浏览器检查覆盖两条图片/视频 L1→L2→L3→L4 路径、直达/返回/reload、URL 同轴 OR/跨轴 AND、Deck 单一可交互卡/左右键/空结果、TOC 编号、scratchpad、五页无 JS 正文、404/未启用译文、320px 和 768/1024px 布局、桌面/手机以及暗色/reduced-motion。

五页执行 axe WCAG 2 A/AA、2.1 AA 规则，最终无 critical/serious violation。此结果不是完整人工 WCAG 2.2 认证，也不是全浏览器兼容性保证。

整套 28 项通过后，Recipe 仅补齐原型 quirks-mode form 的显式底部间距与 token 行高；该局部修改另跑 Recipe 4/4 单测及 1440/375px 布局复测，通过后再执行最终 public build、静态检查和 HTTP smoke。

## 移动 Lighthouse

本机静态 HTTP 服务、Lighthouse 13.4.1、Headless Chrome 151，mobile/Moto G Power 模拟；网络 RTT 150ms、吞吐 1638.4Kbps、CPU 4× slowdown。测量时没有同时运行自动化截图/回归。以下是实验室单次测量，不能替代线上真实用户 Core Web Vitals。

| 最终首页构建 | Performance | Accessibility | SEO | FCP | LCP | CLS | TBT |
| --- | --- | --- | --- | --- | --- | --- | --- |
| visual-fixture，35 条 | 98 | 100 | 66 | 1.4s | 2.4s | 0.011 | 20ms |
| public-api，本地 1 条 | 98 | 100 | 63 | 1.2s | 2.3s | 0.011 | 50ms |

报告为 `lighthouse-visual-hub.json`、`lighthouse-public-hub-final.json`。字体本地化前同一本地 public 首页 Performance 为 86（`lighthouse-public-hub.json`），使用原样 Inter 的本地副本后复测为 98。没有改变测试节流设置或为测量禁用业务代码。

Performance/Accessibility ≥90 与 CLS <0.1 达标；**SEO 总分未达到 90**。最终 public 报告唯一失败的有权重 SEO 项为 “Page is blocked from indexing”：本地样本按内容资格保留 meta noindex，未配置生产站点时 robots 也禁止抓取；视觉样本同样必须 noindex。没有为提高分数移除这些约束。正式已审核且具有可索引资格的部署需要单独复测，不能把本地评分写成正式 SEO gate 已通过。

## 验收中发现并修复的问题

- 原始 scoped `overflow-x:hidden` 破坏 sticky；改为 clip，并修复编译产物中丢失的 backdrop blur。
- 加载边界使无 JS 正文落在 hidden Suspense 容器；移除该边界，静态正文直接可读。
- 多 root layout 的默认 404 缺少语言/样式；使用 Next 本地文档支持的 `globalNotFound` 完整文档。
- 筛选计数、L3 正文标记与状态标签对比度不足；保留颜色关系并加深至可读范围。
- L4 遗留的中文变量 note 不属于最终母版；仅从视觉 fixture 排除，真实公开 note 仍按数据展示。
- L4 母版在 quirks mode 中有默认 form 底距；在 standards mode 显式保留该间距与 token 行高，使步骤 03 两宽坐标与参考一致。
- 外部 Inter 请求拖慢加载；同一字节字体已放入 `public/fonts/` 并保留 OFL 与来源/hash，字体栈和字形不变。
- 早期 public build 的 `no-store` 被 Next 判为动态；static adapter 使用包含固定 revision 的 fetch cache key，仍校验 schema/header/body/revision。

失败的中间轮次用于定位以上问题，最终通过结果来自修复后实际执行，没有删除断言或把失败改为跳过。

## 视觉与文案证据

母版 hash 和选中 variant 见 `reference-manifest.json`；逐区文案定位、派生内容及真实性差异见 `copy-map.md`。首屏截图在 `reference/`、`implementation/`。早期首屏截图未等待所有远端图片，不能凭其空白媒体判定一致；后续有加载检查的 section 截图作为主体/页尾证据。

`visual-review.md` 记录 L1–L3 的 14 对截图、54/54 个可见图像出现位置加载成功、无横向溢出及实际看图结论。其他宽度和 Recipe 的补充结论分别见 `responsive-review.md`、`recipe-visual-review.md`。报告明确区分原样还原、功能性修正和派生模块；没有声称零像素差或给出无依据的相似度。

## 数据与发布状态

视觉样本：35 条，revision `sha256:268ea6de403be07d656c4c566213bd6bf6a0585cefd84d35bea8785bbcd080a4`，显式 visual-fixture/noindex。

本地 public 合同：revision `sha256:133521b6a07f71ad2455e1e4bd25634cabf3f79c5643a2e81ce87c4c90952a01`，1 条 zh-CN Prompt、0 篇 Article、en 禁用。它是本轮仓库只读合同 fixture，不证明线上最新 CMS snapshot。`sourceMirrorSha` 未提供，`productionRelease=false`。

后端尚无 Article/合集/创作者详情/生成 HTTP 能力；前端已有相应静态读取或真实筛选入口，没有猜测接口。没有 `actions.tryUrl` 时不启用 Generate。受保护的 live CMS draft Preview 本轮未启用；旧 preview-loop 未执行。全部具体边界见 `contract-gaps.md`。

本轮没有 CMS editorial/rights approval、CMS public 变更、mirror 写入、生产部署或生产 smoke；本地构建与 smoke 不冒充这些阶段完成。

## 后续用户调整：移除复制按钮、按内容类型显示 CTA

2026-09-04：按用户要求移除 L1–L4 与 scratchpad 的复制按钮及 CopyButton/剪贴板状态代码。图片/视频 CTA 分别显示 Generate image / Generate video，未分类内容显示 Generate。单条列表 CTA 保持进入对应 L4；真实生成链接的可用性规则不变。首页通用 CTA 分为图片/视频两个分类入口。

- TypeScript、ESLint（0 errors，原有 9 条 img warnings）、visual build 与静态检查通过：56 个 HTML、3221 个内部链接。
- 单测 23/23 通过。复制功能已删除，因此移除其剪贴板失败测试，保留并更新变量、原文和无复制按钮的验证。
- 两类内容的桌面/手机 L1–L4 链路均通过，验证 CTA 名称、真实 href、复制按钮缺席和 L4 未提供生成链接时的禁用状态。首次测试误把模型首条内容假定为视频；根据混合内容事实改为选择实际类型后通过，没有修改内容分类来迎合测试。
- 最后整套浏览器检查 27/28 通过，一次桌面 scratchpad 焦点检查失败；该检查随后的独立三次复测均通过。未能稳定重现这次开发服务器焦点失败，未删断言、添加重试或把该完整轮次写成 28/28。

这些结果属于本地前端调整；没有重新运行生产发布或线上 smoke。

## 2026-09-04 — L1 Magnetic / continuous peek

Replaced Quotations L1 with the selected `proto-continuous-peek.html?v=2` Magnetic design, maintaining dark default and typed Generate-to-L4 links. `magnetic-visual-review.md` and `magnetic/measurements.json` hold this round's visual evidence; old L1 screenshots are superseded.

Typecheck passed; lint 0 errors (9 pre-existing static image warnings); 23 unit tests passed; visual build passed; complete E2E 31 passed / 1 intentional mobile fine-pointer skip. Final affected journey/Magnetic rerun 13 passed / same skip. Static checks passed (56 HTML pages, 3116 local links). Root validate/build and 18 infra tests passed. Initial Chromium attempts were blocked by process sandbox; reruns with authorized browser process escalation succeeded. No production deployment or CMS/mirror mutation.
