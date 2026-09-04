import { renderToStaticMarkup } from "react-dom/server";
import { parse } from "node-html-parser";
import { describe, expect, it } from "vitest";
import { ModelRelatedTopics } from "@/components/ModelRelatedTopics";
import { createFixtureCatalog } from "@/lib/catalog/fixture";
import type { Prompt, Ref } from "@/lib/catalog/types";

const catalog = createFixtureCatalog("zh-CN");
const ref = (slug: string): Ref => ({ id: slug, slug, label: slug, href: `/zh-CN/prompts/subjects/${slug}`, count: 999 });
const beauty = ref("beauty"), cinematic = ref("cinematic"), portrait = ref("portrait"), noCover = ref("no-cover");
const prompt = (id: string, overrides: Partial<Prompt> = {}): Prompt => ({
  ...catalog.prompts[0]!, id, useCases: [], styles: [], subjects: [], img: `/media/${id}.jpg`, media: [], ...overrides,
});

describe("model related topics", () => {
  it("ranks actual model relationships, deduplicates counts and links to the complete taxonomy destinations", () => {
    const one = prompt("one", { useCases: [beauty, beauty], styles: [cinematic], subjects: [portrait] });
    const two = prompt("two", { useCases: [beauty] });
    const outside = prompt("outside", { useCases: [beauty], styles: [cinematic] });
    const invisible = prompt("invisible", { useCases: [noCover], img: null });
    const rows = [one, one, two, invisible];
    const html = parse(renderToStaticMarkup(<ModelRelatedTopics catalog={{ ...catalog, prompts: [...rows, outside, outside] }} prompts={rows} />));
    const cards = html.querySelectorAll(".model-topic-card");
    expect(cards.map(card => card.querySelector("h3")!.text)).toEqual(["beauty", "cinematic", "portrait"]);
    expect(cards.map(card => card.querySelector(".model-topic-count")!.text)).toEqual(["3 prompts", "2 prompts", "1 prompt"]);
    expect(cards.map(card => card.getAttribute("href"))).toEqual([
      "/zh-CN/prompts/use-cases/beauty", "/zh-CN/prompts/styles/cinematic", portrait.href,
    ]);
    expect(cards.every(card => [one.img, two.img].includes(card.querySelector("img")!.getAttribute("src")!))).toBe(true);
    expect(html.text).not.toContain(noCover.label);
  });

  it("uses video posters as navigation thumbnails without nesting player controls", () => {
    const video = prompt("video", { kind: "video", useCases: [beauty], media: [{ id: "clip", kind: "video", src: "/video.mp4", poster: "/poster.jpg", alt: "clip", width: 320, height: 200, label: null }] });
    const html = parse(renderToStaticMarkup(<ModelRelatedTopics catalog={{ ...catalog, prompts: [video] }} prompts={[video]} />));
    expect(html.querySelector("img")?.getAttribute("src")).toBe(video.img);
    expect(html.querySelector("video")).toBeNull();
  });

  it("omits empty/no-thumbnail related sections and limits navigation to six real topics", () => {
    expect(renderToStaticMarkup(<ModelRelatedTopics catalog={catalog} prompts={[]} />)).toBe("");
    const noImage = prompt("missing", { img: null, useCases: [beauty] });
    expect(renderToStaticMarkup(<ModelRelatedTopics catalog={catalog} prompts={[noImage]} />)).toBe("");
    const many = prompt("many", { useCases: Array.from({ length: 8 }, (_, i) => ref(`topic-${i}`)) });
    const html = parse(renderToStaticMarkup(<ModelRelatedTopics catalog={{ ...catalog, prompts: [many] }} prompts={[many]} />));
    expect(html.querySelectorAll(".model-topic-card")).toHaveLength(6);
  });
});
