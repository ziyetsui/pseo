# 2026-09-04 前端受保护 Preview 部署记录

前端静态产物已上传到 Cloudflare Pages Preview，受保护入口 [beta.ancher.site/zh-CN/prompts](https://beta.ancher.site/zh-CN/prompts) 的 HTTPS 与匿名 Access 门禁已通过。用户已登录；Access 多域名预设 Cookie 重定向修复完成，应用内浏览器的有限认证 smoke 已通过主页、搜索、展开、详情、图片分类和返回主页。修复后匿名请求仍受 Access 保护；本次没有执行全站线上 E2E。

本次使用 `visual-fixture`，供受保护的视觉与交互验收；`productionRelease=false`。CMS public 内容、snapshot 和 Git mirror 没有因本次操作发生变更，未执行内容审核或正式生产发布。

## 部署与来源

| 项目 | 本轮记录 |
| --- | --- |
| Pages 项目 | `pseo-internal-beta-preview` |
| 环境 / branch | `Preview` / `frontend-design` |
| Deployment ID | `93ffa110-7fe2-42f2-9708-744fbd3364c3` |
| 固定部署入口 | [93ffa110.pseo-internal-beta-preview.pages.dev](https://93ffa110.pseo-internal-beta-preview.pages.dev) |
| Branch 入口 | [frontend-design.pseo-internal-beta-preview.pages.dev](https://frontend-design.pseo-internal-beta-preview.pages.dev) |
| 来源范围 | 隔离捕获的前端目录，160 个文件；包含未提交的工作区变更 |
| Source digest | `sha256:bd0243884fd100da7d048839456bda448ba7173e53e90986797f34d9741d774a` |
| Fixture revision | `sha256:73d488642d1168a16137b8ec48eb567e032d2393df24c343b26720d99d993948` |
| Artifact digest | `sha256:65ccf580155aa0c05c4ab87b92f6f9ce8432615a1e3835e2abdb959febf72f0a` |
| 上传产物 | 425 个文件，其中 77 个 HTML；`proto/` 已排除 |

Pages 来源标签为 `0ae558e`，它只是此次上传的 Git 元数据，不能代表包含未提交变更的完整构建来源；本次来源与产物分别由上表 digest 标识。没有将当前并发工作区的全部修改提交或合并。

域名切换后追加逐文件复核：425 个 artifact 文件和 160 个 source 文件的 hash 与字节数均与本轮记录一致，当前运行产物无漂移，无需重建；以下已通过门禁仍对应同一来源与产物。

## 实际检查

| 检查 | 结果与范围 |
| --- | --- |
| ESLint | 通过，0 错误、13 条现有 `@next/next/no-img-element` 警告 |
| TypeScript | typecheck 通过 |
| 前端单测 | 22 个测试文件、138/138 通过 |
| 生成 API 合同 | `generate-api.mjs --check` 通过，与 Backend OpenAPI 一致 |
| Next 静态构建与 finalizer | 通过，固定到上表 fixture revision |
| 最终产物链接 | 4,281 个链接检查通过 |
| 本地静态 E2E | `accessibility.spec.ts` 与 `journey.spec.ts` 桌面/移动端 28/28 通过；测试重试为 0 |
| Artifact 检查 | 77/77 HTML 带 noindex；robots 禁止抓取；headers 带 noindex；0 个 symlink、超限文件、敏感模式命中和 proto 路径 |
| 根 compiler 合同 | validate 通过：2 documents、4 taxonomies、4 surfaces；build 通过：1 locale、9 files；infra tests 18/18 通过 |

前端 E2E 在上传前的同一静态 artifact 上执行，覆盖五个主要页面、320/375/768/1024/1440 宽度、严重/关键 axe 问题、键盘入口、禁 JS 主体、404/缺译文、图片/视频 L1→L4、筛选和浏览器历史、草稿刷新保留。它不代替认证后的线上 smoke。

隔离目录的 `pnpm lint/test` 首次因自动依赖安装检查要求 TTY 中止，随后使用现有 `node_modules/.bin/eslint .` 与 `vitest run` 执行相同脚本通过；未安装或清空依赖。Playwright 首次因 macOS sandbox 拒绝 Chromium 启动，获执行权限后一次运行通过，未改测试。根 compiler build 使用工具允许的系统临时目录；compiler revision 为 `sha256:133521b6a07f71ad2455e1e4bd25634cabf3f79c5643a2e81ce87c4c90952a01`，仅为工程 fixture 合同验证，未作为本次站点内容来源。

## 域名与 Access

| 阶段 | 当前证据 |
| --- | --- |
| 当前目标选择 | 用户已明确批准 `beta.ancher.site` 的具体 Pages 绑定与 CNAME 配置 |
| Cloudflare zone | `ancher.site` 已 active，UI 已确认；apex 的现有 Worker 未改 |
| Pages custom domain | 2026-09-04 14:01:31.298 UTC 读回 status=active、verification=active、validation=active |
| DNS | `beta.ancher.site` CNAME → `frontend-design.pseo-internal-beta-preview.pages.dev` 已保存并完整 UI 回读，proxied、TTL automatic；记录总数从 73 增至 74 |
| Access | 已把 `beta.ancher.site` 保存为现有应用的第三个目标，成功通知与 targets popup 均已回读；原两个目标及两条策略保留，owner/service 条件未改 |
| 登录重定向修复 | 同一 Access 应用的 `eager_redirect_cookie_setting` 从 true 改为 false；launcher domain 选择现有 `beta.ancher.site`，UI 确认保存成功；三个目标与两条策略均保留 |
| DNS/TLS/匿名线上检查 | 公共 DNS A 查询成功；2026-09-04 14:02:04.330 UTC 正常 DNS 请求 `beta.ancher.site` 通过 TLS 证书验证，返回 HTTP 302 至 Access；固定部署及 branch 入口也已返回 302 |
| 修复后匿名复核 | 2026-09-04 14:11:32.028 UTC 仍为 TLS verified、HTTP 302 至 Access，未放开匿名访问 |
| 浏览器入口检查 | 应用内浏览器成功显示 Cloudflare Access 登录页，包含 Email 与 Send login code；Chrome 环境仍报 ERR_CONNECTION_CLOSED，未阻止应用内浏览器与 HTTPS 请求通过 |
| 旧目标 | `beta.ancher.space` 标为 superseded；既有 Pages 注册及 DNS 配置保留，Pages status/verification/validation 均 pending，原 zone 仍待 nameserver 激活 |
| 认证线上 smoke | 有限范围通过：IAB 使用用户既有登录会话打开真实主页，title 为 Image and video prompts · Prompt Library，H1 为 Somebody already wrote this，34 prompts；3 个 stylesheet 且截图样式正常，robots 为 noindex,nofollow；搜索 Gym mirror selfie 从 34 条筛为 1 条，展开 Prompt、图片、来源和 Generate image 详情链接正常 |
| 详情与分类导航 | 点击展开内容的 Generate image 内链进入真实详情，正文、作者、来源、占位符区域加载；main 内两张图片均 complete 且 naturalWidth>0，robots 为 noindex,nofollow，水合后 iPhone radio 可用。点击 Images 进入图片分类，H1 为 Image prompts、显示 22 of 22；再点 Home 返回正确主页，无旧 `.space` 回跳 |

Pages 绑定首次曾被自动审批在执行前拒绝，用户随后明确批准，该授权缺口已解决。域名初始化阶段曾出现 TLS SSLEOFError、无 HTTP 响应；上述最终 TLS 验证与 302 结果已取代该失败状态。保留 Chrome 连接异常作为该浏览器环境的未解决现象，不将其等同于域名或 Access 门禁失败。

用户首次登录后曾被带到未激活的旧 `beta.ancher.space` 域名而失败。多域名应用的 Eager redirect cookie 会依次访问各域名预设 Cookie，关闭后改为访问目标域名时设置；此行为与本次重定向现象一致，见 [Cloudflare 官方说明](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/#multi-domain-applications)。保存时 launcher 自定义 URL 为空触发必填，选择已存在的 `beta.ancher.site` 后保存成功。修复后从干净入口重开已到达真实前端，未删除旧域名资源或更改 owner/service 准入条件。

详情实测路径为 `/zh-CN/prompts/image-analysis-overall-scene-provocative-gym-2019849202591789460`，标题为 Gym mirror selfie under blue-purple LED；图片分类路径为 `/zh-CN/prompts/image`。此流程只验证站内导航、加载和控件可用，未操作外部生成。

## 验收范围与发布状态

本次部署和登录修复已完成上述有限线上验收。线上 404、其余路由和全站自动化 E2E 未覆盖，不作为本次修复的未完成步骤；本地 28 项 E2E 仍只代表上传前的本地静态检查。

如需正式内容上线，继续执行独立的 CMS 人工审核 → immutable public snapshot → mirror → production deploy/smoke 流程；本记录不推进该流程状态。

摘要字段保存在同目录 `receipt.json`。原始 receipts、构建和测试日志保留在本轮隔离临时目录，没有把完整日志、个人邮箱、凭据或后台内部 URL 纳入此交付记录。
