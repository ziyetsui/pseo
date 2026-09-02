---
{
  "schemaVersion": 1,
  "id": "prm_2063814043631280180",
  "type": "prompt",
  "locale": "zh-CN",
  "sourceLocale": "en",
  "slug": "country-miniature-stamp-poster",
  "title": "国家主题微缩邮票海报",
  "summary": "替换一个国家变量，生成包含地标、本地动植物、传统服饰、货币与首都邮戳的超写实微缩邮票海报。",
  "status": "published",
  "indexable": true,
  "contentType": "image",
  "models": [
    "gpt-image-2"
  ],
  "useCases": [
    "country-city-poster"
  ],
  "techniques": [
    "macro-photography",
    "variable-template"
  ],
  "styles": [
    "photorealistic"
  ],
  "subjects": [
    "miniature-landmark"
  ],
  "prompt": {
    "language": "en",
    "text": "A hyper-realistic macro photography shot of a giant, freestanding vintage postage stamp from [COUNTRY] standing upright against a seamless, soft, color-coordinated pastel studio background. The stamp features an intricately detailed 3D diorama of the most iconic and recognizable landmark from [COUNTRY] that pops out and actively breaks the perforated borders, extending outward into the physical space. Lush flora and fauna native to [COUNTRY] grows and spills out from the bottom right corner of the stamp's frame. A tiny, miniature figurine of a person wearing recognizable traditional cultural attire from [COUNTRY] stands on the ground at the bottom left, looking up in awe at the massive stamp, establishing a striking miniature world scale. The stamp's design includes the word \"[COUNTRY]\" in classic serif typography, subtext in the local language, a realistic local currency denomination, and a stamped black ink cancellation postmark in the top right corner featuring the capital city of [COUNTRY] and a realistic date. Soft, diffused, magical studio lighting with a tilt-shift lens effect and shallow depth of field. Gently floating botanical elements native to [COUNTRY] drift through the air around the scene. 8k resolution, octane render, highly detailed miniature art.",
    "variables": [
      {
        "key": "[COUNTRY]",
        "label": "国家",
        "required": true,
        "defaultValue": "Japan",
        "options": [
          "Japan",
          "France",
          "Egypt",
          "Brazil",
          "India",
          "Mexico"
        ]
      }
    ]
  },
  "outcome": {
    "outputType": "image",
    "purpose": "生成国家主题微缩邮票海报。",
    "platforms": [
      "higgsfield"
    ],
    "characteristics": [
      "超写实微距摄影",
      "微缩立体场景",
      "移轴浅景深"
    ]
  },
  "media": [],
  "metrics": {
    "likes": null,
    "bookmarks": null,
    "comments": null,
    "reposts": null,
    "views": null,
    "observedAt": "2026-09-02T00:00:00Z"
  },
  "inputs": {
    "required": [
      "一个国家名称"
    ],
    "optional": []
  },
  "parameters": [
    {
      "key": "COUNTRY",
      "label": "国家",
      "type": "enum",
      "required": true,
      "options": [
        "Japan",
        "France",
        "Egypt",
        "Brazil",
        "India",
        "Mexico"
      ]
    }
  ],
  "examples": [],
  "workflow": [
    {
      "position": 1,
      "title": "打开生成工具",
      "body": "在模型列表中选择 GPT Image 2。"
    },
    {
      "position": 2,
      "title": "粘贴完整 Prompt",
      "body": "保留 Prompt 尾部的渲染细节。"
    },
    {
      "position": 3,
      "title": "替换 [COUNTRY]",
      "body": "把每一处变量替换为同一个国家名。"
    },
    {
      "position": 4,
      "title": "生成并比较",
      "body": "生成多个结果，比较地标冲破邮票边框的构图。"
    }
  ],
  "creator": null,
  "relatedPromptIds": [],
  "actions": {
    "canCopy": true,
    "tryUrl": null
  },
  "source": {
    "platform": "x",
    "sourceId": "2063814043631280180",
    "url": "https://x.com/Naiknelofar788/status/2063814043631280180",
    "authorHandle": "Naiknelofar788",
    "publishedDate": "2026-06-08",
    "observedAt": "2026-09-02T00:00:00Z"
  },
  "evidence": [
    {
      "type": "source-post",
      "url": "https://x.com/Naiknelofar788/status/2063814043631280180",
      "confidence": null
    }
  ],
  "seo": {
    "title": "国家主题微缩邮票海报 Prompt",
    "description": "复制原始 Prompt 并替换一个国家变量，生成超写实微缩邮票海报。",
    "canonical": "https://ancher.space/zh-CN/prompts/country-miniature-stamp-poster",
    "robots": "index,follow"
  },
  "publication": {
    "publishedAt": "2026-09-02T00:00:00Z",
    "updatedAt": "2026-09-02T00:00:00Z",
    "sourceRevision": "sha256:329ee8fb29b020664c2a642c539d2fac6e94c3b4b6b9779526a89c06ed15c8d1"
  },
  "translation": {
    "status": "ready",
    "translatedFromRevision": "sha256:329ee8fb29b020664c2a642c539d2fac6e94c3b4b6b9779526a89c06ed15c8d1",
    "reviewer": "bo"
  }
}
---

# 国家主题微缩邮票海报

只替换一个国家名称，就能让地标、本地动植物、传统服饰、货币、文字与首都邮戳在同一个微缩场景中联动变化。

## Prompt 原文

```prompt
A hyper-realistic macro photography shot of a giant, freestanding vintage postage stamp from [COUNTRY] standing upright against a seamless, soft, color-coordinated pastel studio background. The stamp features an intricately detailed 3D diorama of the most iconic and recognizable landmark from [COUNTRY] that pops out and actively breaks the perforated borders, extending outward into the physical space. Lush flora and fauna native to [COUNTRY] grows and spills out from the bottom right corner of the stamp's frame. A tiny, miniature figurine of a person wearing recognizable traditional cultural attire from [COUNTRY] stands on the ground at the bottom left, looking up in awe at the massive stamp, establishing a striking miniature world scale. The stamp's design includes the word "[COUNTRY]" in classic serif typography, subtext in the local language, a realistic local currency denomination, and a stamped black ink cancellation postmark in the top right corner featuring the capital city of [COUNTRY] and a realistic date. Soft, diffused, magical studio lighting with a tilt-shift lens effect and shallow depth of field. Gently floating botanical elements native to [COUNTRY] drift through the air around the scene. 8k resolution, octane render, highly detailed miniature art.
```

## 使用方法

1. 选择 GPT Image 2。
2. 粘贴完整 Prompt，不要删除尾部渲染细节。
3. 把每一处 `[COUNTRY]` 替换为同一个国家名称。
4. 生成多个结果，比较地标冲破邮票边框的构图。

## 来源

Prompt 原文保持英文，并注明来自 X 上的 [@Naiknelofar788](https://x.com/Naiknelofar788/status/2063814043631280180)。
