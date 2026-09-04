import { describe, expect, it } from "vitest";
import { createFixtureCatalog } from "../src/lib/catalog/fixture";
import { placeholderChoices } from "../src/lib/catalog/placeholder-choices";
import type { Variable } from "../src/lib/catalog/types";

const variable = (overrides: Partial<Variable> = {}): Variable => ({
  token: "[EYE_COLOR]", label: "Eye color", defaultValue: "", options: [], note: null, required: true, ...overrides,
});

describe("placeholder editing suggestions", () => {
  it("offers usable choices for every fixture variable, including empty defaults", () => {
    const catalog = createFixtureCatalog("zh-CN");
    const variables = catalog.prompts.flatMap(prompt => prompt.variables);
    expect(variables.some(item => !item.defaultValue)).toBe(true);
    for (const item of variables) {
      const choices = placeholderChoices(item);
      expect(choices.length, item.token).toBeGreaterThan(1);
      if (!item.options.some(option => option.trim())) expect(choices.length, item.token).toBeLessThanOrEqual(5);
      expect(choices.every(choice => !!choice.trim()), item.token).toBe(true);
      if (item.defaultValue.trim()) expect(choices, item.token).toContain(item.defaultValue.trim());
    }
  });

  it("prioritizes supplied options and keeps the default selectable without mutation", () => {
    const item = variable({ defaultValue: " amber ", options: ["green", " green ", "", "blue", "brown", "grey", "violet", "hazel"] });
    const original = structuredClone(item);
    expect(placeholderChoices(item)).toEqual(["amber", "green", "blue", "brown", "grey", "violet", "hazel"]);
    expect(item).toEqual(original);
    expect(placeholderChoices(variable({ defaultValue: "green", options: ["green", "blue"] }))).toEqual(["green", "blue"]);
  });

  it("uses semantic suggestions only when supplied options are empty", () => {
    expect(placeholderChoices(variable({ options: [" ", ""] }))).toEqual(["hazel", "green", "dark brown"]);
    expect(placeholderChoices(variable({ options: ["amber"] }))).toEqual(["amber"]);
    expect(placeholderChoices(variable({ token: "[EYE_COLOR]", defaultValue: "dark brown eyes" }))).toContain("hazel eyes");
    expect(placeholderChoices(variable({ token: "[LANDSCAPE]", defaultValue: "miniature rivers" }))).toContain("miniature hills");
  });

  it("does not invent choices for unknown tokens or reinterpret arbitrary labels", () => {
    expect(placeholderChoices(variable({ token: "[OPAQUE_CODE]", label: "Eye color", defaultValue: " original " }))).toEqual(["original"]);
    expect(placeholderChoices(variable({ token: "[OPAQUE_CODE]" }))).toEqual([]);
    expect(placeholderChoices(variable({ token: "[OPAQUE_CODE]", options: ["x", "y"] }))).toEqual(["x", "y"]);
  });
});
