import { describe, expect, it } from "vitest";

import { dynamicParams, generateStaticParams } from "@/app/[locale]/(site)/prompts/[promptSlug]/page";
import { getContentRepository } from "@/lib/content";
import { PUBLISHED_LOCALES } from "@/lib/i18n/config";

/**
 * The static export has to contain a page for every prompt in the data set —
 * not a curated subset — and nothing outside it (`dynamicParams = false` turns
 * an unknown slug into a 404 rather than a runtime render).
 */
describe("prompt detail generateStaticParams", () => {
  it("emits one page per prompt per published locale", async () => {
    const params = await generateStaticParams();
    const { items } = await getContentRepository().listPrompts("zh-CN");

    expect(items.length).toBeGreaterThan(0);
    expect(params).toHaveLength(items.length * PUBLISHED_LOCALES.length);
    expect(new Set(params.map((entry) => `${entry.locale}/${entry.promptSlug}`)).size).toBe(
      params.length,
    );
    for (const prompt of items) {
      expect(params).toContainEqual({ locale: "zh-CN", promptSlug: prompt.slug });
    }
  });

  it("never generates a slug that would collide with the static sibling routes", async () => {
    const params = await generateStaticParams();
    for (const entry of params) {
      expect(["image", "models"]).not.toContain(entry.promptSlug);
    }
  });

  it("refuses slugs outside the generated set", () => {
    expect(dynamicParams).toBe(false);
  });
});
