---
{
  "schemaVersion": 1,
  "id": "prm_2063814043631280180",
  "type": "prompt",
  "locale": "en",
  "sourceLocale": "en",
  "slug": "country-themed-miniature-postage-stamp-poster",
  "title": "Country-themed miniature postage stamp poster",
  "summary": "Replace one country variable to create a photorealistic miniature postage-stamp poster with a landmark, native plants, cultural clothing, currency, and a capital-city postmark.",
  "status": "draft",
  "indexable": false,
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
        "label": "Country",
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
    "purpose": "Create a country-themed miniature postage-stamp poster.",
    "platforms": [
      "higgsfield"
    ],
    "characteristics": [
      "photorealistic macro photography",
      "miniature diorama",
      "tilt-shift depth of field"
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
      "One country name"
    ],
    "optional": []
  },
  "parameters": [
    {
      "key": "COUNTRY",
      "label": "Country",
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
      "title": "Open the generator",
      "body": "Choose GPT Image 2 from the model list."
    },
    {
      "position": 2,
      "title": "Paste the complete prompt",
      "body": "Keep the rendering details at the end of the prompt."
    },
    {
      "position": 3,
      "title": "Replace [COUNTRY]",
      "body": "Replace every occurrence with the same country name."
    },
    {
      "position": 4,
      "title": "Generate and compare",
      "body": "Generate several options and compare the border-breaking composition."
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
    "title": "Country-themed miniature postage stamp poster Prompt",
    "description": "Copy the original Prompt and replace one country variable to create a photorealistic miniature postage-stamp poster.",
    "canonical": "https://ancher.space/en/prompts/country-themed-miniature-postage-stamp-poster",
    "robots": "noindex,nofollow"
  },
  "publication": {
    "publishedAt": "2026-09-02T00:00:00Z",
    "updatedAt": "2026-09-02T00:00:00Z",
    "sourceRevision": "sha256:329ee8fb29b020664c2a642c539d2fac6e94c3b4b6b9779526a89c06ed15c8d1"
  },
  "translation": {
    "status": "draft",
    "translatedFromRevision": null,
    "reviewer": null
  }
}
---

# Country-themed miniature postage stamp poster

Use one country name to coordinate the landmark, native plants, traditional clothing, currency, typography, and capital-city postmark in a single miniature scene.

## Prompt

```prompt
A hyper-realistic macro photography shot of a giant, freestanding vintage postage stamp from [COUNTRY] standing upright against a seamless, soft, color-coordinated pastel studio background. The stamp features an intricately detailed 3D diorama of the most iconic and recognizable landmark from [COUNTRY] that pops out and actively breaks the perforated borders, extending outward into the physical space. Lush flora and fauna native to [COUNTRY] grows and spills out from the bottom right corner of the stamp's frame. A tiny, miniature figurine of a person wearing recognizable traditional cultural attire from [COUNTRY] stands on the ground at the bottom left, looking up in awe at the massive stamp, establishing a striking miniature world scale. The stamp's design includes the word "[COUNTRY]" in classic serif typography, subtext in the local language, a realistic local currency denomination, and a stamped black ink cancellation postmark in the top right corner featuring the capital city of [COUNTRY] and a realistic date. Soft, diffused, magical studio lighting with a tilt-shift lens effect and shallow depth of field. Gently floating botanical elements native to [COUNTRY] drift through the air around the scene. 8k resolution, octane render, highly detailed miniature art.
```

## How to use it

1. Choose GPT Image 2.
2. Paste the complete Prompt without removing the rendering details at the end.
3. Replace every `[COUNTRY]` token with the same country name.
4. Generate several options and compare the border-breaking composition.

## Source

The original Prompt is preserved in English and attributed to [@Naiknelofar788 on X](https://x.com/Naiknelofar788/status/2063814043631280180).
