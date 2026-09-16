---
name: pseo-intents
description: Cluster keyword and customer-question evidence into distinct intents and avoid page cannibalization. 你有关键词或用户问题，需要知道哪些应该由同一页回答。
---

# 把关键词变成用户任务

你有关键词或用户问题，需要知道哪些应该由同一页回答。

## 输入与范围

已选机会；搜索词/问题列表及可用来源。

可单独使用，不要求已运行整套流程。读取用户指定的产物与适用项目规则；缺必需输入时先复用已有材料，只补问阻塞当前步骤的信息。默认将新产物保存到 `docs/pseo/`，用户指定位置优先。不要因使用本 skill 扩大任务、生产权限或费用范围。

## 执行

1. 保留原 query 与来源，不把改写后的短语冒充用户搜索。分别标注实测搜索数据、公开 SERP 观察、客服问题和社交信号。

2. 按用户要完成的任务、对象、所需答案类型与转化阶段聚类；保留 locale/市场差异。best/free/year 等先视为修饰或约束，不自动创建实体。

3. 输出 cluster_id,queries,locale,user_task,answer_type,entity_candidates,demand_evidence,evidence_date,confidence,existing_url。CSV 多值需正确引号转义，缺测量值留空并在说明注明。

4. 对容易重叠的簇检查现有页面与当前 SERP 的答案形式，决定合并还是分开；不同搜索词可以映射同一页。

5. 交付未满足的需求与歧义清单，不凭词量决定 URL 数。只有用户要求采集新关键词时才在其预算内扩研究。

## 交付与完成条件

主交付：`03-intents.csv`（搜索意图与证据表）。记录输入版本、证据位置、实际检查、未知与阻塞。

- 每个意图有不同的任务或明确的合并理由。
- 不把社交热度填到搜索量字段，不虚构 keyword difficulty 或需求数量。

若项目已有 `project.json` 进度记录，只有完成条件有证据时才更新本步骤为 complete；缺口写 blocked，未实测写 not_checked，不把个人学习勾选当工程证据。上游 revision 变化后重查受影响结论。

下一步通常是 `pseo-sources`，但以用户当前目标和真实缺口为准。未安装下一项时说明缺项；本步骤仍可独立交付，不假装调用成功。

## 示例请求

> 把这份关键词 CSV 按用户真正要完成的任务归类，标出重叠。

