# 前后端全链路检查 — 2026-09-04

## 结论

本地匿名公共读链 `compiler → Backend API → revision 固定的前端静态构建 → 浏览器` 已跑通。CMS 在一次性真实 PostgreSQL 数据库中的 proposal 写入、幂等重放、审核与快照也已验证。

**不能据此宣布整个产品开发或发布链完成。** 当前 CMS 镜像与 root compiler 的输入合同不兼容，CMS 草稿预览、撤下事件派发、生产部署回执尚未闭环。本次没有发布内容、推送镜像或部署生产。

## 数据模式与验证边界

| 链路 | 实际输入与结果 |
| --- | --- |
| 用户当前 localhost:3000 | `visual-fixture`，34 条视觉样本；不调用 CMS，也不是后台内容接通的证据 |
| localhost:8000 公共 API | 仓库合同 fixture，1 条 Prompt；已重启加载本次缓存修复，health 与真实 HTTP 缓存回归通过 |
| 独立公共读链 | 临时 API、compiler 和前端使用同一 revision；2 项实际 HTTP 集成测试通过，导出 19 HTML，245 个本地链接检查通过 |
| 公共产物浏览器检查 | 12 个 zh-CN 内容/分类页面通过，包含嵌套 model/task/style/subject；2 个缺失路由真实返回 404，JSON-LD 可解析，首页和详情无 JS 可读 |
| noindex 工程 Preview | `prepare-preview` 成功生成 146 个文件；它消费仓库 fixture，不是 CMS draft Preview |
| CMS 真实数据库 | 两个迁移、实际 endpoint handler 写入 201、幂等重放 200、安全草稿、合成审核 fixture 与一条合格快照通过；临时数据库已删除 |
| CMS → mirror → compiler | **失败**：当前合法 mirror 不包含 `content/surfaces.json`，root compiler 抛 ENOENT；不能用仓库 fixture 冒充 CMS surface 政策补洞 |
| 正式上线 | 未执行、未验证；没有新的 CMS public、mirror synced、deployment 或 smoke receipt |

公共 API/编译产物 revision：`sha256:133521b6a07f71ad2455e1e4bd25634cabf3f79c5643a2e81ce87c4c90952a01`。这与 34 条视觉样本的 revision 不同，二者没有相互替换。

## 本次修复

1. **后端 ETag 查询碰撞。** 原实现把已解码参数直接用 `&` 拼接，导致包含编码分隔符的搜索与另一组真实筛选共享缓存标识，错误返回 304。改为规范 percent-encoding；回归验证不同查询返回正确 200，同义参数重排仍返回 304。
2. **CMS proposal 真实数据库 500。** 数字用户 ID 被转为字符串后不能写入 Payload 的 actor 关系；现在保留原生 ID 类型。此前 mock 测试没有发现这个问题。
3. **CMS fixture 与迁移后测试路径。** evidence 行不再错误设置 `cleared`；权利判断只在 source 行。六个快照测试改为消费已移动的真实 mirror 模块。
4. **CI 构建配置失效。** 视觉门禁显式使用 `build:visual` 并检查导出；Preview 使用新增 `scripts/check-public-frontend.mjs`，临时启动 API、校验 revision、构建前端、验证静态链接，再合并 noindex 产物。未改生产权限或启用新部署。
5. **公共浏览器 smoke 漏测嵌套页。** 改为递归发现导出路由，覆盖模型、任务、风格和主题页。
6. **详情占位符点击层被遮挡。** 原生 radio 增加正确层级和滚动间距，文字层不截获指针。所有详情页选择/重置的桌面定向回归及移动端全量用例均通过。
7. **交互期间对比度与减少动效。** 占位符选项前景/背景即时同步切换，保留边框/按压动效；为 reduced-motion 补 scoped 规则，使移动端 touch 样式不能恢复缩放。没有修改测试或正常 Magnetic / peek 视觉。

首页 Magnetic、提示词预览样式、分类布局与既定 CTA 视觉未在本次审计中修改。

## 工程门禁

