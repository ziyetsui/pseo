# Higgsfield X 高赞 Prompt 数据采集｜验收标准

Status: Review-ready v1 · Owner: BO · Last updated: 2026-08-20

规范权威：[01-overall-spec.md](./01-overall-spec.md)

## 1. 验收原则

本文件只定义可观察的通过与失败条件。任何一项 P0 门禁失败，整次运行不得标记为 `complete`，不得对外描述为“全部帖子”或“全量采集”。

验收对象包括：

- Twitter241 API 采集运行；
- 原始响应档案；
- 规范化 JSONL；
- CSV 分析视图；
- 高赞和高价值分类；
- manifest、checkpoint 和请求账本；
- 密钥及日志安全。

## 2. P0 完成门禁

| Gate | 通过条件 | 量化标准 |
| --- | --- | --- |
| P0-01 密钥可用 | 从指定 env 文件成功加载允许的变量 | 1 个有效密钥；密钥值输出次数 0 |
| P0-02 API 认证 | 对 Twitter241 执行最小只读请求并获得可解析响应 | HTTP 2xx；JSON 解析成功；schema smoke test 通过 |
| P0-03 查询覆盖 | 执行 Spec §6.2 的 10 个查询，每个含 `Latest` 与 `Top` | 必需运行单元完成率 20/20 = 100% |
| P0-04 分页闭合 | 每个运行单元均记录游标、页数和停止原因 | 记录完整率 100%；无未知停止原因 |
| P0-05 原始数据保存 | 每个成功 API 页面先写原始档案再解析 | 成功响应落盘率 100% |
| P0-06 去重 | 规范化记录中每个 `tweet_id` 只出现一次 | 重复 `tweet_id` 数 = 0 |
| P0-07 可追溯 | 每条规范化记录均能回溯原始页/原始帖 | 有效 `raw_ref` 覆盖率 100% |
| P0-08 必填字段 | ID、时间、作者、URL、正文和互动字段符合合同 | 结构合规率 100% |
| P0-09 Prompt 分类 | 真正的 Prompt payload 与概念提及分开 | 抽样精确率 ≥95%；已知种子召回率 100% |
| P0-10 表现计算 | 高赞、高价值分位数及小样本规则与 Spec 一致 | 重算结果一致率 100% |
| P0-11 输出齐全 | Spec §11 的 11 个文件全部存在并可读 | 文件存在率 11/11 = 100% |
| P0-12 安全 | 产物、源码和日志不含密钥或 Authorization header | 泄漏命中数 = 0 |

## 3. 凭据与安全验收

### AC-SEC-01 — Env 文件

通过条件：

- 路径严格为 `/Users/ziye/Library/Mobile Documents/com~apple~CloudDocs/wiki/.env/twitter241.env`；
- 文件存在且可读；
- 文件不是 iCloud `dataless` 占位状态；
- 权限不得宽于 `0600`；
- 只读取 `TWITTER241_RAPIDAPI_KEY` 或回退变量 `RAPIDAPI_KEY`。

失败条件：读取超时、文件未下载、变量为空、权限过宽或出现多个冲突密钥。

### AC-SEC-02 — 零泄漏

对以下范围运行密钥指纹与敏感 header 扫描：

- `scripts/`
- 本次 `assets/higgsfield-x-prompts-{date}/`
- 本次运行日志
- 两份 Spec 文档

通过标准：

```text
完整密钥命中数 = 0
密钥前 8 位命中数 = 0
"x-rapidapi-key" 值命中数 = 0
"Authorization: Bearer" 值命中数 = 0
```

字段名可以出现在文档或代码中；密钥值不得出现。

## 4. API 与查询覆盖验收

### AC-API-01 — 认证 Smoke Test

使用 1 次最小只读请求验证：

- HTTP 状态为 2xx；
- `Content-Type` 为 JSON；
- 响应能解析；
- 响应中存在帖子集合或明确的空集合；
- 请求计入 manifest。

