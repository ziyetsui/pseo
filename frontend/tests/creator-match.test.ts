import { describe, expect, it } from "vitest";
import { isPromptCreator } from "../src/lib/catalog/creator-match";
import type { Creator, Prompt } from "../src/lib/catalog/types";

type Author = Pick<Creator, "id" | "slug" | "handle">;
type Credit = Pick<Prompt, "creatorRef" | "handle">;
const creator: Author = { id: "creator-one", slug: "one", handle: "@One" };
const reference = { id: creator.id, slug: creator.slug, label: "One" };

describe("shared prompt creator identity", () => {
  it("matches a canonical id or slug even when the display handle changed", () => {
    expect(isPromptCreator({ creatorRef: { ...reference, slug: "former-slug" }, handle: "@Old" }, creator)).toBe(true);
    expect(isPromptCreator({ creatorRef: { ...reference, id: "older-id" }, handle: "" }, creator)).toBe(true);
  });

  it("does not fall back to another author's matching handle when a reference exists", () => {
    const prompt: Credit = { creatorRef: reference, handle: "@SameHandle" };
    const other: Author = { id: "creator-other", slug: "other", handle: "@SameHandle" };
    expect(isPromptCreator(prompt, other)).toBe(false);
    expect(isPromptCreator(prompt, { ...creator, handle: "@Renamed" })).toBe(true);
  });

  it("normalizes legacy handles consistently across prefix, case and surrounding whitespace", () => {
    for (const handle of ["One", "@one", "  @ONE  ", " @ One "]) {
      expect(isPromptCreator({ handle }, creator)).toBe(true);
      expect(isPromptCreator({ creatorRef: null, handle }, { ...creator, handle: " one " })).toBe(true);
    }
    expect(isPromptCreator({ handle: "@SomeoneElse" }, creator)).toBe(false);
  });

  it("never attributes empty identities to each other", () => {
    const empty: Author = { id: "", slug: "", handle: "" };
    for (const handle of ["", " ", "@", " @ "]) {
      expect(isPromptCreator({ handle }, empty)).toBe(false);
      expect(isPromptCreator({ handle }, creator)).toBe(false);
    }
    expect(isPromptCreator({ handle: "@One", creatorRef: { id: "", slug: "", label: "" } }, creator)).toBe(false);
    expect(isPromptCreator({ handle: "", creatorRef: { id: "", slug: "", label: "" } }, empty)).toBe(false);
  });

  it("selects the same author for profile lookup and collection membership", () => {
    const authors: Author[] = [{ id: "decoy", slug: "decoy", handle: "@One" }, creator];
    const prompt: Credit = { creatorRef: reference, handle: "@One" };
    expect(authors.find(author => isPromptCreator(prompt, author))).toBe(creator);
    expect(authors.filter(author => isPromptCreator(prompt, author))).toEqual([creator]);
  });
});
