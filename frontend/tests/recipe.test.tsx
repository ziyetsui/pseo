// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { RecipeText } from "@/components/RecipeText";
import type { Prompt } from "@/lib/catalog/types";

const sample: Prompt = {
  id: "recipe-test", slug: "recipe-test", href: "/en/prompts/recipe-test", locale: "en", title: "Recipe test", summary: "",
  prompt: "  [COUNTRY] at dawn\n[COUNTRY] at dusk  \n", language: "en", evidence: [], kind: "text", models: [], useCases: [], techniques: [], styles: [], subjects: [],
  handle: "", img: null, media: [], likes: null, saves: null, views: null, highValue: false, score: null, publishedAt: null,
  variables: [{ token: "[COUNTRY]", label: "Country", defaultValue: "", options: ["Japan", "France"], note: null, required: true }],
  steps: [], requiredInputs: [], optionalInputs: [], parameters: [], source: { url: "", platform: "", observedAt: null },
  actions: { canCopy: true, tryUrl: null }, localeVariants: [], seo: { title: "Recipe test", description: "", canonicalUrl: null, robots: "noindex,nofollow", hreflang: {} },
  revision: "test-revision", appearsOn: ["l4"], featuredOn: [],
};

afterEach(cleanup);

describe("Recipe placeholder journey", () => {
  it("renders the original in HTML and replaces every occurrence without changing whitespace", () => {
    const { container } = render(<RecipeText prompt={sample} />);
    expect(container.querySelector("[data-prompt]")?.textContent).toBe(sample.prompt);
    fireEvent.click(screen.getByRole("radio", { name: "Japan" }));
    expect(container.querySelector("[data-prompt]")?.textContent).toBe("  Japan at dawn\nJapan at dusk  \n");
    expect(screen.queryByRole("button", { name: /copy/i })).toBeNull();
    expect(screen.getByText("Your template, with placeholders filled.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Reset placeholders" }));
    expect(container.querySelector("[data-prompt]")?.textContent).toBe(sample.prompt);
  });

  it("allows free input when no options were provided, without interpreting replacement text as another token", () => {
    const prompt = { ...sample, prompt: "[COUNTRY] + [CITY]", variables: [
      { token: "[COUNTRY]", label: "Country", defaultValue: "", options: [], note: null, required: true },
      { token: "[CITY]", label: "City", defaultValue: "", options: [], note: null, required: true },
    ] };
    const { container } = render(<RecipeText prompt={prompt} />);
    fireEvent.click(within(screen.getByRole("radiogroup", { name: "[COUNTRY]" })).getByRole("radio", { name: "Custom" }));
    fireEvent.click(within(screen.getByRole("radiogroup", { name: "[CITY]" })).getByRole("radio", { name: "Custom" }));
    fireEvent.change(screen.getByRole("textbox", { name: "[COUNTRY]" }), { target: { value: "[CITY]" } });
    fireEvent.change(screen.getByRole("textbox", { name: "[CITY]" }), { target: { value: "Kyoto" } });
    expect(container.querySelector("[data-prompt]")?.textContent).toBe("[CITY] + Kyoto");
  });

  it("retains custom values when switching options and clears them on reset", () => {
    const { container } = render(<RecipeText prompt={sample} />);
    fireEvent.click(screen.getByRole("radio", { name: "Custom" }));
    fireEvent.change(screen.getByRole("textbox", { name: "[COUNTRY]" }), { target: { value: "Italy" } });
    fireEvent.click(screen.getByRole("radio", { name: "Japan" }));
    expect(screen.queryByRole("textbox")).toBeNull();
    fireEvent.click(screen.getByRole("radio", { name: "Custom" }));
    expect(container.querySelector("[data-prompt]")?.textContent).toBe("  Italy at dawn\nItaly at dusk  \n");
    fireEvent.click(screen.getByRole("button", { name: "Reset placeholders" }));
    fireEvent.click(screen.getByRole("radio", { name: "Custom" }));
    expect((screen.getByRole("textbox") as HTMLInputElement).value).toBe("");
    expect(container.querySelector("[data-prompt]")?.textContent).toBe(sample.prompt);
  });

  it("keeps the no-placeholder text readable without a copy button", () => {
    const { container } = render(<RecipeText prompt={{ ...sample, prompt: "Original text\n", variables: [], actions: { canCopy: false, tryUrl: null } }} />);
    expect(screen.getByText("This prompt has no placeholders. Copy it as it is.")).toBeTruthy();
    expect(container.querySelector("[data-prompt]")?.textContent).toBe("Original text\n");
    expect(screen.queryByRole("button", { name: /copy/i })).toBeNull();
  });

  it("keeps valid JSON valid when a selected custom value contains quotes", () => {
    const { container } = render(<RecipeText prompt={{ ...sample, prompt: '{"place":"[COUNTRY]", "again":"[COUNTRY]"}' }} />);
    fireEvent.click(screen.getByRole("radio", { name: "Custom" }));
    fireEvent.change(screen.getByRole("textbox", { name: "[COUNTRY]" }), { target: { value: 'A "quoted" place' } });
    expect(JSON.parse(container.querySelector("[data-prompt]")!.textContent!)).toEqual({ place: 'A "quoted" place', again: 'A "quoted" place' });
  });
});
