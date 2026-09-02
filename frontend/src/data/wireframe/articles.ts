// HAND-WRITTEN fixture — not produced by scripts/extract-wireframe.mjs.
//
// The wireframe has no blog. These zh-CN articles exist so the blog routes
// have real, readable content to render; every record carries `isFixture: true`
// and the repository is the only module allowed to read them.
//
// `release-notes` is deliberately a real category with zero articles: it lets
// the blog list page prove it never links a category the category route would
// not generate a page for. `case-studies` holds exactly one article on purpose
// so that article's related-articles rail has to fall back across categories.

import type { WireframeArticleCategoryRecord, WireframeArticleRecord } from "@/lib/content/types";

/** Every fixture article shares the same honest, clearly-labelled byline. */
const FIXTURE_AUTHOR = { name: "站点编辑（fixture）", url: null } as const;

export const WIREFRAME_ARTICLE_CATEGORIES: readonly WireframeArticleCategoryRecord[] = [
  {
    id: "article-category:guides",
    slug: "guides",
    label: "指南",
    description: "怎么用这些提示词：变量替换、复制流程、来源与版权。",
  },
  {
    id: "article-category:release-notes",
    slug: "release-notes",
    label: "更新日志",
    description: "记录内容库版本变更的计划分类，目前还没有对应文章。",
  },
  {
    id: "article-category:case-studies",
    slug: "case-studies",
    label: "案例复盘",
    description: "从复制提示词到出片的完整案例复盘。",
  },
];

