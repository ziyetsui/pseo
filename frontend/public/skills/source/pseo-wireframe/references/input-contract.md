# 输入合同 v1

用 `examples/podcast.json` 或 `examples/outdoor.json` 查看完整示例。这些都是明确标注的虚构结构样本，不作为事实或推荐。

| 字段 | 必需 | 值 |
| --- | --- | --- |
| version | 是 | 1 |
| name / audience / task | 是 | 项目名、读者、具体用户任务，各 1–500 字符 |
| kind | 是 | catalog / knowledge / recipe |
| goal | 是 | discover / learn / decide |
| action | 是 | read / copy / source |
| sampleMode | 是 | provided / illustrative |
| categoryLabel / collectionLabel | 是 | 页面上的一级、二级分组名称 |
| density | 是 | comfortable / compact |
| records | 是 | 最多 100 条；provided 不得为空 |

记录必须有 id、title、category、collection、summary、body。id 唯一，1–80 个字母、数字、下划线或短横线；body 最多 20000 字符，其他必需文本最多 1000 字符。source 可省略或为空，只接受无用户名密码的 http/https URL；不读取链接内容。

同一集合名称可存在于不同分类，分别生成页面；详情只属于输入给定的一组。首版不是任意多对多图谱。记录中的完整 body 渲染为可选取的纯文本，不解析 HTML 或执行脚本。

`illustrative` + 空 records 自动生成四条带明确标注的结构记录；非空 records 原样用于原型并整体标为结构示例。`provided` 使用用户给的样本，来源与权利保持未审核。

修改上游输入后生成新版本目录。progress 中 complete 只表示目标字段齐全；draft / unverified / generated / not_run 各自保留，不将自动构建变成已验收。

## 离线向导

七步输入 → 预览 → 单独下载 HTML / JSON / 方法文档。浏览器本机存储可能被禁用或清除，可靠续接依赖导出的 project.json。复制权限受浏览器限制时，生成页选中正文供手动复制。