401、403、429、付款错误或 HTML 响应均判定为失败，不得继续大规模分页。

### AC-API-02 — 查询矩阵

`request_ledger.jsonl` 必须包含 20 个必需运行单元：

```text
Q01..Q10 × {Latest, Top}
```

每个单元至少包含：

- `query_id`
- `query_text`
- `mode`
- `started_at`
- `finished_at`
- `page_count`
- `request_count`
- `unique_tweet_count`
- `stop_reason`
- `last_cursor`
- `status`

通过标准：字段完整率 100%。不支持的操作符必须存在原查询失败记录和降级查询记录。

### AC-API-03 — 不得预过滤点赞

主查询请求中不得出现固定点赞下限。通过标准：

```text
必需主查询中的 min_faves / likes threshold 命中数 = 0
```

阈值查询只允许出现在 `recall_check` 类型运行单元中，且不得覆盖主查询产物。

## 5. 分页完整性验收

### AC-PAGE-01 — 游标账本

每个请求必须记录输入游标与输出游标。通过标准：

- 成功页面的游标记录率 100%；
- 同一运行单元中不存在未解释的页码跳跃；
- 重复游标能在下一次请求前被检测；
- 每一页的原始响应均有 SHA-256。

### AC-PAGE-02 — Complete 状态

整次运行只有在以下公式成立时才通过：

```text
required_units = 20
closed_units = count(stop_reason IN {natural_end, no_new_ids})
run_status = complete IFF closed_units = required_units
```

任何 `configured_cap`、`rate_limited`、`payment_or_permission`、`repeated_cursor`、`parse_error` 或 `blocked_input` 都使 `run_status = partial`。

### AC-PAGE-03 — 无新增安全停止

使用固定 fixture 模拟连续两页只有本次运行全局语料中已有的 `tweet_id`：

- 第 1 个无新增页：继续一次；
- 第 2 个连续无新增页：停止；
- 停止原因：`no_new_ids`；
- 多余请求数：0。

## 6. 原始数据与规范化验收

### AC-DATA-01 — 原始档案覆盖

通过标准：

```text
raw_pages 行数 = 成功分页响应数
raw_posts 中唯一 tweet_id 数 >= normalized_posts 中唯一 tweet_id 数
每条 normalized record 的 raw_ref 可解析率 = 100%
```

### AC-DATA-02 — ID 安全

以下字段必须以字符串保存：

- `tweet_id`
- `conversation_id`
- `author_id`
- `quoted_tweet_id`
- `reply_to_tweet_id`

通过标准：所有非空 ID 的正则匹配率 100%：

```regex
^[0-9]+$
```

不得出现科学计数法、浮点小数或 Excel 精度损失。

### AC-DATA-03 — 必填字段完整性

对所有规范化记录：

| 字段组 | 通过标准 |
| --- | --- |
| `run_id`、`tweet_id`、`created_at` | 非空率 100% |
| `author_id`、`author_name`、`author_handle` | 非空率 100% |
| `url`、`text`、`metrics_observed_at` | 非空率 100% |
| `query_hits`、`raw_ref` | 非空数组率 100% |
| `likes`、`comments`、`bookmarks`、`reposts`、`quotes`、`views` | 非负整数，或 `null` + 对应 `missing_reasons`；合规率 100% |

### AC-DATA-04 — 链接正确性

所有 URL 必须符合：

```text
https://x.com/{author_handle}/status/{tweet_id}
```

通过标准：结构匹配率 100%；HTTP 可访问性检查成功率 ≥95%。不可访问的帖子保留墓碑记录，并写明 HTTP 状态或失败原因。

### AC-DATA-05 — 去重

通过标准：

```text
count(normalized_posts) = count(distinct tweet_id)
重复 tweet_id = 0
同一 tweet_id 的 query_hits 已合并率 = 100%
```

## 7. Higgsfield 相关性验收

### AC-REL-01 — 规则覆盖

满足以下至少一项才可将 `is_higgsfield_relevant` 设为 `true`：

