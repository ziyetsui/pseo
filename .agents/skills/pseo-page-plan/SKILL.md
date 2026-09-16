---
name: pseo-page-plan
description: Plan qualified PSEO page candidates and navigation from intents and evidence-backed data. 你已经有数据和用户任务，需要规划页面、导航与内部链接。
---

# 决定哪些页面值得存在

你已经有数据和用户任务，需要规划页面、导航与内部链接。

## 输入与范围

意图表、实体关系、已有网站路由。

可单独使用，不要求已运行整套流程。读取用户指定的产物与适用项目规则；缺必需输入时先复用已有材料，只补问阻塞当前步骤的信息。默认将新产物保存到 `docs/pseo/`，用户指定位置优先。不要因使用本 skill 扩大任务、生产权限或费用范围。

## 执行

1. 从用户任务选取数据投影，形成页面候选；搜索入口、菜单、页脚、站内筛选可以复用数据，但不必都变成可索引 URL。

2. 逐候选检查独立任务、信息增量、可用证据、数据完整度、来源依据和维护成本。避免所有实体维度的笛卡尔积、仅换地名/年份/标题的薄页。

3. 输出 candidate_id,locale,intent_id,object_ids,template,proposed_path,existing_target,decision,reason,evidence_refs,parent,siblings,children,related。四个方向都来自邻域视图：parent 向上、siblings 同轴横向、children 向下、related 其他有证据的边；目标只能是已存在或本计划 build 的 URL，未建的兄弟写其已存在的单维页。decision 用 build/merge/defer/reject，不能视为发布批准。

4. 把搜索同义词收敛到一个 canonical 候选；处理已有 URL 冲突、slug 变更与 redirect 提案。筛选 URL 的抓取/索引策略写到技术方案。

5. 画出入口→集合→详情→真实相关页→转化的短路径，并为每个 build 页面确认 IA 页脚四个方向都有可用目标。不存在的目标不造链接；实体关系与链接目标一起验证。

6. 选一个页面族试点，列出不做的组合与原因。

## 交付与完成条件

主交付：`07-page-plan.csv`（页面候选与链接计划）。记录输入版本、证据位置、实际检查、未知与阻塞。

- 每个拟建 URL 都能回答一个任务并指向可用数据。
- 已有页面的重叠、拟合并目标与真实内链有记录，不靠随机推荐。

若项目已有 `project.json` 进度记录，只有完成条件有证据时才更新本步骤为 complete；缺口写 blocked，未实测写 not_checked，不把个人学习勾选当工程证据。上游 revision 变化后重查受影响结论。

下一步通常是 `pseo-page-spec`，但以用户当前目标和真实缺口为准。未安装下一项时说明缺项；本步骤仍可独立交付，不假装调用成功。

## 示例请求

> 用这份实体与意图表规划首批页面，标出应该合并或暂缓的组合。

