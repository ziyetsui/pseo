import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  context: {
    mode: "fixture" as "fixture" | "cms-preview",
    revision: "wireframe-flow-proto",
  },
}));

vi.mock("@/lib/content/server", () => ({
  createServerContentContext: vi.fn(async () => ({
    ...state.context,
    repository: {},
    ...(state.context.mode === "cms-preview" ? { generatedAt: "2026-09-02T00:00:00.000Z" } : {}),
  })),
}));

import LocaleLayout from "@/app/[locale]/layout";

describe("localized CMS preview marker", () => {
  beforeEach(() => {
    state.context = { mode: "fixture", revision: "wireframe-flow-proto" };
  });

  it("does not add preview chrome in normal fixture mode", async () => {
    render(
      await LocaleLayout({
        children: <h1>Fixture</h1>,
        params: Promise.resolve({ locale: "zh-CN" }),
      }),
    );

    expect(screen.queryByRole("status", { name: "内部 CMS 预览" })).not.toBeInTheDocument();
  });

  it("adds the preview revision when the server context is CMS-backed", async () => {
    state.context = {
      mode: "cms-preview",
      revision: "sha256:abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
    };

    render(
      await LocaleLayout({
        children: <h1>Preview</h1>,
        params: Promise.resolve({ locale: "zh-CN" }),
      }),
    );

    expect(screen.getByRole("status", { name: "内部 CMS 预览" })).toHaveTextContent(
      "CMS Preview · abcdef012345",
    );
  });
});
