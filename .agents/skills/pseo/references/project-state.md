# 可继续的项目记录

默认输出位置为用户项目的 `docs/pseo/`；用户指定目录优先。这些是研究/工程交付物，不是公开内容源。记录里不放凭据、个人数据或受保护正文。

`project.json` 的作用是避免下次对话重新采访或误用过期成果。开始前先读它以及列出的关键产物，修改时保留不属于当前任务的字段。模板在 ../assets/project.template.json。

- schemaVersion / kitVersion：记录结构与技能版本。
- website：已验证的公开 URL，未知为 null；objective / audience / locales 同理。
- stack / canonicalSource：从证据确认，不能根据示例猜。
- evidence：来源引用及观察时间，不复制密钥或内部认证 URL。
- steps：skill id → status、artifacts、checks、inputRevision、needsRecheck、blocker。
- next：一项最近可执行动作及原因。
- release：内容、镜像、部署与 smoke 的独立引用；不适用与未知通过 notes 解释，不能一项成功自动补齐其他项。

状态：not_started / in_progress / blocked / complete / skipped。只有检查证据支持时使用 complete。skipped 必须写原因和替代证据，不能跳过宿主强制审核。checks 的 result 用 pass/fail/not_checked；保存实际结果与证据路径，不只写“看起来可以”。

恢复时核对当前目标、输入 revision/hash、产物是否存在、证据是否仍适用。相关输入改变，则将依赖步骤 needsRecheck=true，实际复核前不得视为完成；无关变化不强制重做所有阶段。用户仅要一个独立步骤时，先完成该步骤，不要求补齐历史状态。

示例（说明性结构，不是执行结果）：

```json
{
  "status": "blocked",
  "artifacts": ["07-page-plan.csv"],
  "checks": [{"name": "source_coverage", "result": "fail", "evidence": "04-sources.md"}],
  "inputRevision": "user-supplied-dataset-v1",
  "needsRecheck": false,
  "blocker": "候选用途页缺少该用途下的实际产品数据"
}
```

浏览器学习清单与这里的运行记录无连接：用户勾选表示读过/计划已记，不能生成项目 complete、内容 approval 或 release。

