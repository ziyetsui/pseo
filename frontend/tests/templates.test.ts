import { describe, expect, it } from "vitest";
import prototype from "../src/data/prototype.json";
import { createFixtureCatalog } from "../src/lib/catalog/fixture";
import { filledPlaceholderParts, placeholderTokens } from "../src/lib/catalog/placeholders";
import { isStructuredPrompt } from "../src/lib/catalog/task-findings";

const catalog = createFixtureCatalog("zh-CN");
describe("reviewed editable templates", () => {
  it("covers every local prompt and preserves valid JSON and source media relationships", () => {
    expect(catalog.prompts).toHaveLength(prototype.prompts.length);
    for (const prompt of catalog.prompts) {
      const source = prototype.prompts.find(row => row.id === prompt.id)!;
      expect(prompt.editableTemplate, prompt.id).toBe(true);
      expect(prompt.variables.length, prompt.id).toBeGreaterThan(0);
      expect(prompt.variables.map(v => v.token)).toEqual(placeholderTokens(prompt.prompt));
      expect(prompt.img).toBe(source.img);
      expect(prompt.source.url).toContain(prompt.id);
      let parsed: unknown;
      try { parsed = JSON.parse(source.prompt); } catch { continue; }
      expect(JSON.parse(prompt.prompt), prompt.id).toBeTypeOf(typeof parsed);
      const values = Object.fromEntries(prompt.variables.map(v => [v.token, 'New "value"\n\\path']));
      expect(() => JSON.parse(filledPlaceholderParts(prompt.prompt, prompt.variables.map(v => v.token), values).map(p => p.text).join(""))).not.toThrow();
    }
  });
  it("makes the selected poster editable without replacing its rendering instructions", () => {
    const prompt = catalog.prompts.find(p => p.id === "2026574551207792783")!;
    expect(prompt.prompt).toContain('the word "[POSTER_TEXT]"');
    expect(prompt.prompt).not.toContain('"HEIS"');
    expect(prompt.prompt).toContain("subtle film grain texture");
    expect(prompt.variables.find(v => v.token === "[POSTER_TEXT]")?.defaultValue).toBe("HEIS");
  });
  it("does not classify a leading placeholder or JSON array as the wrong text type", () => {
    expect(placeholderTokens('["red", "blue"] [SUBJECT] [PROP_1]')).toEqual(["[SUBJECT]", "[PROP_1]"]);
    expect(isStructuredPrompt({ ...catalog.prompts[0]!, prompt: "[SUBJECT] stands in [LOCATION]." })).toBe(false);
    expect(isStructuredPrompt({ ...catalog.prompts[0]!, prompt: '[{"subject":"[SUBJECT]"}]' })).toBe(true);
  });
  it("fills repeated tokens once and treats replacement syntax as literal text", () => {
    const text = "[SUBJECT]\n[SUBJECT] wears [COLOR].";
    expect(filledPlaceholderParts(text, placeholderTokens(text), { "[SUBJECT]": "[COLOR]", "[COLOR]": "$& blue" }).map(p => p.text).join(""))
      .toBe("[COLOR]\n[COLOR] wears $& blue.");
  });
});
