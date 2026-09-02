import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { getContentRepository } from "@/lib/content";
import * as hubCopy from "@/features/hub/hub-copy";
import {
  ALL_PROMPTS_COLLECTION_SLUG,
  ALL_PROMPTS_COLLECTION_TITLE,
  allPromptsHref,
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

  /**
   * The 镜头与运动 band was a duplicate of the 镜头·技法 chip row and is gone.
   * Its measured sentence went with it — and so did the two helpers that built
   * it, rather than surviving as exports nothing renders.
   */
  it("no longer exports the deleted 镜头与运动 sentence or its helpers", () => {
    expect(hubCopy).not.toHaveProperty("cameraSectionDescription");
    expect(hubCopy).not.toHaveProperty("cameraShareTenths");
    expect(hubCopy).not.toHaveProperty("countWithCameraLanguage");
  });
});
