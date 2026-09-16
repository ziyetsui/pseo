---
name: pseo-sources
description: Plan sustainable data sources, provenance and usage constraints for a PSEO page family. 方向已经选好，但还不知道用什么数据持续支撑页面。
---

# 确定数据从哪里来

方向已经选好，但还不知道用什么数据持续支撑页面。

## 输入与范围

机会和意图；自有数据、用户授权数据或公开来源线索。

可单独使用，不要求已运行整套流程。读取用户指定的产物与适用项目规则；缺必需输入时先复用已有材料，只补问阻塞当前步骤的信息。默认将新产物保存到 `docs/pseo/`，用户指定位置优先。不要因使用本 skill 扩大任务、生产权限或费用范围。

## 执行

1. 列出每个页面任务需要的事实字段，优先现有产品目录、文档、业务数据与原创测量，再考虑外部资料。

2. 建 source_id,source_type,public_url_or_local_ref,fields,owner,observed_at,refresh_policy,access_method,usage_basis,media_basis,limitations 表。文本与媒体的使用依据分开，公开可访问不等于可再分发。

3. 定义 raw→normalized→reviewed 三层与稳定 id。规定字段的单位、缺失原因、时间区间、来源冲突处理；敏感数据不进入公开层。

4. 在开始请求前声明样本规模、页数/费用预算、速率与停止条件。收费服务与新权限必须在已有授权内；没有预算时先用现有数据或小规模手工样本。

5. 输出一种最低可用采集方案和受阻项。PromptLab 项目读取本仓库 0011 与既有 proposal 合同，其他项目沿用其已确认治理。

## 交付与完成条件

主交付：`04-sources.md`（来源与采集合同）。记录输入版本、证据位置、实际检查、未知与阻塞。

- 每个必需字段都有来源计划或明确缺口。
- 使用依据未知的记录被隔离待审，不出现 Agent 自填许可结论。

若项目已有 `project.json` 进度记录，只有完成条件有证据时才更新本步骤为 complete；缺口写 blocked，未实测写 not_checked，不把个人学习勾选当工程证据。上游 revision 变化后重查受影响结论。

下一步通常是 `pseo-ingest`，但以用户当前目标和真实缺口为准。未安装下一项时说明缺项；本步骤仍可独立交付，不假装调用成功。

## 示例请求

> 我们有自己的产品 CSV 和一批公开文档，帮我定义数据来源与更新规则。

