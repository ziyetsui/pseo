---
name: pseo-release
description: Prepare or execute an authorized bounded PSEO release and verify deployment receipts separately from indexing. 首批页面经过审核，需要安全上线并确认真实结果。
---

# 发布一小批并核对结果

首批页面经过审核，需要安全上线并确认真实结果。

## 输入与范围

同 revision 的质量结果、宿主发布流程、人工审核与明确部署授权。

可单独使用，不要求已运行整套流程。读取用户指定的产物与适用项目规则；缺必需输入时先复用已有材料，只补问阻塞当前步骤的信息。默认将新产物保存到 `docs/pseo/`，用户指定位置优先。不要因使用本 skill 扩大任务、生产权限或费用范围。

## 执行

1. 只处理用户授权的范围。没有生产部署授权时完成本地构建、目标 diff、回滚准备与待执行清单，然后在真实最终生产动作前取得所需授权；不要提前阻塞可完成的准备工作。

2. 核对内容/数据 revision、构建版本、批准范围与待发布路径。宿主若采用 CMS snapshot/mirror，分别核验这些事实；Git-native 站点则沿用其已有流程。

3. 使用已存在且授权的发布入口，凭据留在 host/secret store，不进入 skill、命令参数或日志。PromptLab 内容 Agent 只准备/核验，不能调用生产发布接口或绕开 mirror Bot。

4. 从小批开始，实际部署后请求已知页面与负例 URL，检查状态、关键正文、canonical/robots 和静态资源是否匹配本次版本。

5. 回执记录 mode=prepared|executed、content_revision、build_ref、deployment_ref/url、smoke_checks、checked_at、remaining_blockers；未发生的字段用 null。需要 mirror 时独立记录 mirror_revision/status。

6. 失败时按已授权回滚合同处理或交接，保留最后已验证版本。deployment success 不证明搜索引擎已收录，更不证明增长。

## 交付与完成条件

主交付：`15-release-receipt.json`（发布准备或实际上线回执）。记录输入版本、证据位置、实际检查、未知与阻塞。

- prepared 与 executed 清楚区分，线上成功有真实部署与 smoke 证据。
- 没有把构建/提交/镜像成功冒充生产上线或搜索收录。

若项目已有 `project.json` 进度记录，只有完成条件有证据时才更新本步骤为 complete；缺口写 blocked，未实测写 not_checked，不把个人学习勾选当工程证据。上游 revision 变化后重查受影响结论。

下一步通常是 `pseo-measure`，但以用户当前目标和真实缺口为准。未安装下一项时说明缺项；本步骤仍可独立交付，不假装调用成功。

## 示例请求

> 准备首批页面的发布清单，并在已授权部署完成后核对线上版本。

