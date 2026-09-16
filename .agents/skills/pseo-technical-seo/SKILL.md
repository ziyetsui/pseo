---
name: pseo-technical-seo
description: Verify rendered HTML, canonical, robots, sitemaps, locale links and structured data for a PSEO family. 页面能用，但你需要确认它可抓取、URL 一致且没有索引冲突。
---

# 检查搜索引擎看到的页面

页面能用，但你需要确认它可抓取、URL 一致且没有索引冲突。

## 输入与范围

可运行页面/静态输出、页面资格策略、真实目标域名与 locale 关系。

可单独使用，不要求已运行整套流程。读取用户指定的产物与适用项目规则；缺必需输入时先复用已有材料，只补问阻塞当前步骤的信息。默认将新产物保存到 `docs/pseo/`，用户指定位置优先。不要因使用本 skill 扩大任务、生产权限或费用范围。

## 执行

1. 检查实际 HTML 与 HTTP 状态，不只看 React 组件或浏览器水合后画面。核心正文、title、description 和真实链接应在初始响应中可用。

2. 建立 URL｜status｜canonical｜robots｜sitemap｜locale alternates｜schema｜问题 表。canonical 取确认的正式域名和路由，不能按 preview host 猜。

3. 让 sitemap、页面 robots 与资格清单一致；只保留真实可索引 canonical 目标。noindex 页面必须允许爬虫看到该指令，robots.txt 屏蔽不等于 noindex，也不是访问控制。

4. 检查 hreflang 双向且只含真实可访问的已就绪译文；单语言站不强制多语言。过滤组合、分页与重复 URL 分别定义策略，避免无穷组合。

5. 结构化数据只描述可见真实内容，不为富结果补不存在的评分/FAQ/步骤。lastmod 来源于实质内容变化，不用每次构建时间。

6. 在授权环境检查坏链、404/410/redirect、移动布局、性能与可访问性；查看当前 Google 官方指南解决不确定规则，记录无法在线验证的项目。

## 交付与完成条件

主交付：`12-technical-seo.md`（按 URL 记录的 SEO 检查）。记录输入版本、证据位置、实际检查、未知与阻塞。

- 每项结论可回到 URL/输出文件和实际检查。
- 草稿、预览、未审核内容不进入正式 sitemap；canonical/noindex 冲突被识别而非掩盖。

若项目已有 `project.json` 进度记录，只有完成条件有证据时才更新本步骤为 complete；缺口写 blocked，未实测写 not_checked，不把个人学习勾选当工程证据。上游 revision 变化后重查受影响结论。

下一步通常是 `pseo-content-workflow`，但以用户当前目标和真实缺口为准。未安装下一项时说明缺项；本步骤仍可独立交付，不假装调用成功。

## 示例请求

> 检查这批页面的初始 HTML、canonical、sitemap 和多语言关系是否一致。

## 按需查阅的一手资料

- [Google：以用户为中心的内容](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)：判断任务价值与信息增量时查阅，不据此承诺排名。
- [Google：URL 结构](https://developers.google.com/search/docs/crawling-indexing/url-structure)：处理 URL 与抓取复杂度时查阅；实施前核对当前规则。
