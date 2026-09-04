---
{
  "schemaVersion": 1,
  "id": "art_stamp_poster_case_study",
  "type": "article",
  "locale": "zh-CN",
  "sourceLocale": "zh-CN",
  "slug": "stamp-poster-case-study",
  "title": "案例复盘：国家主题微缩邮票海报",
  "summary": "拿库里收录的黄金 Prompt 复盘一遍完整流程：从读懂变量、逐处替换，到检查出图有没有互相矛盾的细节。",
  "status": "draft",
  "indexable": false,
  "authorId": "ata_fixture_editor",
  "categoryIds": [
    "atc_case_studies"
  ],
  "tags": [],
  "cover": null,
  "provenance": {
    "origin": "original",
    "fixture": true,
    "sourceRef": "frontend/src/data/wireframe/articles.ts",
    "fixturePublishedAt": "2026-08-17",
    "fixtureUpdatedAt": "2026-08-19"
  },
  "source": null,
  "citations": [
    {
      "label": "国家主题微缩邮票海报 — 本案例复盘所依据的 Prompt",
      "url": "/zh-CN/prompts/country-miniature-stamp-poster",
      "accessedAt": null
    }
  ],
  "relatedArticleIds": [],
  "seo": {
    "title": "国家主题微缩邮票海报案例复盘",
    "description": "按国家主题微缩邮票海报 Prompt 的真实变量结构，复盘完整替换、语义一致性检查与出图前自查。",
    "canonical": "https://ancher.space/zh-CN/blog/stamp-poster-case-study",
    "robots": "noindex,nofollow"
  },
  "publication": {
    "publishedAt": null,
    "updatedAt": "2026-08-19T00:00:00Z",
    "sourceRevision": null
  },
  "translation": {
    "status": "draft",
    "translatedFromRevision": null,
    "reviewer": null
  }
}
---

# 案例复盘：国家主题微缩邮票海报

这篇复盘用的是库里「国家主题微缩邮票海报」这条 Prompt：一张巨型复古邮票立在柔和影棚背景里，地标从齿孔边缘凸出来，动植物从右下角溢出。整条 Prompt 只有一个变量 `[COUNTRY]`，但它在原文里出现了六次，分别驱动地标、动植物、传统服饰、邮票文字、货币面额和邮戳城市。

复盘的第一步是通读原文、圈出每一处 `[COUNTRY]`，确认它们要表达的是同一个国家，而不是「地标用日本、货币面额用法国」这种拼贴。详情页会把实际出现次数数出来显示，用来核对有没有漏改。

第二步是替换：把六处 `[COUNTRY]` 全部换成同一个值，例如「意大利」。换完之后再通读一遍，确认地标（比萨斜塔）、动植物（橄榄树、地中海燕鸥）、服饰、货币（里拉/欧元字样）和邮戳城市（罗马）是否互相呼应——这是复盘里最容易漏掉、也最影响成片可信度的一步。

最后一步是出图前的自查清单：变量替换次数是否等于原文出现次数、渲染参数（`8k resolution`、`octane render` 等）有没有被误删、以及成片发布时是否链回了原帖。这三点做到位，复盘就算完整。
