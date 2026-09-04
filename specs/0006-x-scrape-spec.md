# Higgsfield X 高赞 Prompt 数据采集｜整体 Spec

Status: Review-ready v1 · Owner: BO · Last updated: 2026-08-20

验收合同：[02-acceptance-criteria.md](./02-acceptance-criteria.md)  
基线证据：[Higgsfield 高赞 Prompt 帖子公开快照](../../researches/social-x-evidence/survey-higgsfield-prompt-posts-2026-08-20.md)

## 1. 问题

项目需要从 X 采集与 Higgsfield 有关、正文包含可复用 Prompt 的公开帖子，并找出其中表现突出的内容。当前主要风险不是“能否找到几条帖子”，而是以下四个定义容易混淆：

1. X Trending 衡量正在形成的主题热度，不等于单帖点赞数。
2. 固定使用 `likes >= 50` 会漏掉小账号的异常高表现，也会高估大账号的普通帖子。
3. 搜索阶段先加点赞门槛会造成不可逆的召回损失，无法事后重新计算分位数。
4. “帖子提到 prompt”不等于“帖子提供了可复用 Prompt”。

本 Spec 将采集、相关性、Prompt 识别和表现评价拆开。采集层尽量完整地保留公开数据；分析层再用主题分位数、绝对互动量、作者基线和收藏价值分层。

## 2. 目标

| ID | 目标 | 衡量方式 |
| --- | --- | --- |
| G1 | 尽可能完整地召回 Twitter241 API 可返回的 Higgsfield Prompt 帖子 | 所有必需查询及分页均有终止记录；不得静默截断 |
| G2 | 保存可复核的原始数据和规范化数据 | 每条规范化记录均可通过 `raw_ref` 回溯原始页和原始帖子 |
| G3 | 完整保留用户要求的互动字段 | 点赞、评论、收藏、作者、链接均有值，或为 `null` 并附缺失原因 |
| G4 | 把真正的 Prompt 帖子与仅提及 prompt 的帖子分开 | Prompt 识别抽样精确率不低于 95% |
| G5 | 用数据分布定义“高赞”，不使用未经校准的固定门槛 | 样本充足时采用主题内 P90；所有分类可由原始指标重新计算 |
| G6 | 保护 API 密钥 | 密钥只从指定 env 文件加载；源码、日志和输出中的密钥出现次数为 0 |

## 3. 非目标

- 不采集私密、受保护、删除、DM 或登录后才可见的内容。
- 不把搜索 API 的可返回范围表述成 X 平台绝对全量。
- 不根据点赞数判断帖子是否进入 X Trending。
- 不在本阶段把帖子直接转换成网站页面、Node、Edge 或信息架构。
- 不分析另外两个尚未定义的 Higgsfield 方向；本 Spec 只覆盖“关于 Higgsfield、含 Prompt、互动表现突出”的板块。
- 不购买、更换或提升 Twitter241 套餐。
- 不采集评论正文；用户要求的“评论”在本阶段指帖子公开评论数快照。

## 4. 术语与边界

### 4.1 Trending

Trending 是 X 对“当前正在快速形成的主题”的判断，受实时讨论量、持续时间、作者上下文、地域和用户兴趣影响。本项目不得用单帖点赞数反推 Trending 状态。

### 4.2 API-complete

`API-complete` 表示：在一次运行中，所有必需查询与排序模式均已执行，并持续分页直到 API 不再返回下一页游标或新帖子。

它不表示：

- X 平台绝对全量；
- 删除、私密或 API 不可见内容的全量；
- 搜索服务未召回内容的全量。

如果运行因页数上限、付费限制、权限、429、重复游标或解析错误提前停止，运行状态必须是 `partial`，不得使用“全部”“全量”或 `API-complete`。

### 4.3 Prompt payload

帖子必须提供可直接复用或只需替换变量即可复用的生成指令。以下内容可以构成 Prompt payload：

- 正文或长文中的 `Prompt:`、`Image prompt:`、`Video prompt:`、`Negative Prompt:`；
- 作者自己的连续回复线程中的完整 Prompt；
- 图片中经 OCR 提取、且通过置信度或人工复核的 Prompt；
- JSON、YAML、分段自然语言或其他结构化生成指令。

以下内容不构成 Prompt payload：

- “single prompt”“no prompt”“prompt anything”等功能描述；
- 让读者评论 `prompt` 获取资料；
- 只讨论 prompt engineering；
- 只说明 Higgsfield 支持 Prompt，但没有提供生成指令。

