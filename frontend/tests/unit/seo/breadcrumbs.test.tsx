import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { buildBreadcrumbTrail } from "@/lib/seo/breadcrumbs";
import { breadcrumbList } from "@/lib/seo/json-ld";

import { makePromptSummary, makeTaxonomy } from "../support/prompt-fixtures";

const LOCALE = "zh-CN";

describe("buildBreadcrumbTrail", () => {
  it("gives the hub no trail at all, as the prototype does", () => {
    expect(buildBreadcrumbTrail({ page: "hub", locale: LOCALE })).toEqual([]);
  });

  it("builds the gallery trail 提示词库 / 图片", () => {
    expect(buildBreadcrumbTrail({ page: "gallery", locale: LOCALE })).toEqual([
      { name: "提示词库", path: "/zh-CN/prompts" },
      { name: "图片", path: "/zh-CN/prompts/image" },
    ]);
  });

  it("keeps 模型 as an unlinked level on the model trail, since that index has no page", () => {
    const trail = buildBreadcrumbTrail({
      page: "model",
      locale: LOCALE,
      model: { slug: "nano-banana-pro", label: "Nano Banana Pro" },
    });

    expect(trail).toEqual([
      { name: "提示词库", path: "/zh-CN/prompts" },
      { name: "图片", path: "/zh-CN/prompts/image" },
      { name: "模型", path: null },
      { name: "Nano Banana Pro", path: "/zh-CN/prompts/models/nano-banana-pro" },
    ]);
  });

  it("starts the detail trail at 首页 and steps through the first model that has a page", () => {
    const prompt = makePromptSummary({
      models: [
        makeTaxonomy({ id: "model:no-page", slug: "no-page", label: "No Page", href: null }),
        makeTaxonomy({
          id: "model:gpt-image-2",
          slug: "gpt-image-2",
          label: "GPT Image 2",
          href: "/zh-CN/prompts/models/gpt-image-2",
        }),
      ],
    });

    expect(buildBreadcrumbTrail({ page: "promptDetail", locale: LOCALE, prompt })).toEqual([
      { name: "首页", path: "/zh-CN/prompts" },
      { name: "GPT Image 2", path: "/zh-CN/prompts/models/gpt-image-2" },
      { name: prompt.title, path: "/zh-CN/prompts/glass-cube-city" },
    ]);
  });

  it("falls back to 图片 when none of the prompt's models has a page", () => {
    const prompt = makePromptSummary({
      models: [makeTaxonomy({ href: null })],
    });

    expect(buildBreadcrumbTrail({ page: "promptDetail", locale: LOCALE, prompt })[1]).toEqual({
      name: "图片",
      path: "/zh-CN/prompts/image",
    });
  });
});

describe("Breadcrumb + BreadcrumbList with an unlinked level", () => {
  const trail = buildBreadcrumbTrail({
    page: "model",
    locale: LOCALE,
    model: { slug: "nano-banana-pro", label: "Nano Banana Pro" },
  });

  it("renders the unlinked level as plain text, never as a link", () => {
    render(<Breadcrumb items={trail} />);

    expect(screen.getByRole("link", { name: "提示词库" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "图片" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "模型" })).not.toBeInTheDocument();
    expect(screen.getByText("模型")).toBeInTheDocument();
    expect(screen.getByText("Nano Banana Pro")).toHaveAttribute("aria-current", "page");
  });

  it("emits the unlinked level as a ListItem with no item URL", () => {
    const json = breadcrumbList(trail);

    expect(json.itemListElement).toHaveLength(4);
    expect(json.itemListElement[2]).toEqual({
      "@type": "ListItem",
      position: 3,
      name: "模型",
    });
    expect(json.itemListElement[2]).not.toHaveProperty("item");
    expect(json.itemListElement[0]?.item).toContain("/zh-CN/prompts");
  });
});
