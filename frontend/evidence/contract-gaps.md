# 前端重建的接口与发布边界

记录日期：2026-09-04。范围为本次 `frontend/` 工程重建及已执行的本地接口验证；不代表 CMS、公开 Git 镜像或生产环境当前状态。接口验证细节见同目录 `api-contract.md`。

## 已实现接口和当前缺口

真实公开 HTTP 合同以 `backend/openapi/openapi.json` 为准。当前已实现并本地联调的读取包括 locale registry、home、Prompt 列表/详情、facets、model projection、category projection 和 health。前端通过生成 DTO、运行时 schema、分页闭合与固定 revision 校验后使用这些响应。

| 能力 | 当前事实 | 前端处理与后续责任 |
| --- | --- | --- |
| 合集详情 | 后端尚无 `/api/v1/collections/{slug}` | 原型模式的合集使用本地明确成员列表与 URL 筛选；当前 public catalog 的合集为空。合集页面/API 属于后续合同工作，不能把原型合集当作 CMS 已发布关系。 |
| 创作者详情 | 后端尚无 `/api/v1/creators/{handle}` | 已有来源和创作者关系用于署名、来源链接与目录筛选；不调用猜测的详情接口。创作者目录不等于完整作者资料服务。 |
| Article HTTP | 后端尚无 `/api/v1/articles`、`/api/v1/articles/{slug}`、`/api/v1/article-categories/{slug}` | Blog 使用独立的、经过校验的静态编译投影，详见下一节。不能声称 Article HTTP 已接通。 |
| 搜索建议 | 后端尚无 `/api/v1/search/suggestions` | 当前搜索使用已校验的完整同版本目录，不伪造建议接口。 |
| 生成/提交生成任务 | 当前公开 API 为匿名只读，没有生成写接口 | 只有内容合同提供有效 `actions.tryUrl` 时才能使用该链接；没有链接时按钮不可用。原型的 “Generate in bo” 不证明生成后端已经存在。 |
| 视频分类 | Prompt 查询支持 `contentType=video`；本轮真实本地快照没有视频记录 | 视频 Deck 的工程路由和原型交互可以验证，不能据此声明有已发布视频内容。本轮真实 category projection 联调使用 image。 |

## Blog 静态投影

`src/site/articles.ts` 通过显式 `FRONTEND_STATIC_DIR` 读取 compiler 产物；不直接读取 Payload DB，不把本地 Markdown 当作新的内容事实源。该读取器核对 build manifest、文件长度和 SHA-256、路径与 realpath 边界、全局 revision、locale、route membership、Article index/detail 一致性、类别成员和分页闭合。

- 未配置静态投影时，页面呈现 **unavailable**；这与已校验的空目录不同。
- 已配置但损坏、混合版本或不闭合的投影会阻止构建，不能静默降级为空列表。
- 本轮查看的本地 compiler Article index 为 **0 条**；没有把现有草稿文章包装成公开文章。
- 已有 Blog 列表、正文、类别与 metadata 的工程入口；这些页面没有本轮五页母版，属于同一设计语言下的派生页面，不能宣称 1:1 还原。
- 文章仍须经过 CMS proposal/draft、校验、人工 editorial/rights approval、immutable public snapshot、镜像和部署链；静态读取能力不授予发布资格。

## CMS Preview 未启用

CMS 已有受保护接口 `/api/internal/v1/preview-catalog?locale=zh-CN`，使用独立的 server-only Bearer，远端还需 Access/RBAC。其响应是 `CmsPreviewEnvelope`，字段包括 `promptText`、`media.src` 和 `meta.mode=cms-preview`，与公开 Prompt DTO 不同；当前投影限定于 35 条 wireframe 记录，并要求 private/no-store/noindex。

本次重建只实现显式 `visual-fixture` 与 `public-api` 两种数据模式，**没有启用受保护的 CMS draft Preview**。未读取 Preview 凭据、未改 Access、未调用线上 CMS。

历史 `cms/scripts/preview-loop-e2e.ts` 期待受保护前端响应具有 `data-internal-preview` 与 CMS revision 标记，并检查修改草稿后页面更新。该脚本与当前两个前端模式不兼容，本次未运行。恢复该能力需要独立 server-only Preview adapter、明确的运行模式和路由保护，不能借样本模式替代，也不能用 public API 读取草稿。

保留的 `src/data/wireframe/` 模块仅维持 CMS seed 的历史输入兼容；已通过的 CMS seed/projector 单元测试不等于 live Preview 联调或远程 CMS 内容已更新。`/api/internal/v1/public-snapshot` 则是专用 mirror worker 的 files/base64/manifest 导出，不是页面 catalog API，前端不取得其凭据。