## 5. 数据源与密钥

### 5.1 主数据源

- Provider：Twitter241 / RapidAPI。
- 密钥文件：`/Users/ziye/Library/Mobile Documents/com~apple~CloudDocs/wiki/.env/twitter241.env`。
- 允许的环境变量：`TWITTER241_RAPIDAPI_KEY`，兼容回退为 `RAPIDAPI_KEY`。
- 主机：`twitter241.p.rapidapi.com`。

密钥不得复制到项目目录、命令行参数、Markdown、CSV、JSONL、日志或异常文本中。读取 env 前若文件仍是 iCloud `dataless` 占位文件，运行应进入 `blocked_input`，而不是无限等待。

### 5.2 补充 hydration

当 Twitter241 搜索响应缺少收藏、长文、Note Tweet、线程或媒体字段时，可以访问公开 X status 页面或公开 syndication endpoint 补齐。每个补充字段必须记录来源和抓取时间；不同来源发生冲突时，以抓取时间较新的公开 X status 页面为互动数快照，并保留两份原始值。

## 6. 采集策略

### 6.1 原则

1. 搜索阶段不设置固定点赞门槛。
2. `Latest` 保召回，`Top` 补高互动结果；两者都必须分页。
3. 所有语言默认纳入，语言只作为字段，不作为首轮过滤条件。
4. 原帖、引用帖和作者自回复线程保留；纯转帖默认不作为独立 Prompt 成果。
5. 查询命中不是最终纳入，相关性和 Prompt payload 在规范化后判断。
6. 主查询不设置起始日期；在 Provider 可返回范围内持续向历史翻页，并在 manifest 记录实际覆盖的最早与最晚发帖时间。

### 6.2 必需查询矩阵

每条查询必须分别执行 `Latest` 与 `Top`，共至少 20 个查询运行单元：

| QID | 查询意图 | 查询文本 |
| --- | --- | --- |
| Q01 | 宽召回 | `Higgsfield prompt` |
| Q02 | 品牌全称 | `"Higgsfield AI" prompt` |
| Q03 | 当前官方账号提及 | `@higgsfield prompt` |
| Q04 | 历史官方账号提及 | `@higgsfield_ai prompt` |
| Q05 | Hashtag | `#Higgsfield prompt` |
| Q06 | 明确 Prompt 标记 | `Higgsfield "Prompt:"` |
| Q07 | 图片 Prompt | `Higgsfield "Image prompt:"` |
| Q08 | 视频 Prompt | `Higgsfield "Video prompt:"` |
| Q09 | 负向 Prompt | `Higgsfield "Negative Prompt:"` |
| Q10 | 媒体 Prompt | `Higgsfield prompt has:media` |

若 Twitter241 不支持某个操作符，应记录 `unsupported_operator`，再运行语义等价的降级查询；不得静默删除该查询单元。

### 6.3 召回补强

必需矩阵完成后，执行以下补强：

- 对官方账号公开时间线筛选含 `prompt`、`workflow`、`settings`、`recipe` 的帖子；
- 对主帖检查作者自回复，拼接同一 `conversation_id` 下连续的 Prompt；
- 对包含图片但没有文本 Prompt 的候选执行 OCR；
- 如果 API 支持 `min_faves` 一类操作符，可以用 20、50、100、500 四档做召回校验，但这些查询不能替代无门槛主查询；
- 所有补强结果仍按 `tweet_id` 与主查询结果去重。

### 6.4 分页与停止条件

每个查询与排序模式独立维护游标和状态。只允许以下停止原因：

- `natural_end`：API 没有下一游标；
- `no_new_ids`：连续两页相对本次运行的全局候选语料没有新增 `tweet_id`；适用于高度重叠查询的安全闭合；
- `repeated_cursor`：下一游标与历史游标重复；
- `configured_cap`：达到显式页数上限；
- `rate_limited`：重试预算耗尽；
- `payment_or_permission`：套餐或权限阻止继续；
- `parse_error`：响应存在但无法解析；
- `blocked_input`：密钥文件不可读或仍为云端占位文件。

只有所有必需运行单元均以 `natural_end` 或 `no_new_ids` 结束时，整次运行才可标记为 `complete`。`repeated_cursor` 可以防止死循环，但整次运行仍标记为 `partial`，因为无法证明自然结束。

## 7. 数据流