- 正文、Note Tweet、作者自回复或 OCR 文本包含 `Higgsfield`；
- 作者为明确记录的官方账号；
- 帖子明确提及官方账号；
- 被引用帖子明确指向 Higgsfield，且主帖内容是在讨论该产品。

仅因为查询命中，不足以设为 `true`。

### AC-REL-02 — 人工抽样

若候选数 ≤100，复核全部；若候选数 >100，按查询来源和互动分位分层抽样 100 条。

通过标准：

```text
precision(is_higgsfield_relevant) >= 95%
false-positive rate <= 5%
```

若未达到标准，修正规则并重新生成全部派生文件。

## 8. Prompt payload 验收

### AC-PROMPT-01 — 正向 Fixture

测试集至少包含以下 8 种情况，每种至少 2 条：

1. `Prompt:` 自然语言；
2. `Image prompt:`；
3. `Video prompt:`；
4. `Negative Prompt:`；
5. JSON Prompt；
6. Note Tweet 长文 Prompt；
7. 作者自回复线程 Prompt；
8. 图片 OCR Prompt。

通过标准：16/16 均被识别，`prompt_text` 非空，`prompt_location` 正确。

### AC-PROMPT-02 — 负向 Fixture

测试集至少包含以下 6 种情况，每种至少 2 条：

- `single prompt`
- `zero prompts`
- `prompt anything`
- 评论 `prompt` 获取资料
- prompt engineering 讨论
- 只有功能描述、无生成指令

通过标准：12/12 的 `has_prompt_payload = false`。

### AC-PROMPT-03 — 已知种子召回

以下公开种子必须进入 Prompt 语料：

- `2014791228118745344`
- `2010392278083502456`
- `2025215535550493124`

通过标准：召回率 3/3 = 100%；Prompt 正文不得被展示截断文本替代。

### AC-PROMPT-04 — 人工精确率

若 Prompt 候选数 ≤100，复核全部；否则分层抽样 100 条。

通过标准：

```text
precision(has_prompt_payload) >= 95%
prompt_text 完整率 >= 95%
prompt_location 正确率 >= 95%
```

### AC-PROMPT-05 — OCR

对“含图片但文本无 Prompt”的相关候选：

- OCR 尝试覆盖率 100%；
- OCR 置信度低于 0.80 时不得自动纳入；
- 自动纳入 OCR Prompt 的人工抽样精确率 ≥90%；
- 原图引用、OCR 原文和清理后文本均需保留。

## 9. 高赞计算验收

### AC-SCORE-01 — 样本边界

使用固定 fixtures 验证三个分支：

| 有效样本数 | 预期行为 |
| ---: | --- |
| `N >= 30` | 使用 `max(20, P90)`；入选状态为 `certified` |
| `10 <= N < 30` | 使用相同数值规则；入选状态为 `preliminary` |
| `N < 10` | 不认证高赞；状态为 `insufficient_sample` |

通过标准：所有边界 fixture 结果一致率 100%。

### AC-SCORE-02 — P90 重算

独立验收脚本从 `normalized_posts.jsonl` 重算 P90。通过标准：

```text
manifest.high_like_cutoff = independent_recalculation
high_like_posts 的 tweet_id 集合 = independent_recalculation 的 tweet_id 集合
差异条数 = 0
```

### AC-SCORE-03 — 最低保护线

当 P90 小于 20 时，阈值必须为 20。测试至少包含 1 个全部点赞低于 20 的 fixture。通过标准：阈值为 20，且低于 20 的帖子入选数为 0。

### AC-SCORE-04 — 绝对规模标签

对边界值 `0, 19, 20, 49, 50, 99, 100, 299, 300, 999, 1000` 逐一测试。通过标准：11/11 标签与 Spec §10.2 一致。

### AC-SCORE-05 — 作者提升率

- 作者原创基线样本 ≥10 条时才计算；
- 中位数计算排除回复和转帖；
- 公式为 `likes / max(median, 1)`；
- 样本 <10 条时结果必须为 `null`，不得为 0。

