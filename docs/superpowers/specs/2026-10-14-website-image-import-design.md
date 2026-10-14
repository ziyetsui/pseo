# Website 与 GPT Image 案例接入技术设计

## 目标与授权
用户要求新增 Website category；沿用 beta.ancher.site/zh-CN/prompts#tasks 的视觉与交互；按现有 node/edge 规则导入本地网站案例及 awesome-gpt-image-2 全部图片案例；工程 PR 合并并部署。用户明确要求长任务一次执行，本文与验收 spec 编写后持续实施，不增加阶段审批。

## 当前合同
遵循 specs/0008-prd.md、0009-pseo-tech-arch.md、0011-promptlab-youmind-cms-publication.md 与 0005-pseo-subnode-first-principle.md。Source/X post 是证据，Prompt Artifact 是可复用对象。CMS 是 canonical，content/** 是生成镜像。不能伪造 prompt、模型版本、作者许可或发布状态。

## 范围与基线
- 本地 prototype/tool/display-cases.json：59 个经整理的项目；全部提取必要字段，不导入 5,225 条未经整理的检索噪声。
- 上游 data/cases.json：541 个案例，13 个 category；记录上游 commit、SHA-256 和 MIT notice，保留原作者与原帖。
- 图片属于 Images；Website 是用途分类，不能由预览图片/视频的 MIME 推导。Website 入口用显式 website/web-design/web-development 任务关系计算集合，沿用既有卡片与任务页。

## 数据流与隔离
source files → deterministic extraction → intake graph + create_prompt proposals + review manifest → authenticated CMS proposal adapter → editorial/rights review → immutable public snapshot → mirror → production build/deploy → smoke receipt。
新增离线 importer 不直接连接 DB，不写 content/**，不批准 public/rights。不完整项目保留为 website-case intake，不能填入假的 prompt。现有 create_prompt API 不允许 taxonomy/media 写入，图关系作为可审核 intake 独立交付；不得给接口偷偷追加字段。

## 节点、边与去重
稳定 id 由 source namespace + source key 的 SHA-256 派生；X prompt 优先使用真实 status id，跨来源相同原帖与相同 prompt 合并，冲突内容单独保留并报告。节点类型：prompt、website-case、source、creator、model、use-case、style、subject、media。边仅来自显式字段，包含 sourced_from、created_by、designed_for、used_for、has_style、has_subject、has_example、related_to。每条边必须能解析两个端点；禁止笛卡尔积及随机关联。图库 category 映射到 use-case，styles 映射 style，scenes 映射 subject；保留原标签作为 evidence。模型仅标记图库声明的 GPT Image 2 或网站来源明确声明的模型，不虚构版本。

## 提案字段
使用 schemaVersion=1、operation=create_prompt、expectedState=absent；仅输出现有 contract allowlist。保留完整 prompt、源 URL/id、creatorHandle、观察时间及真实发布时间。locale 为编辑摘要的真实语言，prompt 原文不翻译；缺少 prompt 的项目只进入 review queue。所有记录默认 draft/review_required/noindex；MIT 是上游仓库许可证据，不自动证明其收集的第三方 X 图片权利。

## 前端
Browse by category 增加 Website 共享 tile；16:10 预览、原字体/边框/间距、真实计数，窄屏布局不溢出。入口固定 /{locale}/prompts/website；展示采用现有 Task Findings，筛选和空态与任务页一致。不向公开构建注入 intake 数据或视觉 fixture。新入口 SEO 默认 noindex，不能绕过 public snapshot 资格。

## 验证与发布
先写回归测试再实现。验证 importer 完整性/去重/缺失 prompt/安全 URL/确定性/graph 端点；frontend lint/typecheck/test/build/static；infra validate/build/test。工程 PR 基于当前默认分支 codex/cms-preview-integration（仓库没有 main），CI 必须覆盖真实 base branch。部署须定位 beta 的既有目标与数据模式，记录 deployment id/URL、commit、snapshot 或受保护 preview 状态。无法访问 CMS 或缺人工 revision-bound approval 时，继续交付全部 intake 与工程，明确内容未发布，不伪造部署回执。
