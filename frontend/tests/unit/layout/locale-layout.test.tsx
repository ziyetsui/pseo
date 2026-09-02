import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import LocaleLayout from "@/app/[locale]/layout";
import { getContentRepository } from "@/lib/content";

describe("localized layout", () => {
  it("wires the repository snapshot date into the shared footer", async () => {
    const snapshot = await getContentRepository().getSnapshot();

    render(
      await LocaleLayout({
        children: <h1>测试页面</h1>,
        params: Promise.resolve({ locale: "zh-CN" }),
      }),
    );

    expect(screen.getByText(new RegExp(`数据更新于 ${snapshot.observedAt}`))).toBeInTheDocument();
    expect(screen.queryByText(/尚未接入内容仓库/)).not.toBeInTheDocument();
  });
});