通过标准：边界 fixture 通过率 100%。

### AC-SCORE-06 — 收藏价值

分别测试：收藏缺失、点赞为 0、浏览量为 0、收藏大于点赞。通过标准：

- 缺失收藏不参与计算；
- 分母最小为 1；
- 不产生 `NaN` 或无穷值；
- `save_like_ratio >= 1` 与 `>=2` 标签边界准确率 100%。

### AC-SCORE-07 — 综合分数

通过标准：

- 四项完整时权重和为 1.00；
- 缺失项存在时只在可用权重间归一化；
- 可用原始权重总和 <0.70 时 `value_score = null`；
- 独立重算误差 ≤`1e-9`。

### AC-SCORE-08 — 高价值入选

使用固定 fixtures 覆盖 `N_value = 9、10、29、30` 四个边界，并从 `normalized_posts.jsonl` 独立重算。

通过标准：

- `N_value >= 30` 时阈值为 `P90(value_score)`，入选状态为 `certified`；
- `10 <= N_value < 30` 时阈值仍为 P90，入选状态为 `preliminary`；
- `N_value < 10` 时无入选记录，所有有效候选状态为 `insufficient_sample`；
- `high_value_posts` 的 `tweet_id` 集合与独立重算集合完全一致，差异条数为 0；
- 收藏数或收藏比标签不得单独绕过阈值。

## 10. Trending 表述验收

任何输出、README 和报告都必须满足：

- 不把 `likes >= 50` 写成 X Trending 标准；
- 不把 `absolute_scale_tag` 写成 X 官方分级；
- 不把单帖高赞等同于进入 Trending；
- 如引用 Trending，只描述其为主题级、实时、上下文相关的排序系统。

通过标准：禁用表述静态扫描命中数 = 0；人工文案检查通过率 100%。

## 11. 输出文件验收

### AC-OUT-01 — 文件集合

以下文件必须全部存在且大于 0 字节：

1. `README.md`
2. `manifest.json`
3. `request_ledger.jsonl`
4. `raw_pages.jsonl`
5. `raw_posts.jsonl`
6. `all_candidates.csv`
7. `all_prompt_posts.csv`
8. `high_like_posts.csv`
9. `high_value_posts.csv`
10. `rejected_posts.csv`
11. `normalized_posts.jsonl`

通过标准：文件存在率 11/11 = 100%。

### AC-OUT-02 — 子集关系

通过标准：

```text
high_like_posts ⊆ all_prompt_posts ⊆ all_candidates
high_value_posts ⊆ all_prompt_posts ⊆ all_candidates
rejected_posts ∩ all_prompt_posts = ∅
```

集合关系错误条数 = 0。

### AC-OUT-03 — CSV/JSONL 一致性

所有 CSV 必须能从 `normalized_posts.jsonl` 和分类规则生成。通过标准：

- 行数一致；
- `tweet_id` 集合一致；
- 用户要求字段值一致；
- 多行 Prompt 的 CSV 转义可被标准 CSV 解析器无损读取；
- UTF-8 中文、Emoji 和换行 round-trip 成功率 100%。

### AC-OUT-04 — Manifest

`manifest.json` 必须包含：

- `run_id`
- `started_at`、`finished_at`
- `run_status`
- `provider`
- `query_matrix_version`
- `normalization_version`
- `classification_version`
- `required_unit_count`
- `closed_unit_count`
- `request_count`
- `page_count`
- `raw_post_count`
- `unique_candidate_count`
- `prompt_post_count`
- `high_like_count`
- `high_value_count`
- `high_like_cutoff`
- `high_value_cutoff`
- `percentile_method`
- `coverage_earliest_created_at`、`coverage_latest_created_at`
- `stop_reasons`
- `errors`
- `missing_field_summary`
- `secret_scan_result`

通过标准：字段完整率 100%；计数与实际文件独立重算一致率 100%。

## 12. 限流、恢复与确定性验收

### AC-OPS-01 — 限流

模拟 429：

