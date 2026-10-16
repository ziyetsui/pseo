# 按变现场景浏览实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 在当前 beta 全量目录上增加可审计的变现分类、四层导航、双语与页脚第五列，并完成合并和线上验证。
**Architecture:** 显式分类文件提供节点及成员边，构建层验证并生成去重视图。独立路由复用现有样式与详情，不改变公共 API taxonomy；分类数据不依赖运行时关键词匹配。
**Tech Stack:** Next 静态导出、React、TypeScript、JSON、Vitest、Playwright、现有 Pages 发布。
**Spec:** ../specs/2026-10-16-monetization-views-design.md；../specs/2026-10-16-monetization-views-acceptance.md。

## Global Constraints

- 8 个大类、40 个候选场景；零成员分类不发布；保持 en/zh-CN。
- L4 复用现有 URL；原文、署名、来源、reconstruction 与权利状态不改变。
- 全量内容均有审计结论；成员有正向证据、direct/adaptable、双语改编说明及源 revision。
- 计数按 contentKey 并集；网站与其所附提示词归一。
- 页脚五列，第五列最多 6 项；320/375px 不整页溢出。
- pnpm 命令设置 pnpm_config_verify_deps_before_run=false，不修改共享依赖。
- beta 保持 noindex，最终发布文件数不超过 20,000。
- 用户已明确授权开发、合并、更新、部署；不再次请求相同权限。

## Review Focus

- 网站项目和 Prompt 双入口造成重复计数：任务 2 的别名夹具验证。
- negative prompt、截图 UI、源平台词造成误分类：任务 3 的反例测试与证据复核。
- beta 与目标仓库目录版本不同：任务 1 冻结完整集合，任务 3 验证覆盖。
- 新五列页脚与 L3 条件在窄屏失效：任务 4 的浏览器 320/375px、返回恢复验证。
- RSC 附属文件超过 Pages 上限或部署错站：任务 5 校验实际文件与 beta revision。

### Task 1: 对齐当前 beta 基线
**Files:** 仅同步 beta 已存在代码/数据的必要差异；保留目标仓库发布包装，更新本任务 baseline 回执。
- [x] 检查目标 main、beta 工作区及公开页面版本，隔离任务分支，记录双方 SHA。
- [x] 将当前 beta 目录与必要组件合并入任务分支，逐个解决冲突，不覆盖无关工作区。
- [x] 运行既有类型检查与单元测试，记录基线失败及版本差异。
- [x] 提交基线对齐。

### Task 2: 独立分类投影
**Files:** 新建 `frontend/src/lib/catalog/monetization.ts`、`frontend/src/data/monetization-taxonomy.json`、成员与审计 JSON；测试 `frontend/tests/monetization.test.ts`。
**Interfaces:** `monetizationGroups(catalog)`、`monetizationScenarios(catalog, groupSlug?)`、`monetizationEntries(catalog, scenarioId?)`、`monetizationForContent(catalog, contentId)`；对象提供稳定 id/slug、双语文本、href、count，成员提供原引用与 fit/notes。
- [x] 先写测试：8/40 定义、双语、未知 ID/父类、悬空边、重复边、同项目 Prompt 归一、集合并集。
- [x] 运行测试观察缺模块的失败。
- [x] 实现数据校验、别名索引和静态查询；保留公共 API Axis。
- [x] 重跑定向测试并提交。

### Task 3: 全量商业用途审计
**Files:** 新建离线分类脚本 `frontend/scripts/prepare-monetization.mjs`，生成固定成员/审计文件及 `frontend/evidence/monetization/` 回执。
- [x] 先写反例与审计完整性测试，观察失败。
- [x] 对全部真实内容按正向目标、明确的 taxonomy 与媒体说明提取候选；关键词只是离线候选工具。
- [x] 输出显式映射，每条保存证据字段/片段/理由；无相关与不确定项记录原因，不强制覆盖。
- [x] 每非空场景复核最多 5 条成员，覆盖 direct/adaptable；修正全部误归类。完整可重现统计与源哈希入回执。
- [x] 重跑数据测试，提交审计和固定映射。

### Task 4: 路由、页面与统一导航
**Files:** 新建 `components/Monetization.tsx`、场景筛选客户端组件及 `app/[locale]/prompts/monetization/...` 路由；修改 Browse、Chrome、导航索引、Recipe、WebsiteCases、必要样式和 i18n；测试 `monetization-navigation.test.tsx` 与 `e2e/monetization.spec.ts`。
- [x] 先写 SSR 入口/五列/目录/原 L4 的失败测试。
- [x] 实现目录、L2 场景卡、L3 成员和筛选、L4 反向关系；复用真实生成链接与现有媒体组件。
- [x] 首页新横向区域，页脚五列，完整索引新增全部非空分类；双语完整。
- [x] 测试直达/404、无 JS、两语言、桌面手机、筛选 URL/返回、完整生成正文。
- [x] 提交界面与导航。

### Task 5: 全站验证与发布
**Files:** 适用静态路由校验、验收回执及任务文档。
- [x] 运行类型检查、lint、全部单元、相关浏览器、完整 beta 构建与静态校验；检测文件数、原路由和正文完整性。
- [x] 使用 fresh-context reviewer 复审整个分支，修复 Critical/Important 并重跑对应检查。
- [ ] 创建工程 PR；适用 CI 通过后合并。区分源 beta 仓库与指定目标仓库，保留版本证据。
- [ ] 部署 beta，核对两语言 L1～L4、页脚、资源、别名和 revision，保存回执。只报告实际通过的结果。

## 执行记录

- 2026-10-16 用户确认书面规范后明确要求“开发 合并 更新 部署”。采用当前会话直接实施，最后一次独立复审；不再将已授权执行重复停在许可问题。
- Ruling: beta 当前数据版本与目标仓库不同，先做可审查的基线对齐；不得把旧目录当新功能基线。
- Ruling: 发布查询确认 beta 实际部署为默认分支457cafd，而非本地release的未合并ocean分支2e38b47。任务工作区已在开始产品改动前对齐457cafd；不夹带未合并视觉提案。新工作区 /Users/ziye/Developer/ancher pseo monetization；原工作区不改动。
- Ruling: 当前 beta 对部分无作者提示词网站案例已有明确标识的站点整理模板和生成入口。保留这个既有行为；不得新增伪造原文或删除已有可用模板。设计中的无提示词禁用规则只适用于也没有合法站点模板的情况。
- Ruling: 独立复核156条关系样本后，高风险场景改用已核验白名单；发布39个非空细分场景，电子刊物留在候选审计。全量2085个逻辑内容完成规则审计，1246个具备映射；不把抽样复核称为逐条人工审核。
- 实施验收：同步默认分支8570bbc的来源署名与BrowseRail修复。最终8大类、39个非空场景、1246个去重案例、1549条关系。广告相关121条候选逐条核验，保留82条。
- 验证通过：279个单元测试、12个双语桌面/手机浏览器测试、6个发布索引脚本测试；类型检查通过，lint无错误；完整Git-beta构建及静态检查通过（4581个HTML页面、272259条本地链接）。19345个发布文件，最大20849707字节。
- 内容revision：sha256:c46e51d0049c9eee2bad342189c1c71c2d55a2aa7a3eb761b267bd746189c46d。PR：https://github.com/ziyetsui/pseo/pull/51。指定streamify仓库与当前beta版本不同，本次在实际beta源仓库实现和发布，不声明已同步到streamify。