```text
┌───────────────────────────────────────────────────────────────────┐
│ Discovery                                                         │
│                                                                   │
│  10 required queries × {Latest, Top}                              │
│  + official timeline + optional threshold recall checks           │
└─────────────────────────────┬─────────────────────────────────────┘
                              │ paginated API responses
                              ▼
┌───────────────────────────────────────────────────────────────────┐
│ Raw archive                                                       │
│                                                                   │
│  raw_pages.jsonl   raw_posts.jsonl   request ledger               │
│  immutable payloads; secrets redacted                             │
└─────────────────────────────┬─────────────────────────────────────┘
                              │ tweet_id / conversation_id
                              ▼
┌───────────────────────────────────────────────────────────────────┐
│ Hydration and extraction                                          │
│                                                                   │
│  Note Tweet ─┐                                                     │
│  self-thread ├─▶ full text ─▶ Prompt extraction                   │
│  media OCR  ─┘                                                     │
│  status page ─────────────▶ interaction-field completion          │
└─────────────────────────────┬─────────────────────────────────────┘
                              │ normalized records
                              ▼
┌───────────────────────────────────────────────────────────────────┐
│ Classification                                                    │
│                                                                   │
│  Higgsfield relevance ─▶ Prompt payload ─▶ dedupe                 │
│  ─▶ topic percentiles / creator lift / save value                 │
└─────────────────────────────┬─────────────────────────────────────┘
                              │
                              ▼
┌───────────────────────────────────────────────────────────────────┐
│ Deliverables                                                      │
│                                                                   │
│  all candidates / prompt corpus / high-like / high-value          │
│  manifest / rejected reasons / reproducible metrics               │
└───────────────────────────────────────────────────────────────────┘
```

## 8. 规范化数据合同

### 8.1 必填字段

| 字段 | 类型 | 规则 |
| --- | --- | --- |
| `run_id` | string | 本次运行唯一标识 |
| `tweet_id` | string | 主去重键，不转为浮点或普通整数 |
| `conversation_id` | string/null | 线程归并键；缺失时记录原因 |
| `created_at` | ISO 8601 string | 使用 UTC，保留原始时间 |
| `author_id` | string | 不转为浮点或普通整数 |
| `author_name` | string | 抓取时显示名 |
| `author_handle` | string | 不含 `@` |
| `author_followers` | integer/null | 缺失时记录原因 |
| `url` | string | `https://x.com/{handle}/status/{tweet_id}` |
| `language` | string/null | API 返回的语言标记 |
| `text` | string | 主帖完整文本，不做展示截断 |
| `prompt_text` | string/null | 提取后的完整 Prompt；无有效 Prompt 时为 `null` |
| `prompt_location` | enum/null | `post`、`note_tweet`、`self_thread`、`image_ocr` 或组合 |
| `likes` | integer/null | 抓取时快照，非负 |
| `comments` | integer/null | 回复数，非负 |
| `bookmarks` | integer/null | 收藏数，非负 |
| `reposts` | integer/null | 转帖数，非负 |
| `quotes` | integer/null | 引用数，非负 |
| `views` | integer/null | 浏览量，非负 |
| `metrics_observed_at` | ISO 8601 string | 互动数据抓取时间 |
| `query_hits` | string[] | 命中的 QID 与排序模式 |
| `raw_ref` | string[] | 对应原始页和原始帖子位置 |
| `missing_reasons` | object | 每个缺失字段的机器可读原因 |

互动字段不可用时必须写 `null`。不得把缺失值写成 `0`。

### 8.2 分类字段

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `is_higgsfield_relevant` | boolean | 正文、账号、提及或上下文明确指向 Higgsfield |
| `has_prompt_payload` | boolean | 存在符合 §4.3 的可复用 Prompt |
| `topic_like_percentile` | number/null | 在有效 Prompt 语料中的点赞分位数 |
| `topic_bookmark_percentile` | number/null | 在有效 Prompt 语料中的收藏分位数 |
| `topic_comment_percentile` | number/null | 在有效 Prompt 语料中的评论分位数 |
| `creator_like_median` | number/null | 作者最近原创帖点赞中位数 |
| `creator_lift` | number/null | `likes / max(creator_like_median, 1)` |
| `creator_lift_percentile` | number/null | 有有效作者基线的 Prompt 语料中的提升率分位数 |
| `save_like_ratio` | number/null | `bookmarks / max(likes, 1)` |
| `save_rate` | number/null | `bookmarks / max(views, 1)` |
| `value_score` | number/null | §10.4 定义的综合分数 |
| `high_like_status` | enum | `certified`、`preliminary`、`insufficient_sample`、`not_high_like` |
| `high_value_status` | enum | `certified`、`preliminary`、`insufficient_sample`、`not_high_value` |
| `absolute_scale_tag` | enum | §10.2 的内部操作标签 |