- 有 `Retry-After` 时严格等待指定时间；
- 无 `Retry-After` 时使用 2、4、8、16、32 秒；
- 最多 5 次；
- 耗尽后停止当前运行单元并保存 checkpoint；
- 不影响已写入的原始页。

通过标准：请求次数、等待序列和停止原因全部匹配，额外请求数为 0。

### AC-OPS-02 — 中断恢复

在第 3 页成功写盘后模拟进程中断。恢复后必须：

- 从最后成功游标继续；
- 不重复写入前 3 页原始记录；
- 不丢失第 1–3 页帖子；
- 最终 `tweet_id` 集合与无中断运行完全一致。

通过标准：集合差异数 0，重复原始页数 0。

### AC-OPS-03 — 确定性

对同一份原始 fixture 连续运行两次规范化和分类。排除运行时间字段后：

```text
SHA-256(normalized output A) = SHA-256(normalized output B)
SHA-256(CSV views A) = SHA-256(CSV views B)
```

## 13. 抽样与人工复核记录

人工复核必须产生机器可读记录，至少包含：

- `tweet_id`
- `reviewer`
- `reviewed_at`
- `is_higgsfield_relevant_gold`
- `has_prompt_payload_gold`
- `prompt_complete_gold`
- `prompt_location_gold`
- `notes`

抽样必须按查询来源、语言、互动分位和纳入/淘汰结果分层，不能只检查高赞结果。

## 14. 最终验收报告

每次正式交付必须生成一张验收汇总表：

| 类别 | 指标 | 要求 | 实际 | 结果 |
| --- | --- | ---: | ---: | --- |
| API | 必需运行单元完成率 | 100% | 由验收程序写入数值 | 由验收程序判定 |
| 分页 | 自然闭合运行单元 | 20/20 | 由验收程序写入数值 | 由验收程序判定 |
| 数据 | 重复 tweet_id | 0 | 由验收程序写入数值 | 由验收程序判定 |
| 数据 | raw_ref 覆盖率 | 100% | 由验收程序写入数值 | 由验收程序判定 |
| 相关性 | 人工抽样精确率 | ≥95% | 由验收程序写入数值 | 由验收程序判定 |
| Prompt | 人工抽样精确率 | ≥95% | 由验收程序写入数值 | 由验收程序判定 |
| Prompt | 已知种子召回率 | 100% | 由验收程序写入数值 | 由验收程序判定 |
| 高赞 | 独立重算差异 | 0 | 由验收程序写入数值 | 由验收程序判定 |
| 高价值 | 独立重算差异 | 0 | 由验收程序写入数值 | 由验收程序判定 |
| 输出 | 必需文件 | 11/11 | 由验收程序写入数值 | 由验收程序判定 |
| 安全 | 密钥泄漏 | 0 | 由验收程序写入数值 | 由验收程序判定 |

正式交付的验收报告不得保留模板文字；“实际”和“结果”两列必须分别包含数值及 `PASS`、`CONDITIONAL PASS` 或 `FAIL`。

## 15. 交付判定

### PASS

- 所有 P0 门禁通过；
- `run_status = complete`；
- 人工抽样达到精确率门槛；
- 高赞和高价值结果均可独立重算；
- 密钥泄漏为 0。

交付文案可以写“完成 Twitter241 API 可返回范围内的完整查询与分页”。

### CONDITIONAL PASS

- 数据结构、分类和安全门禁通过；
- 但一个或多个查询因外部套餐、权限、限流或重复游标未自然闭合；
- `run_status = partial`；
- manifest 准确记录缺口。

交付文案只能写“部分 API 快照”，不得写“全部”或“全量”。

### FAIL

出现以下任一情况：

- 密钥泄漏；
- 原始响应未保存；
- 必填字段被静默填 0；
- `tweet_id` 精度损失；
- 高赞分类无法独立重算；
- 查询矩阵或分页记录缺失；
- Prompt 精确率低于 95%；
- `partial` 运行被标记为 `complete`。
