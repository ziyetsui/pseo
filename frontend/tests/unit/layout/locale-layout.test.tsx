import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HubLayout from "@/app/[locale]/(hub)/layout";
import GalleryLayout from "@/app/[locale]/(gallery)/layout";
import SiteGroupLayout from "@/app/[locale]/(site)/layout";
import LocaleLayout from "@/app/[locale]/layout";
import { getContentRepository } from "@/lib/content";

const params = () => Promise.resolve({ locale: "zh-CN" });

describe("localized layout", () => {
  it("guards the locale without rendering a second site shell", async () => {
    const { container } = render(
      await LocaleLayout({ children: <h1>测试页面</h1>, params: params() }),
    );

    expect(screen.getByRole("heading", { level: 1, name: "测试页面" })).toBeInTheDocument();
    // The chrome belongs to the route-group layouts; nesting it here would emit
    // two headers, two footers and two `#main` landmarks per page.
    expect(container.querySelector("header")).toBeNull();
    expect(container.querySelector("footer")).toBeNull();
    expect(container.querySelector("#main")).toBeNull();
  });
});

describe.each([
  ["hub", HubLayout],
  ["gallery", GalleryLayout],
  ["site", SiteGroupLayout],
] as const)("%s group layout", (_name, Layout) => {
  it("renders exactly one site shell with the real snapshot date", async () => {
    const snapshot = await getContentRepository().getSnapshot();

    const { container } = render(await Layout({ children: <h1>测试页面</h1>, params: params() }));

    expect(container.querySelectorAll("header")).toHaveLength(1);
    expect(container.querySelectorAll("footer")).toHaveLength(1);
    expect(container.querySelectorAll("#main")).toHaveLength(1);
    expect(screen.getByText(new RegExp(`数据更新于 ${snapshot.observedAt}`))).toBeInTheDocument();
    expect(screen.queryByText(/尚未接入内容仓库/)).not.toBeInTheDocument();
  });
});