## 9. 去重与线程归并

1. 规范化帖子以 `tweet_id` 去重。
2. 同一帖子命中多个查询时合并 `query_hits`，不得生成重复行。
3. 同一 `tweet_id` 的互动快照冲突时保留最新值，并在原始档案保存所有快照。
4. 作者自回复只在以下条件全部满足时并入 Prompt：作者相同、`conversation_id` 相同、回复链可追溯、内容属于同一 Prompt。
5. 引用帖和被引用帖保持两个 `tweet_id`，通过 `quoted_tweet_id` 建立关系。
6. 删除或不可用帖子保留墓碑记录，不能静默从后续快照消失。

## 10. “高赞”和“高价值”的计算

### 10.1 主题内高赞：主标准

计算总体只包含：

```text
is_higgsfield_relevant = true
AND has_prompt_payload = true
AND likes IS NOT NULL
```

当有效样本数 `N >= 30`：

```text
high_like_cutoff = max(20, P90(likes))
high_like_status = certified       if likes >= high_like_cutoff
high_like_status = not_high_like   otherwise
```

当 `10 <= N < 30`：仍计算 P90，但入选结果标记为 `preliminary`，不得写成稳定的主题分布结论。

当 `N < 10`：不认证“高赞”；只输出按点赞排序的候选，状态为 `insufficient_sample`。

在 `10 <= N < 30` 时，未达到阈值的帖子标记为 `not_high_like`；在 `N < 10` 时，所有有效候选均标记为 `insufficient_sample`，`high_like_posts.csv` 为空。

百分位计算方法必须固定并写入 manifest；默认采用线性插值 percentile，与 NumPy `method=linear` 语义一致。

### 10.2 绝对传播规模：辅助标签

以下标签只用于项目内部运营，不代表 X Trending 或官方分级：

| 点赞数 | `absolute_scale_tag` |
| ---: | --- |
| 0–19 | `baseline` |
| 20–49 | `engaged` |
| 50–99 | `niche_strong` |
| 100–299 | `topic_strong` |
| 300–999 | `broad_reach` |
| ≥1,000 | `breakout_candidate` |

### 10.3 作者相对表现

作者基线使用其最近 20–50 条非回复、非转帖原创帖的点赞中位数。样本少于 10 条时，`creator_like_median` 与 `creator_lift` 均为 `null`。

- `creator_lift >= 2`：明显高于作者基线；
- `creator_lift >= 5`：作者级爆款候选。

作者基线只能辅助排序，不能单独将低相关或无 Prompt 的帖子纳入。

### 10.4 Prompt 价值分数

当相应指标存在时：

```text
value_score =
  0.40 × topic_like_percentile
+ 0.30 × topic_bookmark_percentile
+ 0.20 × creator_lift_percentile
+ 0.10 × topic_comment_percentile
```

如果某项缺失，则在其余可用项之间按原权重比例重新归一化；可用权重少于 0.70 时，`value_score = null`。不得用 0 填充缺失项。

四个 percentile 字段统一使用 `0–100` 标度，因此 `value_score` 也在 `0–100` 范围内。

同时输出：

- `save_like_ratio >= 1`：收藏价值高于点赞表达；
- `save_like_ratio >= 2`：收藏驱动型 Prompt；
- `bookmarks >= 100`：高复用价值候选。

### 10.5 高价值入选规则

计算总体为 `value_score IS NOT NULL` 的有效 Prompt 帖子。规则与主题内高赞保持同样的小样本纪律：

```text
N_value >= 30: high_value_cutoff = P90(value_score)
               入选状态 = certified
10 <= N_value < 30: 使用 P90(value_score)
                    入选状态 = preliminary
N_value < 10: 不认证高价值
              全部状态 = insufficient_sample
```

未达到阈值的帖子为 `not_high_value`。`bookmarks >= 100`、`save_like_ratio >= 1` 或 `>= 2` 是解释和排序标签，不得绕过上述阈值单独进入 `high_value_posts.csv`。

## 11. 输出合同

每次运行写入：