export const WIREFRAME_ARTICLES: readonly WireframeArticleRecord[] = [
  {
    id: "article:how-to-replace-prompt-variables",
    slug: "how-to-replace-prompt-variables",
    categorySlug: "guides",
    title: "如何替换 Prompt 变量",
    excerpt:
      "方括号里的大写词是占位变量。把同一个变量的每一处都换成同一个值，画面才会自洽——这篇讲清楚为什么，以及怎么检查有没有漏改。",
    paragraphs: [
      "库里很多提示词写成了模板：`[COUNTRY]`、`[BRAND_NAME]`、`[DEVICE]` 这样的方括号大写词是占位变量，`@img1`、`@image2` 则指向你要上传的参考图。它们不是英文单词，模型不会自己理解，必须由你替换成具体的值。",
      "关键在于「同一个变量的每一处都要换成同一个值」。以国家主题微缩邮票海报为例，`[COUNTRY]` 同时驱动地标、动植物、传统服饰、邮票文字、货币面额和邮戳城市。只改前两处，模型就会拿到互相矛盾的线索：日本的富士山配法国的货币面额，出图会明显不自洽。",
      "所以详情页上的替换次数是数出来的，不是写死的。页面读取提示词原文、统计每个变量实际出现多少次，再告诉你替换会影响多少处。复制按钮会先做完替换再写入剪贴板，如果还有变量没填值，页面会把它们列出来，而不是悄悄放行。",
      "手动替换时，用编辑器的「全部替换」而不是逐个改；替换完再全文搜一遍方括号，确认没有残留。参考图变量（`@img` 系列）要按编号对应上传顺序，第一张图对应 `@img1`，顺序错了角色就会串。",
      "最后一点：提示词原文属于原作者，本站逐字保留。替换变量是为了让它适配你的题材，不要顺手删掉尾部的渲染参数（例如 `8k resolution`、`octane render`），那些词直接决定成品质感。",
    ],
    author: FIXTURE_AUTHOR,
    sources: [
      {
        kind: "promptDetail",
        promptSlug: "country-miniature-stamp-poster",
        label: "国家主题微缩邮票海报 — 本文示例引用的变量驱动 Prompt",
        publishedAt: null,
      },
    ],
    publishedAt: "2026-08-18",
    updatedAt: "2026-08-20",
    isFixture: true,
  },
  {
    id: "article:sources-and-copyright",
    slug: "sources-and-copyright",
    categorySlug: "guides",
    title: "来源与版权说明",
    excerpt:
      "每条提示词都来自 X 上的公开分享，本站逐字保留原文并链回原帖。这篇说明我们收录了什么、没收录什么，以及你转发成品时该怎么署名。",
    paragraphs: [
      "本站收录的提示词全部来自创作者在 X 上主动公开分享的帖子。每一条都保留原帖链接、作者 handle 和发布时间；提示词正文逐字保留，不改写、不「优化」，因为改动一个词就可能改变出图结果，也就不再是原作者分享的那条提示词了。",
      "提示词的著作权归原作者所有。本站提供的是索引和检索：把散落在时间线里的提示词按模型、用途、镜头语言和风格整理起来，方便你找到并复制。如果你用某条提示词做出了满意的成品并公开发布，请链回原帖或标注作者 handle。",
      "页面上的点赞、收藏、浏览等互动数字是快照，不是实时值。每个数字都标注了观测日期，之后原帖的数据变化不会自动同步。原型阶段部分数字只能取到「3.8K」这类近似值，这类记录会在数据里标记为近似，缺失的指标一律留空，不用 0 顶替。",
      "有些内容我们没有收录：帖子里的图片和视频只做缩略展示并链回原帖，不做转存；没有公开提示词正文、只展示成品的帖子不收录；作者要求下架的条目会移除。如果你是作者并希望调整或撤下自己的内容，请通过原帖联系我们。",
      "这两篇文章本身是示例内容（fixture），用来验证博客路由与排版；正式上线时会替换为编辑撰写的正式稿。",
    ],
    author: FIXTURE_AUTHOR,
    sources: [
      {
        kind: "promptsHome",
        label: "Prompt 库首页 — 全部收录条目均标注原帖链接与作者 handle",
        publishedAt: null,
      },
    ],
    publishedAt: "2026-08-19",
    updatedAt: "2026-08-20",
    isFixture: true,
  },
  {
    id: "article:stamp-poster-case-study",
    slug: "stamp-poster-case-study",
    categorySlug: "case-studies",
    title: "案例复盘：国家主题微缩邮票海报",
    excerpt:
      "拿库里收录的黄金 Prompt 复盘一遍完整流程：从读懂变量、逐处替换，到检查出图有没有互相矛盾的细节。",
    paragraphs: [
      "这篇复盘用的是库里「国家主题微缩邮票海报」这条 Prompt：一张巨型复古邮票立在柔和影棚背景里，地标从齿孔边缘凸出来，动植物从右下角溢出。整条 Prompt 只有一个变量 `[COUNTRY]`，但它在原文里出现了六次，分别驱动地标、动植物、传统服饰、邮票文字、货币面额和邮戳城市。",
      "复盘的第一步是通读原文、圈出每一处 `[COUNTRY]`，确认它们要表达的是同一个国家，而不是「地标用日本、货币面额用法国」这种拼贴。详情页会把实际出现次数数出来显示，用来核对有没有漏改。",
      "第二步是替换：把六处 `[COUNTRY]` 全部换成同一个值，例如「意大利」。换完之后再通读一遍，确认地标（比萨斜塔）、动植物（橄榄树、地中海燕鸥）、服饰、货币（里拉/欧元字样）和邮戳城市（罗马）是否互相呼应——这是复盘里最容易漏掉、也最影响成片可信度的一步。",
      "最后一步是出图前的自查清单：变量替换次数是否等于原文出现次数、渲染参数（`8k resolution`、`octane render` 等）有没有被误删、以及成片发布时是否链回了原帖。这三点做到位，复盘就算完整。",
    ],
    author: FIXTURE_AUTHOR,
    sources: [
      {
        kind: "promptDetail",
        promptSlug: "country-miniature-stamp-poster",
        label: "国家主题微缩邮票海报 — 本案例复盘所依据的 Prompt",
        publishedAt: null,
      },
    ],
    publishedAt: "2026-08-17",
    updatedAt: "2026-08-19",
    isFixture: true,
  },
];
