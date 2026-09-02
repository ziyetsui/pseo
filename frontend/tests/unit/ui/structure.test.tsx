import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { ChipLink } from "@/components/ui/Chip";
import { Section } from "@/components/ui/Section";

describe("Breadcrumb", () => {
  it("renders a labelled nav with an ordered list and a current last item", () => {
    render(
      <Breadcrumb
        items={[
          { name: "首页", path: "/zh-CN" },
          { name: "提示词库", path: "/zh-CN/prompts" },
          { name: "玻璃立方城市", path: "/zh-CN/prompts/glass-cube-city" },
        ]}
      />,
    );

    const nav = screen.getByRole("navigation", { name: "面包屑" });
    expect(within(nav).getByRole("list")).toBeInTheDocument();
    expect(within(nav).getAllByRole("listitem")).toHaveLength(3);
    expect(within(nav).getByRole("link", { name: "提示词库" })).toHaveAttribute(
      "href",
      "/zh-CN/prompts",
    );
    expect(within(nav).queryByRole("link", { name: "玻璃立方城市" })).not.toBeInTheDocument();
    expect(screen.getByText("玻璃立方城市")).toHaveAttribute("aria-current", "page");
  });
});

describe("Section", () => {
  it("labels itself with its own h2 and renders a real 查看全部 link", () => {
    render(
      <Section id="featured" title="精选" description="人工挑选" moreHref="/zh-CN/prompts">
        <p>内容</p>
      </Section>,
    );

    const section = screen.getByRole("region", { name: "精选" });
    expect(within(section).getByRole("heading", { level: 2 })).toHaveAttribute("id", "featured");
    expect(within(section).getByText("人工挑选")).toBeInTheDocument();
    expect(within(section).getByRole("link", { name: "查看全部" })).toHaveAttribute(
      "href",
      "/zh-CN/prompts",
    );
  });

  it("omits the more link when no href is given", () => {
    render(
      <Section id="featured" title="精选">
        <p>内容</p>
      </Section>,
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});

describe("ChipLink", () => {
  it("renders the count in a small element and marks the active state", () => {
    const { container } = render(
      <ChipLink href="/zh-CN/prompts?model=kling" label="Kling" count={2} active />,
    );
    expect(container.querySelector("small")).toHaveTextContent("2");
    expect(screen.getByRole("link", { name: /Kling/ })).toHaveAttribute("aria-current", "true");
  });

  it("omits the count element when there is no count", () => {
    const { container } = render(<ChipLink href="/zh-CN/prompts" label="Kling" />);
    expect(container.querySelector("small")).toBeNull();
  });
});
