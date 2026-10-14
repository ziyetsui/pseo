# Git beta 内容发布验收

| ID | 量化标准 |
|---|---|
| BETA-01 | mode=git-beta，revision同时绑定graph、旧catalog与预览资产；CMS approval/public/mirror伪造数0 |
| IMAGE-01 | 541/541来源处理；521个去重image prompt、541个示例进入catalog；旧22条Images保留；合计543个image prompt |
| WEBSITE-01 | 59/59新项目有页面和预览；58无prompt项目不显示虚假prompt/生成入口；1真实prompt可访问 |
| WEBSITE-02 | Website集合60项，包含原有1条建站prompt；immutable id重复0；来源链接缺失0 |
| GRAPH-01 | 13/13源分类可浏览，所有真实model/style/subject关系可达；孤链/虚假X署名0 |
| UI-01 | 375/768/1440页面无横向溢出；搜索/用途/模型筛选支持URL、刷新、后退与空态 |
| QA-01 | lint/typecheck/unit/build/static全部退出0；保持public-api与旧fixture测试通过 |
| LIVE-01 | beta Hub、Images、Website、59案例详情、521新image详情均200；不存在case404；beta全站noindex |
| LIVE-02 | Pages部署绑定合并Git SHA与git-beta revision；线上回执数量与本地一致 |

验收以实际数字记录，不能把此前CMS-only离线提案状态当成本次Git发布结果。