| 范围 | 实际结果 |
| --- | --- |
| Backend | Ruff format/check、strict mypy 通过；73 tests；branch coverage 90.53%；OpenAPI 再生成无漂移 |
| Frontend | lint 0 errors / 13 个既有 img warnings；typecheck 通过；138 unit tests；API 类型与 OpenAPI 一致 |
| 全站浏览器回归 | 首轮 78 项：71 passed、4 failed、3 个已有条件跳过；修复后覆盖全部失败的定向回归 9 passed / 1 已有条件跳过，未通过删除断言绕过问题 |
| CMS | `pnpm verify`：typecheck + 200 tests 通过；隔离现有环境文件的同源 Next build 通过 |
| CMS 默认本机构建 | **失败**：现有旧 Git 发布环境变量触发 fail-closed guard；未删除保护或静默修改本机配置 |
| Root compiler | validate、build、18 tests 通过 |
| Mirror consumer | 40 tests 通过；当前验证模式为 legacy-template，不是已完成的线上 mirror run |

CMS 数据库验证调用实际 Payload handler，但以合成已鉴权请求执行。它没有覆盖 HTTP 登录/API key middleware、Admin 浏览器、Hyperdrive 或 Cloudflare Worker 运行。详见 [CMS 检查记录](../../cms/docs/chain-audit-2026-09-04.md)。公共浏览器结果见 [public-smoke.json](../../frontend/evidence/public-smoke.json)。

首轮浏览器失败来自 radio 点击层、颜色过渡短暂低对比度、移动端 reduced-motion 优先级。专门的前端 agent 基于当前 CSS 做增量修复，保留布局、目标颜色、边框和按压反馈；桌面/移动端 placeholder axe、全部 L4 选择/重置和 Magnetic 定向回归全部通过。详见 [修复验证记录](../../frontend/evidence/frontend-regression-fix/README.md)。首轮失败结果与修复后定向结果分别保留，没有声称修复后再次全量跑过 78 项。

临时 API 脚本另验证了 SIGTERM 取消路径：退出码 143，自己启动的 API 已停止；正常结束也会关闭子进程，超过三秒则强制清理自己的进程组。

## 尚需接通的环节

1. **CMS snapshot/mirror/compiler 合同。** CMS 没有导出 canonical surface 数据，mirror allowlist 也不接收；compiler 与 Backend adapter 需要 surfaces/schema 等完整输入。另有 site canonicalOrigin、最后一条内容撤下后的空 locale、Article 及版本绑定差异。必须明确版本化 CMS 合同和消费者迁移，不能关闭校验或伪造分类/索引资格。详见 [发布缺口工程计划](2026-09-04-publication-gap-plan.md)，包含证据及七步实施顺序。
2. **CMS 草稿 Preview。** 旧脚本仍输出 `PSEO_CONTENT_SOURCE=cms-preview` 配置，而新前端只接受 `visual-fixture/public-api`。当前工程 Preview 不替代经过鉴权的 CMS 草稿投影。
3. **撤下与发布回执。** withdrawal 记录 `syncDispatchMode: disabled`，尚无已验证派发消费者；mirror workflow 完成不等于生产部署，前端 manifest 也不证明 CMS export revision / manifest hash / deployment / smoke 的完整回执链。
4. **Worker 部署包。** checked-in `worker_catalog.json` 被 schema-v2 校验拒绝，需从获准 mirror provenance 重新生成并验证；本次没有猜测 mirror SHA 或部署旧包。
5. **CMS 运行配置与真实鉴权。** 清理退休发布配置后还需验证实际 HTTP 登录、proposal 权限和部署环境；隔离构建与直接 handler 测试不能替代这些环节。

## 复跑公共工程链

安装 frontend/backend 锁定依赖后，在仓库根目录执行：

```sh
node scripts/check-public-frontend.mjs
node infra/bin/prepare-preview.mjs
```

脚本使用临时空闲端口，关闭自己启动的 API，不影响 8000。它会把 `frontend/out` 更新为 public-api 工程产物；恢复视觉产物使用 `pnpm --dir frontend build:visual`。开发服务器 `pnpm dev` 仍显式使用视觉样本。
