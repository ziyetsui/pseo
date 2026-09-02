import { describe, expect, it } from "vitest";

import { countToken, extractVariables, substituteVariables } from "@/lib/content/variables";

const STAMP_PROMPT = [
  "A hyper-realistic macro photography shot of a giant, freestanding vintage postage stamp from [COUNTRY]",
  "standing upright. The stamp features the most iconic landmark from [COUNTRY] that breaks the borders.",
  'Flora native to [COUNTRY] spills out. A figurine wearing traditional attire from [COUNTRY] looks up.',
  'The design includes the word "[COUNTRY]" in serif typography, a postmark featuring the capital city of',
  "[COUNTRY], and floating botanical elements native to [COUNTRY]. 8k resolution, octane render.",
].join(" ");

describe("extractVariables", () => {
  it("finds bracketed upper-case tokens once each, in first-appearance order", () => {
    expect(extractVariables("Show the [DEVICE] in a [SCENE TYPE], then the [DEVICE] again")).toEqual([
      { token: "[DEVICE]", count: 2 },
      { token: "[SCENE TYPE]", count: 1 },
    ]);
  });

  it("counts every occurrence of [COUNTRY] in the golden-record prompt", () => {
    expect(extractVariables(STAMP_PROMPT)).toEqual([{ token: "[COUNTRY]", count: 7 }]);
  });

  it("recognises @img / @image reference placeholders", () => {
    expect(extractVariables("Final subject is @img1 next to @image2 and @img1 again")).toEqual([
      { token: "@img1", count: 2 },
      { token: "@image2", count: 1 },
    ]);
  });

  it("ignores lower-case brackets, prose brackets and empty text", () => {
    expect(extractVariables("[a] [Mixed Case] [1234] plain text")).toEqual([]);
    expect(extractVariables("")).toEqual([]);
  });

  it("accepts digits, spaces, underscores, slashes and hyphens inside a token", () => {
    expect(extractVariables("[BRAND_NAME] [SHOT 2] [A/B] [CTA-TEXT]").map((v) => v.token)).toEqual([
      "[BRAND_NAME]",
      "[SHOT 2]",
      "[A/B]",
      "[CTA-TEXT]",
    ]);
  });
});

describe("countToken", () => {
  it("counts literal occurrences without regex interpretation", () => {
    expect(countToken(STAMP_PROMPT, "[COUNTRY]")).toBe(7);
    expect(countToken("a.b a.b axb", "a.b")).toBe(2);
    expect(countToken("nothing here", "[COUNTRY]")).toBe(0);
    expect(countToken("anything", "")).toBe(0);
  });
});

describe("substituteVariables", () => {
  it("replaces every occurrence and reports the real replacement count", () => {
    const result = substituteVariables(STAMP_PROMPT, { "[COUNTRY]": "Japan" });
    expect(result.text).not.toContain("[COUNTRY]");
    expect(result.text).toContain("from Japan");
    expect(result.replaced).toEqual({ "[COUNTRY]": 7 });
    expect(result.unreplaced).toEqual([]);
  });

  it("lists tokens that were left without a value", () => {
    const result = substituteVariables("Use [COUNTRY] with [CITY] and @img1", { "[COUNTRY]": "France" });
    expect(result.text).toBe("Use France with [CITY] and @img1");
    expect(result.replaced).toEqual({ "[COUNTRY]": 1 });
    expect(result.unreplaced).toEqual(["[CITY]", "@img1"]);
  });

  it("treats an empty or whitespace-only value as no value at all", () => {
    const result = substituteVariables("Use [COUNTRY]", { "[COUNTRY]": "   " });
    expect(result.text).toBe("Use [COUNTRY]");
    expect(result.replaced).toEqual({});
    expect(result.unreplaced).toEqual(["[COUNTRY]"]);
  });

  it("never reports a replacement for a token that is not in the text", () => {
    const result = substituteVariables("No tokens here", { "[COUNTRY]": "Egypt" });
    expect(result.text).toBe("No tokens here");
    expect(result.replaced).toEqual({});
    expect(result.unreplaced).toEqual([]);
  });
});
