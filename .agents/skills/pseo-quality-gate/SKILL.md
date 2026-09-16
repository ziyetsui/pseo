---
name: pseo-quality-gate
description: Evaluate PSEO page readiness using task value, evidence, duplication and technical checks without granting publication approval. 你已经有候选页面，想知道哪些可以进入发布审核、哪些应该拦住。
---

# 判断这批页面是否准备好

你已经有候选页面，想知道哪些可以进入发布审核、哪些应该拦住。

## 输入与范围

候选页面及同版本数据、来源/人工审核证据、技术检查。

可单独使用，不要求已运行整套流程。读取用户指定的产物与适用项目规则；缺必需输入时先复用已有材料，只补问阻塞当前步骤的信息。默认将新产物保存到 `docs/pseo/`，用户指定位置优先。不要因使用本 skill 扩大任务、生产权限或费用范围。

## 执行

1. 按 page_id/locale/revision 对齐候选、数据、来源、模板与检查。不同版本结果不能拼成通过。

2. 检查任务完成度、独特信息、来源依据、完整字段、与已有页重叠、真实内链和维护责任。内链检查的最小集合是 IA 页脚：up 与 down 各 ≥1 条，每条目标 URL 实际返回 200，且边在 graph.json/邻域视图里有证据；缺任一项即 fail。没有统一字数阈值，不把评分公式当 Google 排名公式。

3. 核验实际人工审核引用，而不是替人批准。权利未知、stale 翻译、缺核心数据、noindex/sitemap 冲突均列为阻塞；不为提高通过率自动改状态。

4. 输出 page_id,locale,revision,check,result,evidence_ref,blocker,next_action。result=pass/fail/not_checked；ready_for_human_release_review 只表示本检查通过，不是 public。

5. 用薄重复页、损坏链接、缺来源与未审核样本试验门禁，确保能拦住；修复后的变化必须重新检查受影响项。

6. 汇总可进入下一步的具体范围与被排除项，给出每个阻塞的最小修复路径。

## 交付与完成条件

主交付：`14-quality-gate.csv`（逐页资格与阻塞报告）。记录输入版本、证据位置、实际检查、未知与阻塞。

- 合格范围和每个阻塞均有逐页证据；未检查不等于 pass。
- Agent 检查不会产生人工审批或公开状态。

若项目已有 `project.json` 进度记录，只有完成条件有证据时才更新本步骤为 complete；缺口写 blocked，未实测写 not_checked，不把个人学习勾选当工程证据。上游 revision 变化后重查受影响结论。

下一步通常是 `pseo-release`，但以用户当前目标和真实缺口为准。未安装下一项时说明缺项；本步骤仍可独立交付，不假装调用成功。

## 示例请求

> 逐页检查这一批候选，列出可进入发布审核的范围和阻塞原因。

