import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { getContentRepository } from "@/lib/content";
import {
  ALL_PROMPTS_COLLECTION_SLUG,
  ALL_PROMPTS_COLLECTION_TITLE,
  allPromptsHref,
  cameraShareTenths,
  cameraSectionDescription,
} from "@/features/hub/hub-copy";

/**
 * The prototype's `浏览全部提示词` button opens the result region on the whole
 * library, headed `全部提示词 · 共 N 条`. This renders the hub with that URL to
 * prove the state exists, is filled from the repository and hides the browse
 * view, exactly as the prototype's CTA handler does.
 */
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(`collection=${ALL_PROMPTS_COLLECTION_SLUG}`),
  usePathname: () => "/zh-CN/prompts",
  notFound: () => {
    throw new Error("notFound() called");
  },
}));

const { default: PromptsPage } = await import("@/app/[locale]/(hub)/prompts/page");

describe("hub 全部提示词 result state", () => {
  it("lists every prompt under the prototype's summary line", async () => {
    const { total } = await getContentRepository().listPrompts("zh-CN");

    render(await PromptsPage({ params: Promise.resolve({ locale: "zh-CN" }) }));

    expect(screen.getByRole("heading", { name: "筛选结果", level: 2 })).toBeInTheDocument();
    expect(
      screen.getByText(`${ALL_PROMPTS_COLLECTION_TITLE} · 共 ${total} 条`),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(total);
    // The browse view is hidden while a filter is active, as in the prototype.
    expect(screen.queryByRole("region", { name: "本期精选" })).toBeNull();
  });
});

describe("hub copy helpers", () => {
  it("builds the CTA href through the query serializer", () => {
    expect(allPromptsHref("/zh-CN/prompts")).toBe("/zh-CN/prompts?collection=all");
  });

  it("rounds the camera-language share to 成 and drops it below one tenth", () => {
    expect(cameraShareTenths(29, 35)).toBe(8);
    expect(cameraShareTenths(1, 35)).toBeNull();
    expect(cameraShareTenths(0, 0)).toBeNull();
  });

  it("keeps the prototype's sentence shape either way", () => {
    expect(cameraSectionDescription(8)).toBe(
      "8 成提示词带镜头语言——推拉、环绕、跟拍、转场、分镜。这是这批提示词最有价值的部分。",
    );
    expect(cameraSectionDescription(null)).toBe(
      "提示词里的镜头语言——推拉、环绕、跟拍、转场、分镜。这是这批提示词最有价值的部分。",
    );
  });
});
