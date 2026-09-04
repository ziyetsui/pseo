---
{
  "schemaVersion": 1,
  "id": "art_how_to_replace_prompt_variables",
  "type": "article",
  "locale": "zh-CN",
  "sourceLocale": "zh-CN",
  "slug": "how-to-replace-prompt-variables",
  "title": "如何替换 Prompt 变量",
  "summary": "方括号里的大写词是占位变量。把同一个变量的每一处都换成同一个值，画面才会自洽——这篇讲清楚为什么，以及怎么检查有没有漏改。",
  "status": "draft",
  "indexable": false,
  "authorId": "ata_fixture_editor",
  "categoryIds": [
    "atc_guides"
  ],
  "tags": [],
  "cover": null,
  "provenance": {
    "origin": "original",
    "fixture": true,
    "sourceRef": "frontend/src/data/wireframe/articles.ts",
    "fixturePublishedAt": "2026-08-18",
    "fixtureUpdatedAt": "2026-08-20"
  },
  "source": null,
  "citations": [
    {
      "label": "国家主题微缩邮票海报 — 本文示例引用的变量驱动 Prompt",
      "url": "/zh-CN/prompts/country-miniature-stamp-poster",
      "accessedAt": null
    }
  ],
  "relatedArticleIds": [],
  "seo": {
    "title": "如何替换 Prompt 变量",
    "description": "理解方括号变量与参考图编号，完整替换同一变量并在复制前检查遗漏，避免生成结果出现矛盾。",
    "canonical": "https://ancher.space/zh-CN/blog/how-to-replace-prompt-variables",
    "robots": "noindex,nofollow"
  },
  "publication": {
    "publishedAt": null,
    "updatedAt": "2026-08-20T00:00:00Z",
    "sourceRevision": null
  },
  "translation": {
    "status": "draft",
    "translatedFromRevision": null,
    "reviewer": null
  }
}
---

# 如何替换 Prompt 变量

库里很多提示词写成了模板：`[COUNTRY]`、`[BRAND_NAME]`、`[DEVICE]` 这样的方括号大写词是占位变量，`@img1`、`@image2` 则指向你要上传的参考图。它们不是英文单词，模型不会自己理解，必须由你替换成具体的值。

关键在于「同一个变量的每一处都要换成同一个值」。以国家主题微缩邮票海报为例，`[COUNTRY]` 同时驱动地标、动植物、传统服饰、邮票文字、货币面额和邮戳城市。只改前两处，模型就会拿到互相矛盾的线索：日本的富士山配法国的货币面额，出图会明显不自洽。

所以详情页上的替换次数是数出来的，不是写死的。页面读取提示词原文、统计每个变量实际出现多少次，再告诉你替换会影响多少处。复制按钮会先做完替换再写入剪贴板，如果还有变量没填值，页面会把它们列出来，而不是悄悄放行。

手动替换时，用编辑器的「全部替换」而不是逐个改；替换完再全文搜一遍方括号，确认没有残留。参考图变量（`@img` 系列）要按编号对应上传顺序，第一张图对应 `@img1`，顺序错了角色就会串。

最后一点：提示词原文属于原作者，本站逐字保留。替换变量是为了让它适配你的题材，不要顺手删掉尾部的渲染参数（例如 `8k resolution`、`octane render`），那些词直接决定成品质感。