## 本地 public 合同与视觉样本

| 数据范围 | 本轮已知事实 | 可得出的结论 |
| --- | --- | --- |
| 本地 `public-api` 验证 | 1 条 `zh-CN` Prompt：`/zh-CN/prompts/country-miniature-stamp-poster`；`en` 注册但禁用；媒体为空、不可用指标为 null | 证明前端能消费当前本地只读合同。该记录是仓库合同 fixture，不能当作当前线上 CMS 或正式站的发布证据。 |
| 固定目录版本 | `sha256:133521b6a07f71ad2455e1e4bd25634cabf3f79c5643a2e81ce87c4c90952a01` | 本轮联调绑定的本地 compiler/read-model revision；不是 CMS public snapshot revision、公开 mirror commit 或 deployment ID 的替代品。 |
| `visual-fixture` | 从用户提供母版 JSON 提取的 35 条内容，配合历史 seed 元数据还原设计和交互 | 仅用于本地或受保护视觉验收，必须 noindex。没有新增任何来源许可、人工审核或可公开状态。 |
| 35 条历史 CMS seed | seed 合同保持 draft / review required；本次未查询远程 CMS 状态 | 它们不是待直接发布的内容队列，不应因 UI 完成、样本存在或测试通过就进入公开 HTML/镜像。 |

正式数据构建要求显式 `FRONTEND_DATA_MODE=public-api`、API 地址和完整 `FRONTEND_EXPECTED_REVISION`。固定 revision 参与静态 fetch 缓存键，缓存与网络响应都执行相同校验；缺配置、版本不一致、坏 DTO 或分页漂移均 fail closed。视觉样本不会自动回填正式目录。

## 定稿文案仍需事实依据

下列事项保留为内容 owner 的具体核对项；本次没有替用户重新创作母版文案，也没有为了文案去伪造数据。

| 文案或统计 | 当前依据与限制 | owner 需明确的事实 |
| --- | --- | --- |
| 数量、模型成员、筛选结果 | 当前从实际 mode-specific catalog 计算；缺失互动指标保留 null。原型中的库级大数不能冒充当前公开目录数量。 | 正式 snapshot 的内容范围、指标观测时间与统计口径。 |
| “Free to copy” | 复制按钮可用只是产品动作能力，`actions.canCopy` 不是完整的许可声明；公开可见与署名本身也不能替代 rights review。 | 对每条内容适用的许可/授权或已批准署名政策，并确认这句全库文案适用于全部展示记录。 |
| “every one credited” / “every one links to its source” | UI 按合同显示现有作者与来源，未补造缺失作者；原型来源信息不等于人工审核完成。 | 当前公开集合是否逐条具备正确署名、来源链接，以及适用政策要求的其他信息。 |
| “Everything, in the order it gets copied” | 当前 API 没有 copy-count/copy-ranking 字段或统计接口。已实现排序来自后端 relevance/value/trending/newest 合同；value/trending 使用观测到的互动指标，不能声称是复制次数。 | 提供真实复制事件统计和排序合同，或由 owner 确认适用于当前实现的最终措辞。 |
| 来源忠实与 “text they posted” | 前端保留获得的完整文本、空白及变量替换语义；没有重新访问并逐条证明所有外部原帖的当前文本。 | CMS 中的来源证据、采集版本、原文/译文区分，以及现有正文与证据的一致性审核。 |

这些是正式公开时的数据/内容合同缺口，不影响本地工程验收本身。它们不能由通用 Agent 通过设置 `cleared`、`community_attributed`、`public` 或 `released` 来解决。

## 发布状态

本次任务完成的是前端工程和本地验证。CMS public、mirror synced、production deployed 和 production smoke 是相互独立的阶段：

- 未在本次任务中创建或批准 CMS proposal，未执行人工 editorial/rights approval 或推进 public 状态。
- 未写公开内容镜像、未启动 mirror Bot、未声明当前公开仓库已同步这些前端样本。
- 未执行生产部署或更改 Cloudflare、Access、DNS；本地 `next build` 和本地浏览器 smoke 不构成生产部署凭据。
- 未产生可证明正式上线的 CMS snapshot revision + mirror revision/manifest + deployment ID/URL + production smoke receipt 组合。

因此，本次不能报告 production `released`。后续应沿项目现行 CMS-first 发布链，由对应 owner 提供各阶段真实证据。