```text
assets/higgsfield-x-prompts-{YYYY-MM-DD}/
├── README.md
├── manifest.json
├── request_ledger.jsonl
├── raw_pages.jsonl
├── raw_posts.jsonl
├── all_candidates.csv
├── all_prompt_posts.csv
├── high_like_posts.csv
├── high_value_posts.csv
├── rejected_posts.csv
└── normalized_posts.jsonl
```

- `raw_pages.jsonl` 和 `raw_posts.jsonl` 是不可变原始档案。
- `normalized_posts.jsonl` 是机器处理的规范化权威数据。
- CSV 是分析视图，必须能从规范化 JSONL 重新生成。
- `rejected_posts.csv` 必须包含明确、机器可读的淘汰原因。
- `manifest.json` 必须包含运行状态、查询矩阵、分页统计、停止原因、阈值、百分位方法、错误、请求数、抓取时间和版本。
- 上述目录树共 11 个必需文件；缺少任意一个都不能通过 P0 输出验收。

## 12. 错误、限流与恢复

- 默认单并发请求；分页请求间隔至少 2 秒，除非 API 套餐文档允许更高安全速率。
- 429 必须遵守 `Retry-After`；没有该响应头时使用 2、4、8、16、32 秒指数退避。
- 单个运行单元最多重试 5 次；耗尽后标记 `rate_limited` 并保存游标。
- 5xx 使用相同重试预算；4xx 权限或付费错误不盲目重试。
- 每写入一页原始响应后原子更新 checkpoint；恢复时从最后成功游标继续。
- 连续两页没有新 `tweet_id` 时安全停止，防止无限循环。
- 解析错误必须先保存原始响应，再记录失败；不得丢弃问题页。

## 13. 安全与合规

- 只采集公开内容。
- 不绕过访问控制，不采集私密账户或隐藏互动列表。
- 不在产物中保存 API 密钥、Cookie、Authorization header 或完整请求 header。
- 作者公开身份和帖子内容作为来源数据保留；不额外推断敏感属性。
- 原始数据中的无关鉴权信息在写盘前删除。
- 如用户要求删除某条本地记录，按 `tweet_id` 定位所有派生文件并重新生成分析视图。

## 14. 可复现性

- 相同原始输入、相同规则版本应产生相同的规范化字段、分类和排序。
- 默认排序：`value_score DESC NULLS LAST`、`likes DESC NULLS LAST`、`tweet_id ASC`。
- 规则版本写入 `manifest.json`；规则变化不得覆写旧快照。
- 所有时间使用 UTC ISO 8601；面向用户展示时可另行转换时区。
- 验收命令和通过标准由 [02-acceptance-criteria.md](./02-acceptance-criteria.md) 唯一定义。

## 15. 关键决策

### D1 — 采集阶段不设置点赞下限

- **替代方案**：用 `likes >= 50` 或 `min_faves:50` 直接搜索。
- **决定**：主查询无点赞门槛；有阈值查询只做召回校验。
- **原因**：保留完整分布，避免漏掉小账号异常表现，并允许后续重算标准。

### D2 — 高赞使用主题内 P90

- **替代方案**：固定 50、100 或 1,000 赞。
- **决定**：`N >= 30` 时使用 `max(20, P90)`；小样本降级为 preliminary 或不认证。
- **原因**：高赞应相对于 Higgsfield Prompt 语料，而不是错误映射到全站 Trending。

### D3 — 收藏是独立价值信号

- **替代方案**：只按点赞排序。
- **决定**：保留收藏分位数、收藏/点赞比和收藏率，并进入综合价值分数。
- **原因**：Prompt 是可复用资产，收藏比公开点赞更接近未来使用意图。

### D4 — “全量”必须附 API 边界

- **替代方案**：搜索到多少就称为“所有帖子”。
- **决定**：只有必需查询全部自然结束才能称为 `API-complete`；否则明确为 `partial`。
- **原因**：第三方搜索服务的召回范围和套餐边界无法代表 X 平台绝对全量。

## 16. 参考资料

- [X Trends FAQ](https://help.x.com/en/using-x/x-trending-faqs)
- [X Trends Recommendations](https://help.x.com/en/resources/recommender-systems/trends-recommendations)
- [X Search Operators](https://docs.x.com/x-api/posts/search/integrate/operators)
- [X Search all Posts](https://docs.x.com/x-api/posts/search-all-posts)
- [本项目 Higgsfield 公开索引基线快照](../../researches/social-x-evidence/survey-higgsfield-prompt-posts-2026-08-20.md)
