# Website 与 GPT Image 接入验收 spec

| ID | 量化标准 | 证据 |
|---|---|---|
| DATA-01 | 本地 59/59 个整理项目进入 intake；未整理的 5,225 个检索结果导入数为 0 | source/reconciliation manifest |
| DATA-02 | 上游 541/541 条案例被处理，13/13 分类有确定映射；每条导入或阻塞均有原因 | reconciliation counts |
| GRAPH-01 | 节点 id 重复数 0；悬空边 0；重复边 0；所有对象至少 1 条 source 边 | graph validator |
| GRAPH-02 | source URL 与作者来自输入；缺失模型版本编造数 0；无 prompt 的项目被伪装成 prompt 数 0 | unit tests + review manifest |
| PROPOSAL-01 | 所有可提交 proposal 通过现有 CMS normalizePromptProposal；unsupported fields 0 | contract verification |
| RIGHTS-01 | Agent 设置 public/cleared/community_attributed 数 0；所有新对象 draft/review_required/noindex | manifest + CMS receipt |
| IDEM-01 | 同源 commit/输入/观察时间运行两次输出 SHA-256 完全一致 | deterministic test |
| UI-01 | category 有 Images、Videos、Website 3 个入口；Website 指向真实生成路由 | render + static output |
| UI-02 | Website 数量等于当前 catalog 显式 website 任务关系的 immutable id 并集；不按媒体 kind 分类 | unit tests |
| UI-03 | 375px、768px、1440px 无横向页面溢出；原任务页交互/暗色样式沿用共享组件 | screenshots + browser smoke |
| QA-01 | frontend lint/typecheck/test/build/static 各退出 0；infra validate/build/test 各退出 0 | command receipt |
| RELEASE-01 | 1 个新工程 PR；检查完成后合并；commit 与部署回执一致 | PR + deploy receipt |
| RELEASE-02 | CMS accepted、public、mirror synced、deployed 分项记录；无回执不得宣称内容上线 | release report |

验收结果必须给实际数字与失败/阻塞项。源码许可不能被当成全部第三方素材已审核。页面统计只能包含同一已验证 catalog 的对象，不能把待审核 intake 数显示为已发布数量。
